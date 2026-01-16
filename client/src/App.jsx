import { useState, useRef } from "react";
import FileGrid from "./components/Files/FileGrid";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import FilePreviewModal from "./components/Modals/FilePreviewModal";
import SettingsModal from "./components/Modals/SettingsModal";
import Breadcrumbs from "./components/Navigation/Breadcrumbs";
import GlobalUploadProgress from "./components/Upload/GlobalUploadProgress";
import UploadWidget from "./components/Upload/UploadWidget";
import { ToastProvider } from "./context/ToastContext";
import { useFileSystem } from "./hooks/useFileSystem";
import DragDropOverlay from "./components/UI/DragDropOverlay";
import { useUploadManager } from "./hooks/useUploadManager";

const API = import.meta.env.PROD ? "" : "http://localhost:3000";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Core Logic extracted to Hook
  const {
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
  } = useFileSystem(API);

  // Upload Logic (Still complex, kept in its own hook)
  const uploadState = useUploadManager(API, () => {
    refreshFiles();
  });

  // Drag Drop Logic
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      uploadState.processQueue(currentPath, droppedFiles);
    }
  };

  return (
    <div
      className="flex h-screen bg-ctp-crust overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ctp-mantle to-ctp-crust relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DragDropOverlay isDragging={isDragging} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FilePreviewModal file={previewFile} api={API} onClose={() => setPreviewFile(null)} />
      {view !== "dashboard" && <GlobalUploadProgress upload={uploadState} />}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-50 h-full transition-transform duration-300 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        <Sidebar
          stats={stats}
          view={view}
          setView={(v) => {
            setView(v);
            setCurrentPath("/");
          }}
          onSettingsClick={() => setSettingsOpen(true)}
        />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          view={view}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          stats={stats}
          api={API}
        />

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Navigation */}
            {!searchTerm && view !== "recent" && (
              <Breadcrumbs
                currentPath={currentPath}
                setCurrentPath={setCurrentPath}
                createFolder={createFolder}
                view={view}
              />
            )}

            {/* Upload Widget (Dashboard - Root) */}
            {view === "dashboard" && !searchTerm && currentPath === "/" && (
              <>
                <UploadWidget uploadState={uploadState} currentPath={currentPath} />
                <div className="flex items-center justify-between mb-4 mt-8">
                  <h3 className="text-ctp-subtext0/60 font-bold text-xs uppercase tracking-widest pl-1">
                    Recent Uploads
                  </h3>
                </div>
              </>
            )}

            {/* Upload Widget (Dashboard - Folder) */}
            {view === "dashboard" && !searchTerm && currentPath !== "/" && (
              <div className="mb-6">
                <UploadWidget uploadState={uploadState} currentPath={currentPath} />
              </div>
            )}

            {/* File Grids */}
            <div className={view !== "dashboard" ? "mt-0" : ""}>
              <FileGrid
                files={displayFiles}
                folders={displayFolders}
                api={API}
                onDelete={handleDelete}
                onFolderDelete={handleDeleteFolder}
                onDownload={handleDownload}
                activeOps={activeOps}
                onSelect={(file) => {
                  const ext = file.name.split(".").pop().toLowerCase();
                  // Preview only supported types
                  if (["png", "jpg", "jpeg", "gif", "webp", "mp4", "webm", "mkv", "mov", "mp3", "wav", "ogg", "pdf"].includes(ext)) {
                    setPreviewFile(file);
                  }
                }}
                onFolderClick={navigateToFolder}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}

export default App;
