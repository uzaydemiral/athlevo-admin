"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";
import ExerciseForm from "./exercise-form";
import ExerciseLibraryPicker, {
  type PickedExerciseRow,
} from "./exercise-library-picker";

interface Props {
  programId: string;
  exercises: Exercise[];
  onUpdate: () => void;
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
}

export default function ExerciseList({ programId, exercises, onUpdate }: Props) {
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleSaveNew(data: Partial<Exercise>) {
    const supabase = createClient();
    const id = slugifyName(data.name!) + "-" + Date.now().toString(36);

    await supabase.from("exercises").insert({
      id,
      program_id: programId,
      sort_order: exercises.length + 1,
      ...data,
    });
    setShowNewForm(false);
    onUpdate();
  }

  async function handlePickFromLibrary(rows: PickedExerciseRow[]) {
    if (rows.length === 0) return;
    setImporting(true);
    const supabase = createClient();
    const baseStamp = Date.now();
    const startOrder = exercises.length;
    const inserts = rows.map((row, idx) => ({
      id:
        slugifyName(row.name) +
        "-" +
        (baseStamp + idx).toString(36),
      program_id: programId,
      name: row.name,
      sets: row.sets,
      reps: row.reps,
      duration_seconds: row.duration_seconds,
      rest_seconds: row.rest_seconds,
      description: row.description || "",
      video_url: row.video_url || null,
      sort_order: startOrder + idx + 1,
    }));
    const { error } = await supabase.from("exercises").insert(inserts);
    setImporting(false);
    if (error) {
      alert("Egzersiz ekleme hatası: " + error.message);
      return;
    }
    setShowLibrary(false);
    onUpdate();
  }

  async function handleSaveEdit(data: Partial<Exercise>) {
    if (!editingExercise) return;
    const supabase = createClient();
    await supabase.from("exercises").update(data).eq("id", editingExercise.id);
    setEditingExercise(null);
    onUpdate();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("exercises").delete().eq("id", id);
    setDeleteId(null);
    onUpdate();
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    await swapOrder(index, index - 1);
  }

  async function handleMoveDown(index: number) {
    if (index === exercises.length - 1) return;
    await swapOrder(index, index + 1);
  }

  async function swapOrder(fromIndex: number, toIndex: number) {
    const supabase = createClient();
    const a = exercises[fromIndex];
    const b = exercises[toIndex];
    await Promise.all([
      supabase.from("exercises").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("exercises").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    onUpdate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">EGZERSİZLER</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            disabled={importing}
            className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            + Kütüphaneden Seç
          </button>
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors"
          >
            + Yeni Egzersiz
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-4 flex items-center gap-4"
          >
            {/* Sıralama butonları */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-xs text-[var(--text-secondary)] hover:text-white disabled:opacity-20 transition-colors"
              >
                ▲
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === exercises.length - 1}
                className="text-xs text-[var(--text-secondary)] hover:text-white disabled:opacity-20 transition-colors"
              >
                ▼
              </button>
            </div>

            {/* Sıra numarası */}
            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-sm text-[var(--text-secondary)]">
              {index + 1}
            </div>

            {/* İçerik */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{exercise.name}</p>
                {exercise.video_url && (
                  <span className="text-xs text-green-400">🎬</span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {exercise.reps > 0
                  ? `${exercise.sets} set x ${exercise.reps} tekrar`
                  : `${exercise.sets} set x ${exercise.duration_seconds}sn`}
                {exercise.rest_seconds > 0 &&
                  ` • ${exercise.rest_seconds}sn dinlenme`}
              </p>
            </div>

            {/* Aksiyonlar */}
            <div className="flex gap-2">
              <button
                onClick={() => setEditingExercise(exercise)}
                className="px-3 py-1 rounded text-xs bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
              >
                Düzenle
              </button>
              <button
                onClick={() => setDeleteId(exercise.id)}
                className="px-3 py-1 rounded text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        ))}

        {exercises.length === 0 && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-8 text-center text-[var(--text-secondary)]">
            Henüz egzersiz eklenmemiş.
          </div>
        )}
      </div>

      {/* Yeni egzersiz formu */}
      {showNewForm && (
        <ExerciseForm
          programId={programId}
          onSave={handleSaveNew}
          onClose={() => setShowNewForm(false)}
        />
      )}

      {/* Kütüphane modal — başka katalog programlarından kopyala */}
      <ExerciseLibraryPicker
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onPick={handlePickFromLibrary}
        excludeProgramId={programId}
        title="Kütüphaneden Egzersiz Ekle"
        subtitle="Seçilenler bu programa kopyalanır. Sonradan bağımsız düzenleyebilirsin."
      />

      {/* Düzenleme formu */}
      {editingExercise && (
        <ExerciseForm
          programId={programId}
          exercise={editingExercise}
          onSave={handleSaveEdit}
          onClose={() => setEditingExercise(null)}
        />
      )}

      {/* Silme onay */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)] max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Egzersizi Sil</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              Bu egzersiz kalıcı olarak silinecek. Devam etmek istiyor musun?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm hover:bg-[var(--border)] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
