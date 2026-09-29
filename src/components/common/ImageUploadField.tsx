import React, { useRef, useState } from 'react';

interface ImageUploadFieldProps {
  imageUrl?: string;
  onImageLoaded: (dataUrl: string, file: File) => void;
  onDelete: () => void;
  placeholder?: string;
  sublabel?: string;
  previewHeight?: string;
  objectFit?: 'cover' | 'contain';
  children?: React.ReactNode;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  imageUrl,
  onImageLoaded,
  onDelete,
  placeholder = 'Cliquez ou glissez une image ici',
  sublabel,
  previewHeight = 'h-32',
  objectFit = 'cover',
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        if (result) {
          onImageLoaded(result, file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!imageUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-m3-sys-primary bg-m3-sys-primary/15 scale-[1.01]'
              : 'border-m3-sys-outlineVariant hover:border-m3-sys-primary hover:bg-m3-sys-surfaceContainerHighest/40'
          }`}
        >
          <span className="material-symbols-rounded text-3xl text-m3-sys-primary mb-1 block">
            cloud_upload
          </span>
          <p className="text-xs font-medium text-m3-sys-onSurfaceVariant">{placeholder}</p>
          {sublabel && (
            <p className="text-[10px] text-m3-sys-onSurfaceVariant/70 mt-1">{sublabel}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-xl overflow-hidden ${previewHeight} border transition-all ${
              isDragging
                ? 'border-m3-sys-primary ring-2 ring-m3-sys-primary ring-offset-2'
                : 'border-m3-sys-outlineVariant'
            }`}
          >
            <img
              src={imageUrl}
              alt="Aperçu"
              className={`w-full h-full ${
                objectFit === 'contain' ? 'object-contain bg-black/20' : 'object-cover'
              }`}
            />
            {isDragging && (
              <div className="absolute inset-0 bg-m3-sys-primary/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                <span className="text-xs font-bold text-white bg-black/70 px-3 py-1 rounded-full shadow">
                  Déposer pour remplacer
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              title="Supprimer l'image"
              className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer z-20"
            >
              <span className="material-symbols-rounded text-sm leading-none">delete</span>
            </button>
          </div>

          {children}
        </div>
      )}
    </div>
  );
};
