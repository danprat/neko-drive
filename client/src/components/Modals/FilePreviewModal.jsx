import { Download, Music, X } from "lucide-react";
import { useEffect, useState } from "react";

const FilePreviewModal = ({ file, api, onClose }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  // Close on Escape & Cleanup
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  useEffect(() => {
    if (file) {
      setObjectUrl(`${api}/download/${file.name}`);
    }
  }, [file, api]);

  if (!file) return null;

  // Use processed ObjectURL or fallback to direct for non-encrypted (handled by effect)
  // But wait for loading

  const getExt = (name) => name.split(".").pop().toLowerCase();
  const ext = getExt(file.name);
  const isVideo = ["mp4", "webm", "mkv", "mov"].includes(ext);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  const isPdf = ["pdf"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg"].includes(ext);

  const renderContent = () => {
    if (!objectUrl) return null;

    if (isVideo) return <video src={objectUrl} controls autoPlay className="max-w-full max-h-full shadow-2xl" />;
    if (isImage) return <img src={objectUrl} alt={file.name} className="max-w-full max-h-full object-contain" />;
    if (isAudio)
      return (
        <div className="w-full max-w-md p-8 bg-ctp-surface0/10 rounded-3xl backdrop-blur-xl border border-white/5 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-ctp-blue/20 flex items-center justify-center animate-pulse">
            <Music size={40} className="text-ctp-blue" />
          </div>
          <audio src={objectUrl} controls className="w-full" />
        </div>
      );
    if (isPdf) return <iframe src={objectUrl} className="w-full h-full bg-white" title="PDF Preview" />;

    return (
      <div className="text-center">
        <p className="text-ctp-subtext0 mb-4">Preview not supported for this file type.</p>
        <a href={`${objectUrl}?download=true`} className="btn btn-primary">
          Download File
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-5xl h-[80vh] flex flex-col bg-ctp-base rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-ctp-surface0/20">
        {/* Header */}
        <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-ctp-surface0/20 bg-ctp-mantle/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="font-bold text-ctp-text truncate">{file.name}</div>
          </div>
          <div className="flex items-center gap-2">
            {objectUrl && (
              <a
                href={`${objectUrl}?download=true`}
                download={file.name}
                className="btn btn-sm btn-ghost text-ctp-blue hover:bg-ctp-blue/10"
              >
                <Download size={18} />
              </a>
            )}
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost text-ctp-subtext0 hover:bg-ctp-red/10 hover:text-ctp-red"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-black/90 flex items-center justify-center relative overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
