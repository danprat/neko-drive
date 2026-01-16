import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../context/ToastContext";

export const useFileSystem = (api) => {
  const [files, setFiles] = useState([]);
  const [view, setView] = useState("dashboard"); // dashboard | files | recent
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPath, setCurrentPath] = useState("/");
  const [activeOps, setActiveOps] = useState({ deleting: new Set(), downloading: new Set() });

  const { addToast } = useToast();

  const refreshFiles = useCallback(() => {
    fetch(`${api}/files`)
      .then((res) => res.json())
      .then((list) => setFiles(list))
      .catch((err) => console.error("Failed to fetch files:", err));
  }, [api]);

  // Optimized Stats Calculation
  const stats = useMemo(() => {
    const size = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const types = {};
    const sizes = { image: 0, video: 0, audio: 0, other: 0 };

    files.forEach((f) => {
      const type = (f.type || "").toLowerCase();
      const ext = (f.name.split(".").pop() || "").toLowerCase();

      let cat = "other";
      if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) cat = "image";
      else if (type.startsWith("video/") || ["mp4", "mkv", "webm", "mov"].includes(ext)) cat = "video";
      else if (type.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(ext)) cat = "audio";

      types[cat] = (types[cat] || 0) + 1;
      sizes[cat] = (sizes[cat] || 0) + (f.size || 0);
    });

    return { count: files.length, size, types, sizes };
  }, [files]);

  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;
    setActiveOps(prev => ({ ...prev, deleting: new Set(prev.deleting).add(filename) }));
    try {
      await fetch(`${api}/files/${filename}`, { method: "DELETE" });
      addToast(`Deleted ${filename}`, "success");
      refreshFiles();
    } catch (e) {
      console.error(e);
      addToast("Failed to delete file", "error");
    } finally {
      setActiveOps(prev => {
        const next = new Set(prev.deleting);
        next.delete(filename);
        return { ...prev, deleting: next };
      });
    }
  };

  const handleDownload = async (file) => {
    const filename = file.name;
    setActiveOps(prev => ({ ...prev, downloading: new Set(prev.downloading).add(filename) }));

    try {
      // We use a small delay to show the "Starting..." state
      const downloadUrl = `${api}/download/${encodeURIComponent(filename)}?download=true`;

      // Trigger browser download via a temporary link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast(`Downloading ${filename}`, "info");

      // Clear after a short delay since we can't track actual download progress easily for browser-level downloads
      setTimeout(() => {
        setActiveOps(prev => {
          const next = new Set(prev.downloading);
          next.delete(filename);
          return { ...prev, downloading: next };
        });
      }, 2000);
    } catch (e) {
      console.error(e);
      addToast("Failed to start download", "error");
      setActiveOps(prev => {
        const next = new Set(prev.downloading);
        next.delete(filename);
        return { ...prev, downloading: next };
      });
    }
  };

  const navigateToFolder = (folderName) => {
    const newPath = currentPath === "/" ? `/${folderName}/` : `${currentPath}${folderName}/`;
    setCurrentPath(newPath);
  };

  const createFolder = () => {
    const name = prompt("Folder Name:");
    if (name) {
      navigateToFolder(name);
    }
  };

  const handleDeleteFolder = async (folderName) => {
    const folderPath = currentPath === "/" ? `/${folderName}/` : `${currentPath}${folderName}/`;
    if (!confirm(`Deep Delete everything inside "${folderName}"? This cannot be undone.`)) return;

    setActiveOps(prev => ({ ...prev, deleting: new Set(prev.deleting).add(folderName) }));
    try {
      const res = await fetch(`${api}/files/folder`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath })
      });

      if (!res.ok) throw new Error("Delete failed");

      const data = await res.json();
      addToast(`Deleted ${folderName} (${data.count} files)`, "success");
      refreshFiles();
    } catch (e) {
      console.error(e);
      addToast("Failed to delete folder", "error");
    } finally {
      setActiveOps(prev => {
        const next = new Set(prev.deleting);
        next.delete(folderName);
        return { ...prev, deleting: next };
      });
    }
  };

  // Initial Load
  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  // Optimized Filter & Derive Folders
  const { displayFiles, displayFolders } = useMemo(() => {
    let dFiles = [];
    let dFolders = [];

    if (view === "recent") {
      dFiles = files.slice(0, 20);
    } else if (view === "dashboard" || view === "files") {
      if (searchTerm) {
        dFiles = files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
      } else {
        dFiles = files.filter((f) => (f.folder || "/") === currentPath);

        const uniqueFolders = new Set();
        files.forEach((f) => {
          const fPath = f.folder || "/";
          if (fPath.startsWith(currentPath) && fPath !== currentPath) {
            const relative = fPath.slice(currentPath.length);
            const [segment] = relative.split("/");
            if (segment) uniqueFolders.add(segment);
          }
        });
        dFolders = Array.from(uniqueFolders).sort((a, b) => a.localeCompare(b));
      }
    }

    return { displayFiles: dFiles, displayFolders: dFolders };
  }, [files, view, searchTerm, currentPath]);

  return {
    files,
    setFiles,
    view,
    setView,
    stats,
    searchTerm,
    setSearchTerm,
    currentPath,
    setCurrentPath,
    refreshFiles,
    handleDelete,
    handleDeleteFolder,
    handleDownload,
    navigateToFolder,
    createFolder,
    displayFiles,
    displayFolders,
    activeOps,
  };
};
