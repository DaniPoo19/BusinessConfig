import { useState, useRef, type DragEvent } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface CsvUploaderProps {
  onFileLoaded: (content: string, fileName: string) => void;
  disabled?: boolean;
}

export function CsvUploader({ onFileLoaded, disabled }: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Solo se permiten archivos .csv');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileName(file.name);
      onFileLoaded(content, file.name);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center gap-3 px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
        disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : isDragging
          ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-200'
          : fileName
          ? 'border-green-300 bg-green-50/30 hover:border-green-400'
          : 'border-gray-300 bg-gray-50/50 hover:border-primary-400 hover:bg-primary-50/30'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      {fileName ? (
        <>
          <div className="p-3 bg-green-100 rounded-full">
            <FileText className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{fileName}</p>
            <p className="text-xs text-gray-500 mt-1">
              Archivo cargado · Click para cambiar
            </p>
          </div>
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <div className={`p-3 rounded-full transition-colors ${isDragging ? 'bg-primary-100' : 'bg-gray-100'}`}>
            <Upload className={`h-6 w-6 ${isDragging ? 'text-primary-600' : 'text-gray-400'}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              Arrastra tu archivo CSV aquí
            </p>
            <p className="text-xs text-gray-500 mt-1">
              o <span className="text-primary-600 font-medium">haz click para seleccionar</span>
            </p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Separado por punto y coma (;) · Codificación UTF-8
          </p>
        </>
      )}
    </div>
  );
}
