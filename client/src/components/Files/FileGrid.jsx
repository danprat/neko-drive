import FileCard from "./FileCard";
import FolderCard from "./FolderCard";

const FileGrid = ({ files, folders = [], api, onDelete, onDownload, onFolderDelete, activeOps, onSelect, onFolderClick }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
      {/* Folders First */}
      {folders.map((folder) => (
        <FolderCard
          key={folder}
          name={folder}
          onClick={() => onFolderClick(folder)}
          onDelete={onFolderDelete}
          isDeleting={activeOps?.deleting?.has(folder)}
        />
      ))}

      {/* Files */}
      {files.map((file) => (
        <FileCard
          key={file.name}
          file={file}
          api={api}
          onDelete={onDelete}
          onDownload={onDownload}
          activeOps={activeOps}
          onClick={() => onSelect(file)}
        />
      ))}

      {files.length === 0 && folders.length === 0 && (
        <div className="col-span-full py-12 flex flex-col items-center justify-center text-ctp-subtext0 opacity-50">
          <p>No files found</p>
        </div>
      )}
    </div>
  );
};

export default FileGrid;
