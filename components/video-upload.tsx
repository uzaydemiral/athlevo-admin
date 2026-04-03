"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  currentUrl: string | null;
  programId: string;
  exerciseId: string;
  onUpload: (url: string) => void;
}

export default function VideoUpload({
  currentUrl,
  programId,
  exerciseId,
  onUpload,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress("Yükleniyor...");

    const supabase = createClient();

    // Debug: auth session kontrolü
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Auth session:", session ? `User: ${session.user.email}` : "NO SESSION");
    if (!session) {
      setProgress("Hata: Oturum bulunamadı, tekrar giriş yapın");
      setUploading(false);
      return;
    }

    const fileName = `${programId}/${exerciseId}-${Date.now()}.mp4`;

    // Eski videoyu sil
    if (currentUrl) {
      const oldPath = currentUrl.split("/videolar/")[1];
      if (oldPath) {
        await supabase.storage.from("videolar").remove([oldPath]);
      }
    }

    const { error } = await supabase.storage
      .from("videolar")
      .upload(fileName, file, { upsert: true });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("videolar").getPublicUrl(fileName);
      onUpload(publicUrl);
      setProgress("Yüklendi!");
    } else {
      console.error("Upload error:", error.message, error);
      setProgress(`Hata: ${error.message}`);
    }

    setUploading(false);
  }

  return (
    <div>
      <label className="block text-sm text-[var(--text-secondary)] mb-1">
        Video
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-white transition-colors disabled:opacity-50"
        >
          {uploading ? "Yükleniyor..." : currentUrl ? "Videoyu Değiştir" : "Video Yükle"}
        </button>
        {currentUrl && !uploading && (
          <span className="text-xs text-green-400">Video mevcut</span>
        )}
        {progress && !currentUrl && (
          <span className="text-xs text-[var(--text-secondary)]">{progress}</span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
