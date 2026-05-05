"use client";

import { useState } from "react";
import type { TrainingPlanDayExercise } from "@/lib/types";
import VideoUpload from "./video-upload";

interface Props {
  /** Edit mode: mevcut egzersiz. */
  exercise?: TrainingPlanDayExercise;
  /** VideoUpload storage path için. dayId varsa "plan-day-{dayId}", yoksa pending nonce. */
  storageNamespace: string;
  /** VideoUpload exerciseId — yeni egzersiz için temp id, edit modda mevcut id. */
  exerciseStorageId: string;
  onSave: (data: TrainingPlanDayExercise) => void;
  onClose: () => void;
}

/** Plan gününe egzersiz ekleme/düzenleme formu — exercise-form.tsx'in plan-day versiyonu. */
export default function PlanDayExerciseForm({
  exercise,
  storageNamespace,
  exerciseStorageId,
  onSave,
  onClose,
}: Props) {
  const isEdit = !!exercise;

  const [name, setName] = useState(exercise?.name || "");
  const [sets, setSets] = useState(exercise?.sets ?? 3);
  const [reps, setReps] = useState(exercise?.reps ?? 0);
  const [durationSeconds, setDurationSeconds] = useState(
    exercise?.duration_seconds ?? 0
  );
  const [restSeconds, setRestSeconds] = useState(exercise?.rest_seconds ?? 30);
  const [description, setDescription] = useState(exercise?.description || "");
  const [videoUrl, setVideoUrl] = useState(exercise?.video_url || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) return;
    onSave({
      ...(exercise || {}),
      name: name.trim(),
      sets,
      reps,
      duration_seconds: durationSeconds,
      rest_seconds: restSeconds,
      description: description.trim(),
      video_url: videoUrl || null,
      sort_order: exercise?.sort_order ?? 0,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isEdit ? "Egzersizi Düzenle" : "Yeni Egzersiz"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-white text-2xl leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              Egzersiz Adı *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Set
              </label>
              <input
                type="number"
                value={sets}
                onChange={(e) => setSets(Number(e.target.value) || 1)}
                min={1}
                className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Tekrar (0 = süre bazlı)
              </label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(Number(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Süre (sn)
              </label>
              <input
                type="number"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Dinlenme (sn)
              </label>
              <input
                type="number"
                value={restSeconds}
                onChange={(e) => setRestSeconds(Number(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
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
              rows={2}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>

          <VideoUpload
            currentUrl={videoUrl}
            programId={storageNamespace}
            exerciseId={exerciseStorageId}
            onUpload={(url) => setVideoUrl(url)}
          />
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-sm bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={!name.trim()}
            className="px-4 py-2 rounded text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
          >
            {isEdit ? "Güncelle" : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
