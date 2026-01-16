import { UploadCloud, X } from "lucide-react";

const GlobalUploadProgress = ({ upload }) => {
  const { uploading, progress, status, files, currentFileIndex, cancelQueue } = upload;

  if (!uploading) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] animate-fade-in-up">
      <div className="bg-ctp-base/90 backdrop-blur-md border border-ctp-surface0/30 shadow-2xl rounded-2xl p-4 w-80 ring-1 ring-ctp-blue/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-ctp-blue/10 rounded-lg text-ctp-blue shrink-0">
              <UploadCloud size={18} className="animate-bounce" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-ctp-blue uppercase tracking-wider">
                Uploading {currentFileIndex + 1}/{files.length}
              </span>
              <span className="text-sm font-bold text-ctp-text truncate block">{files[currentFileIndex]?.name}</span>
            </div>
          </div>

          <button
            onClick={cancelQueue}
            className="btn btn-circle btn-xs btn-ghost bg-ctp-surface0/20 text-ctp-subtext0 hover:text-ctp-red hover:bg-ctp-red/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="w-full h-2 bg-ctp-surface0 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-ctp-blue transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-ctp-subtext0 font-mono">
          <span className="truncate max-w-[180px] opacity-70">{status}</span>
          <span className="font-bold">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalUploadProgress;
