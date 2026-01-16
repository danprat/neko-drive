const { createClient } = require("@supabase/supabase-js");
const logger = require("../utils/logger");

// Env Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logger.warn("⚠️ [Storage] Missing Supabase Credentials! DB will not work.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
logger.log(`[Storage] Initialized Supabase Client (${SUPABASE_URL})`);

const storage = {
  supabase,
  // Initialization is handled by createClient
  init: async () => {
    // Optional: Test connection
    const { error } = await supabase.from("files").select("id").limit(1);
    if (error) logger.error("[Storage] Connection Failed:", error.message);
    else logger.log("[Storage] Connected to Supabase! 🟢");
  },

  list: async (folderId = null) => {
    let query = supabase.from("files").select("*").order("date", { ascending: false });

    // If folderId is provided, we filter. If not (null), we return all files for the frontend's virtual navigation.
    if (folderId === "root" || folderId === "/") {
      query = query.is("folder_id", null);
    } else if (folderId && folderId !== "all") {
      query = query.eq("folder_id", folderId);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("[Storage] List Error:", error);
      throw error;
    }

    // Map snake_case to camelCase and ensure folder property is present
    return data.map(f => ({
      ...f,
      folderId: f.folder_id,
      folder: f.folder_id || "/" // The frontend expected 'folder'
    }));
  },

  get: async (filename) => {
    // 1. Get File
    const { data: file, error } = await supabase
      .from("files")
      .select("*")
      .eq("name", filename)
      .single();

    if (error || !file) return null;

    // 2. Get Chunks
    const { data: chunks, error: chunkError } = await supabase
      .from("chunks")
      .select("*")
      .eq("file_id", file.id)
      .order("chunk_index", { ascending: true });

    if (chunkError) {
      logger.error("[Storage] Chunk Fetch Error:", chunkError);
      return null;
    }

    return {
      ...file,
      folderId: file.folder_id,
      folder: file.folder_id || "/",
      chunks: chunks.map(c => ({
        index: c.chunk_index,
        messageId: c.message_id,
        url: c.url,
        iv: c.iv,
        size: c.size
      }))
    };
  },

  save: async (metadata, requestId = "internal") => {
    // Use the atomic RPC function for transactional integrity
    const path = metadata.folderId || metadata.folder || null;
    const { error } = await supabase.rpc("save_file_with_chunks", {
      p_file_id: metadata.id,
      p_name: metadata.name,
      p_size: metadata.size,
      p_type: metadata.type,
      p_folder_id: (path === "/" || path === "root") ? null : path,
      p_iv: metadata.iv || null,
      p_date: metadata.date || new Date().toISOString(),
      p_chunks: metadata.chunks
    });

    if (error) {
      logger.error(`[${requestId}] [Storage] Atomic Save Error:`, error);
      throw error;
    }

    logger.log(`[${requestId}] [Storage] Atomic save complete for: ${metadata.name}`);
  },

  delete: async (filename) => {
    // Postgres ON DELETE CASCADE handles chunks automatically!
    const { error } = await supabase
      .from("files")
      .delete()
      .eq("name", filename);

    if (error) {
      logger.error("[Storage] Delete Error:", error);
      return false;
    }
    return true;
  }
};

module.exports = { storage, DB_TYPE: "supabase" };
