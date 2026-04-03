"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/types";
import VideoUpload from "./video-upload";

interface Props {
  programId: string;
  exercise?: Exercise;
  onSave: (data: Partial<Exercise>) => void;
  onClose: () => void;
}

export default function ExerciseForm({ programId, exercise, onSave, onClose }: Props) {
  const isEdit = !!exercise;

  const [name, setName] = useState(exercise?.name || "");
  const [sets, setSets] = useState(exercise?.sets || 3);
  const [reps, setReps] = useState(exercise?.reps || 0);
  const [durationSeconds, setDurationSeconds] = useState(exercise?.duration_seconds || 0);
  const [restSeconds, setRestSeconds] = useState(exercise?.rest_seconds || 30);
  const [description, setDescription] = useState(exercise?.description || "");
  const [videoUrl, setVideoUrl] = useState(exercise?.video_url || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      sets,
      reps,
      duration_seconds: durationSeconds,
      rest_seconds: restSeconds,
      description,
      video_url: videoUrl || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isEdit ? "Egzersizi Düzenle" : "Yeni Egzersiz"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Egzersiz Adı
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Set
                </label>
                <input
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Tekrar (0 = süre bazlı)
                </label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Süre (saniye)
                </label>
                <input
                  type="number"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Dinlenme (saniye)
                </label>
                <input
                  type="number"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={2}
                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <VideoUpload
              currentUrl={videoUrl}
              programId={programId}
              exerciseId={exercise?.id || "new"}
              onUpload={(url) => setVideoUrl(url)}
            />

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
              >
                {isEdit ? "Güncelle" : "Ekle"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
