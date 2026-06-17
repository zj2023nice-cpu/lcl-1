import React, { useState, useCallback, useRef } from 'react';
import Cropper, { type CropperProps } from 'react-easy-crop';
import {
  Camera,
  X,
  Check,
  Trash2,
  RotateCcw,
  Loader2,
  User,
} from 'lucide-react';
import { userApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { getCroppedImg, validateImageFile, type Area } from '@/utils/imageUtils';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  avatarUrl: string | null | undefined;
  onAvatarChange: (url: string | null) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ avatarUrl, onAvatarChange }) => {
  const { updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete: CropperProps['onCropComplete'] = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels as Area);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setIsCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const filename = `avatar_${Date.now()}.jpg`;

      const response = await userApi.uploadAvatar(croppedBlob, filename, (progress) => {
        setUploadProgress(progress);
      });

      const updatedUser = response.data.data;
      if (updatedUser) {
        updateUser(updatedUser);
        onAvatarChange(updatedUser.avatarUrl || null);
      }

      setIsCropping(false);
      setImageSrc(null);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '上传失败，请稍后重试');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
    setError(null);
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除头像吗？')) return;

    try {
      setIsDeleting(true);
      setError(null);

      const response = await userApi.deleteAvatar();
      const updatedUser = response.data.data;
      if (updatedUser) {
        updateUser(updatedUser);
        onAvatarChange(null);
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '删除失败，请稍后重试');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReset = () => {
    handleCancelCrop();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 p-1">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="头像"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
              <User className="w-12 h-12 text-muted" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors duration-200"
        >
          <Camera className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-sm bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
        >
          更换
        </button>
        {avatarUrl && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'px-3 py-1.5 text-sm bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted mt-2">支持 JPG、PNG、GIF、WebP 格式，最大 5MB</p>

      {error && (
        <div className="mt-2 px-3 py-1.5 bg-error/10 text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      {isCropping && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">裁剪头像</h3>
              <button
                type="button"
                onClick={handleCancelCrop}
                className="p-2 rounded-lg hover:bg-card text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-80 bg-black rounded-xl overflow-hidden mb-4">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                cropShape="round"
                showGrid={false}
              />
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">缩放</span>
                  <span className="text-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">旋转</span>
                  <span className="text-foreground">{rotation}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 h-2 bg-card rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setRotation(0)}
                    className="p-2 rounded-lg hover:bg-card text-muted hover:text-foreground transition-colors"
                    title="重置旋转"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">上传中...</span>
                  <span className="text-primary-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-card transition-colors"
              >
                重置
              </button>
              <button
                type="button"
                onClick={handleCancelCrop}
                disabled={isUploading}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted hover:bg-card transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={isUploading}
                className="px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isUploading ? '上传中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AvatarUpload };
