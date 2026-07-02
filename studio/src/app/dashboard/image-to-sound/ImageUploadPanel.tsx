"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/app/dashboard/toast";

interface ImageUploadPanelProps {
  onImageSelect: (base64: string, file: File) => void;
  selectedImage: string | null;
  onClear: () => void;
  disabled?: boolean;
}

export function ImageUploadPanel({ onImageSelect, selectedImage, onClear, disabled }: ImageUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = useCallback((file: File) => {
    if (disabled) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onImageSelect(base64, file);
    };
    reader.readAsDataURL(file);
  }, [disabled, onImageSelect, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [disabled, handleFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [disabled, handleFile]);

  return (
    // Compact upload: title row + small thumbnail / dropzone. Keeps the
    // reference visible at a glance without consuming half the column.
    <div className="atlas-card p-3 animate-slide-up" onPaste={handlePaste}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1.5">
          <ImageIcon className="h-3 w-3" />
          Visual Reference
        </span>
        {selectedImage && (
          <button
            onClick={onClear}
            disabled={disabled}
            className="text-[10px] text-atlas-text-dim hover:text-atlas-text flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {!selectedImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
            ${isDragging ? "border-atlas-accent bg-atlas-accent/5" : "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border hover:bg-atlas-surface-hover"}
            ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
          `}
        >
          <Upload className="h-4 w-4 text-atlas-text-muted" />
          <p className="text-xs text-atlas-text">Click, drop, or ⌘V to paste</p>
          <p className="text-[10px] text-atlas-text-dim">JPEG · PNG · WebP · 5MB max</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-atlas-border bg-black aspect-[16/9] max-h-[140px] flex items-center justify-center group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt="Reference"
            className="w-full h-full object-contain"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] px-2 py-1 rounded-md font-medium hover:bg-white/20 transition-colors"
              >
                Change
              </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
