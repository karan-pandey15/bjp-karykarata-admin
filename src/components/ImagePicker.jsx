import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

/**
 * Shared image picker + preview used by Banners, News, Template Posters.
 */
const ImagePicker = ({
  previewUrl,
  onFileSelect,
  onClear,
  label = 'Upload Image',
  required = false,
}) => {
  const inputRef = useRef(null);

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-ink">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-brand-100 bg-sand">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 py-2 rounded-xl bg-white/95 text-ink text-xs font-bold"
            >
              Change Image
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="px-3 py-2 rounded-xl bg-red-500 text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50 hover:bg-brand-100 transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Upload size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-ink">{label}</p>
            <p className="text-[10px] font-bold text-brand-700/70 uppercase mt-1">
              PNG, JPG — click to browse
            </p>
          </div>
          <ImageIcon size={18} className="text-brand-400" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFileSelect(file);
        }}
      />
    </div>
  );
};

export default ImagePicker;
