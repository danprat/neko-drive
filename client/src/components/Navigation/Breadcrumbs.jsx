const Breadcrumbs = ({ currentPath, setCurrentPath, createFolder, view }) => {
  return (
    <div className="flex items-center gap-2 mb-6 text-sm text-ctp-subtext0">
      <button
        onClick={() => setCurrentPath("/")}
        className={`hover:text-ctp-blue ${currentPath === "/" ? "font-bold text-ctp-text" : ""}`}
      >
        Home
      </button>
      {currentPath !== "/" &&
        currentPath
          .split("/")
          .filter(Boolean)
          .map((part, i, arr) => {
            // Reconstruct path up to this part
            const pathUpToHere = "/" + arr.slice(0, i + 1).join("/") + "/";
            return (
              <div key={pathUpToHere} className="flex items-center gap-2">
                <span>/</span>
                <button
                  onClick={() => setCurrentPath(pathUpToHere)}
                  className={`hover:text-ctp-blue ${i === arr.length - 1 ? "font-bold text-ctp-text" : ""}`}
                >
                  {part}
                </button>
              </div>
            );
          })}

      <div className="flex-1"></div>
      {view === "dashboard" && (
        <button onClick={createFolder} className="btn btn-xs btn-ghost text-ctp-blue hover:bg-ctp-blue/10">
          + New Folder
        </button>
      )}
    </div>
  );
};

export default Breadcrumbs;
