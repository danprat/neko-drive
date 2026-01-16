const express = require("express");
const { storage } = require("../services/storage");
const { deleteMessage, bulkDeleteMessages } = require("../services/discord");
const logger = require("../utils/logger");

const router = express.Router();

// GET /files - List All Files
router.get("/", async (req, res) => {
  try {
    const folderId = req.query.folder || null;
    const list = await storage.list(folderId);
    // Sort by newest first
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(list);
  } catch (err) {
    logger.error("Failed to list files:", err);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// GET /:filename - Get Full Metadata (Raw)
router.get("/:filename", async (req, res) => {
  try {
    const file = await storage.get(req.params.filename);
    if (!file) return res.status(404).json({ error: "File not found" });
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve file" });
  }
});

// DELETE /folder - Delete Folder Recursively
router.delete("/folder", async (req, res) => {
  const { folderPath } = req.body;

  if (!folderPath || folderPath === "/") {
    return res.status(400).json({ error: "Invalid folder path" });
  }

  logger.log(`[${req.id}] [DELETE FOLDER] Starting bulk deletion for: ${folderPath}`);

  try {
    // 1. Get all files in this folder or subfolders
    const { data: filesToDelete, error: filesError } = await storage.supabase
      .from("files")
      .select("id, name")
      .or(`folder_id.eq.${folderPath},folder_id.ilike.${folderPath}%`);

    if (filesError) throw filesError;
    if (!filesToDelete || filesToDelete.length === 0) return res.status(200).json({ status: "done", count: 0 });

    const fileIds = filesToDelete.map(f => f.id);
    const { data: chunksToDelete } = await storage.supabase
      .from("chunks")
      .select("message_id, url")
      .in("file_id", fileIds);

    // 2. Delete from Discord in batches
    if (chunksToDelete && chunksToDelete.length > 0) {
      const messageIds = chunksToDelete.map(chunk => {
        if (chunk.message_id) return chunk.message_id;
        if (chunk.url) {
          const match = chunk.url.match(/attachments\/\d+\/(\d+)\//);
          return match ? match[1] : null;
        }
        return null;
      }).filter(Boolean);

      await bulkDeleteMessages(messageIds);
    }

    // 3. Delete from Supabase
    await storage.supabase.from("files").delete().in("id", fileIds);

    res.status(200).json({ status: "done", count: filesToDelete.length });
  } catch (err) {
    logger.error(`[${req.id}] [DELETE FOLDER] failure:`, err.message);
    res.status(500).json({ error: "Failed" });
  }
});

// DELETE /:filename - Delete File
router.delete("/:filename", async (req, res) => {
  const filename = req.params.filename;
  try {
    const metadata = await storage.get(filename);
    if (!metadata) return res.status(404).json({ error: "Not found" });

    if (metadata.chunks) {
      const messageIds = metadata.chunks.map(c => c.messageId).filter(Boolean);
      await bulkDeleteMessages(messageIds);
    }

    await storage.delete(filename);
    res.status(200).json({ status: "deleted" });
  } catch (err) {
    logger.error(`[${req.id}] Delete File failure:`, err.message);
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = router;
