import React, { useRef, useState } from 'react';
import { User, Camera, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateImageFile } from '@/utils/imageUtils';

interface AvatarDisplayProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  editable?: boolean;
  onUpload?: (file: File) => void;
  onDelete?: () => void;
  uploading?: boolean;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  src,
  name = '',
  size = 40,
  className,
  editable = false,
  onUpload,
  onDelete,
  uploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const getInitials = (str: string) => {
    return str
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || '文件验证失败');
      setTimeout(() => setError(null), 3000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setError(null);
    onUpload(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleClick = () => {
    if (editable && onUpload && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const fontSize = size * 0.35;

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-primary-500 to-accent-500 overflow-hidden flex items-center justify-center',
          editable && onUpload && 'cursor-pointer hover:opacity-90 transition-opacity',
          uploading && 'opacity-70'
        )}
        style={{ width: size, height: size }}
        onClick={handleClick}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : name ? (
          <span
            className="text-white font-semibold"
            style={{ fontSize }}
          >
            {getInitials(name)}
          </span>
        ) : (
          <User className="text-white/70" style={{ width: size * 0.5, height: size * 0.5 }} />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {editable && onUpload && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors duration-200"
            style={{ transform: 'translate(25%, 25%)' }}
            disabled={uploading}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}

      {editable && src && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="absolute top-0 right-0 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center shadow-lg hover:bg-error/80 transition-colors duration-200"
          style={{ transform: 'translate(25%, -25%)' }}
          disabled={uploading}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {error && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-error/10 text-error text-xs rounded-lg whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
};
