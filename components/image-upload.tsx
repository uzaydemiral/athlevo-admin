"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  currentUrl: string;
  folder: string;
  onUpload: (url: string) => void;
}

export default function ImageUpload({ currentUrl, folder, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [uploadDone, setUploadDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadDone(false);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const fileName = `${folder}/${Date.now()}-${file.name}`;

    // Eski dosyayı sil
    if (currentUrl) {
      const oldPath = currentUrl.split("/gorseller/")[1];
      if (oldPath) {
        await supabase.storage.from("gorseller").remove([oldPath]);
      }
    }

    const { error } = await supabase.storage
      .from("gorseller")
      .upload(fileName, file, { upsert: true });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("gorseller").getPublicUrl(fileName);
      onUpload(publicUrl);
      setUploadDone(true);
    } else {
      alert("Görsel yükleme hatası: " + error.message);
      setPreview(currentUrl);
    }

    setUploading(false);
  }

  return (
    <div>
      <label className="block text-sm text-[var(--text-secondary)] mb-1">
        Kapak Resmi
      </label>
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`relative w-full h-40 rounded-lg border-2 border-dashed bg-[var(--bg-secondary)] flex items-center justify-center cursor-pointer transition-colors overflow-hidden ${
          uploading
            ? "border-[var(--accent)] opacity-70 cursor-wait"
            : uploadDone
            ? "border-green-500"
            : "border-[var(--border)] hover:border-[var(--accent)]"
        }`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Kapak"
              className="w-full h-full object-cover"
            />
            {/* Uploading overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-white/30 border-t-[var(--accent)] rounded-full animate-spin" />
                <p className="text-white text-sm font-medium">Yükleniyor...</p>
              </div>
            )}
            {/* Success overlay */}
            {uploadDone && !uploading && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                ✓ Yüklendi
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <div className="w-8 h-8 border-3 border-white/30 border-t-[var(--accent)] rounded-full animate-spin" />
                <p className="text-[var(--text-secondary)] text-sm">Yükleniyor...</p>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
                </svg>
                <p className="text-[var(--text-secondary)] text-sm">Resim yüklemek için tıkla</p>
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
}
