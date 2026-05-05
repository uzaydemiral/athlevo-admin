"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type {
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanDayExercise,
  DayType,
  Intensity,
} from "@/lib/types";
import {
  DAY_TYPES,
  DAY_TYPE_LABELS,
  INTENSITIES,
  INTENSITY_LABELS,
} from "@/lib/types";
import ImageUpload from "./image-upload";
import PlanDayExerciseForm from "./plan-day-exercise-form";
import ExerciseLibraryPicker from "./exercise-library-picker";

interface Props {
  plan?: TrainingPlan;
  initialDays?: TrainingPlanDay[];
}

const TR_WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function emptyDay(planId: string, dayIndex: number): TrainingPlanDay {
  return {
    plan_id: planId,
    day_index: dayIndex,
    day_type: "rest",
    workout_program_id: null,
    title: "Tam Dinlenme",
    notes: null,
    estimated_duration_min: null,
    intensity: null,
    exercises: [],
  };
}

/** iOS WorkoutProgram.estimatedMinutes ile aynı mantık. Tekrar bazlı egzersizde
 *  her tekrar ~3sn; süre bazlıda set süresi; her sete dinlenme eklenir.
 */
function computeDayMinutes(exercises: TrainingPlanDayExercise[]): number {
  if (exercises.length === 0) return 0;
  const totalSeconds = exercises.reduce((acc, ex) => {
    const workPerSet = ex.reps > 0 ? ex.reps * 3 : ex.duration_seconds;
    return acc + ex.sets * workPerSet + ex.sets * ex.rest_seconds;
  }, 0);
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

/** State day kaydını günün egzersizlerine göre süreyle senkronize eder. */
function withAutoDuration(d: TrainingPlanDay): TrainingPlanDay {
  const mins = computeDayMinutes(d.exercises || []);
  return { ...d, estimated_duration_min: mins > 0 ? mins : null };
}

export default function PlanForm({ plan, initialDays }: Props) {
  const router = useRouter();
  const isEdit = !!plan;

  // Plan meta
  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [weeksCount, setWeeksCount] = useState(plan?.weeks_count || 12);
  const [imageUrl, setImageUrl] = useState(plan?.image_url || "");
  const [isPublished, setIsPublished] = useState(plan?.is_published ?? false);

  // Days (with exercises)
  const [days, setDays] = useState<TrainingPlanDay[]>(() => {
    const planId = plan?.id || "new";
    const total = (plan?.weeks_count || 12) * 7;
    const seeded = initialDays || [];
    const arr: TrainingPlanDay[] = [];
    for (let i = 0; i < total; i++) {
      const existing = seeded.find((d) => d.day_index === i);
      if (existing) {
        arr.push({ ...existing, exercises: existing.exercises || [] });
      } else {
        arr.push(emptyDay(planId, i));
      }
    }
    return arr;
  });

  // UI state
  const [openWeek, setOpenWeek] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [confirmShrink, setConfirmShrink] = useState<number | null>(null);

  // Egzersiz formu — açık gün ve düzenlenen egzersiz indeksi (yeni için -1)
  const [exerciseModal, setExerciseModal] = useState<{
    dayIndex: number;
    exerciseIndex: number; // -1 = yeni
  } | null>(null);

  // Kütüphane modal — hangi gün için
  const [libraryForDay, setLibraryForDay] = useState<number | null>(null);

  // When weeksCount changes, grow/shrink days
  useEffect(() => {
    const target = weeksCount * 7;
    setDays((current) => {
      if (current.length === target) return current;
      if (current.length < target) {
        const planId = plan?.id || "new";
        const additions: TrainingPlanDay[] = [];
        for (let i = current.length; i < target; i++) {
          additions.push(emptyDay(planId, i));
        }
        return [...current, ...additions];
      }
      return current.slice(0, target);
    });
  }, [weeksCount, plan?.id]);

  function updateDay(index: number, patch: Partial<TrainingPlanDay>) {
    setDays((current) =>
      current.map((d, i) => {
        if (i !== index) return d;
        const merged = { ...d, ...patch };
        // Rest günü egzersiz tutmaz — geçişte temizle
        if (merged.day_type === "rest") {
          merged.exercises = [];
        }
        // workout_program_id artık kullanılmıyor; her zaman null kalsın
        merged.workout_program_id = null;
        return merged;
      })
    );
  }

  function setDayExercises(
    dayIndex: number,
    next: TrainingPlanDayExercise[]
  ) {
    setDays((current) =>
      current.map((d, i) =>
        i === dayIndex
          ? withAutoDuration({
              ...d,
              exercises: next.map((ex, idx) => ({ ...ex, sort_order: idx })),
            })
          : d
      )
    );
  }

  function appendDayExercises(
    dayIndex: number,
    additions: TrainingPlanDayExercise[]
  ) {
    setDays((current) =>
      current.map((d, i) => {
        if (i !== dayIndex) return d;
        const existing = d.exercises || [];
        const combined = [...existing, ...additions];
        return withAutoDuration({
          ...d,
          exercises: combined.map((ex, idx) => ({ ...ex, sort_order: idx })),
        });
      })
    );
  }

  /** Egzersiz alanını inline değiştir (sets/reps/duration/rest). */
  function updateExerciseField(
    dayIndex: number,
    exerciseIndex: number,
    patch: Partial<TrainingPlanDayExercise>
  ) {
    setDays((current) =>
      current.map((d, i) => {
        if (i !== dayIndex) return d;
        const list = (d.exercises || []).slice();
        if (exerciseIndex < 0 || exerciseIndex >= list.length) return d;
        list[exerciseIndex] = { ...list[exerciseIndex], ...patch };
        return withAutoDuration({ ...d, exercises: list });
      })
    );
  }

  function handleWeeksChange(newWeeks: number) {
    if (newWeeks < weeksCount && isEdit) {
      setConfirmShrink(newWeeks);
      return;
    }
    setWeeksCount(newWeeks);
  }

  function confirmShrinkApply() {
    if (confirmShrink !== null) {
      setWeeksCount(confirmShrink);
      setConfirmShrink(null);
    }
  }

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!name.trim()) errors.push("Plan adı boş olamaz");
    if (weeksCount < 1 || weeksCount > 24)
      errors.push("Hafta sayısı 1-24 arası olmalı");
    days.forEach((d, i) => {
      if (!d.title.trim()) {
        errors.push(`Gün ${i + 1}: Başlık boş olamaz`);
      }
      if (d.day_type === "workout" && (d.exercises || []).length === 0) {
        errors.push(`Gün ${i + 1}: Antrenman gününde en az 1 egzersiz olmalı`);
      }
    });
    return errors;
  }, [name, weeksCount, days]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validation.length > 0) {
      alert("Hatalar:\n" + validation.slice(0, 5).join("\n"));
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const planData = {
      name,
      description: description || null,
      weeks_count: weeksCount,
      image_url: imageUrl || null,
      is_published: isPublished,
    };

    let planId: string;
    if (isEdit && plan) {
      const { error } = await supabase
        .from("training_plans")
        .update(planData)
        .eq("id", plan.id);
      if (error) {
        alert("Plan güncelleme hatası: " + error.message);
        setSaving(false);
        return;
      }
      planId = plan.id;
    } else {
      const { data, error } = await supabase
        .from("training_plans")
        .insert(planData)
        .select()
        .single();
      if (error || !data) {
        alert("Plan ekleme hatası: " + (error?.message || "bilinmeyen"));
        setSaving(false);
        return;
      }
      planId = (data as TrainingPlan).id;
    }

    // Strateji: günleri ve egzersizleri tamamen sil, yeniden oluştur.
    // training_plan_day_exercises CASCADE ile günlerle birlikte silinir.
    const { error: delError } = await supabase
      .from("training_plan_days")
      .delete()
      .eq("plan_id", planId);
    if (delError) {
      alert("Eski günleri silme hatası: " + delError.message);
      setSaving(false);
      return;
    }

    const dayRows = days.map((d) => ({
      plan_id: planId,
      day_index: d.day_index,
      day_type: d.day_type,
      workout_program_id: null,
      title: d.title,
      notes: d.notes,
      estimated_duration_min: d.estimated_duration_min,
      intensity: d.intensity,
    }));

    const { data: insertedDays, error: insError } = await supabase
      .from("training_plan_days")
      .insert(dayRows)
      .select("id, day_index");
    if (insError || !insertedDays) {
      alert("Gün ekleme hatası: " + (insError?.message || "bilinmeyen"));
      setSaving(false);
      return;
    }

    // day_index → yeni dayId map
    const dayIdByIndex = new Map<number, string>();
    (insertedDays as { id: string; day_index: number }[]).forEach((d) => {
      dayIdByIndex.set(d.day_index, d.id);
    });

    // Egzersizleri topla (sadece dolu olanlar)
    const exerciseRows: Array<Omit<TrainingPlanDayExercise, "id" | "created_at"> & {
      day_id: string;
    }> = [];
    days.forEach((d) => {
      const dayId = dayIdByIndex.get(d.day_index);
      if (!dayId) return;
      (d.exercises || []).forEach((ex, idx) => {
        exerciseRows.push({
          day_id: dayId,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds,
          rest_seconds: ex.rest_seconds,
          description: ex.description,
          video_url: ex.video_url,
          sort_order: idx,
        });
      });
    });

    if (exerciseRows.length > 0) {
      const { error: exErr } = await supabase
        .from("training_plan_day_exercises")
        .insert(exerciseRows);
      if (exErr) {
        alert(
          "Egzersizleri kaydetme hatası: " +
            exErr.message +
            "\nPlan ve günler kaydedildi, egzersizleri tekrar ekleyip kaydet."
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    // Yeni plan kaydedildikten sonra edit sayfasına yönlendir — video upload
    // dayId gerektirdiği için ikinci save'de stabil çalışsın.
    if (!isEdit) {
      router.push(`/plans/${planId}`);
    } else {
      router.push("/plans");
    }
    router.refresh();
  }

  // Group days into weeks for the accordion
  const weeks = useMemo(() => {
    const arr: TrainingPlanDay[][] = [];
    for (let w = 0; w < weeksCount; w++) {
      arr.push(days.slice(w * 7, w * 7 + 7));
    }
    return arr;
  }, [days, weeksCount]);

  const editingDay =
    exerciseModal !== null ? days[exerciseModal.dayIndex] : undefined;
  const editingExercise =
    exerciseModal && editingDay && exerciseModal.exerciseIndex >= 0
      ? editingDay.exercises?.[exerciseModal.exerciseIndex]
      : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* META SECTION */}
      <div className="space-y-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-[var(--text-secondary)]">
          PLAN BİLGİSİ
        </h2>

        <ImageUpload
          currentUrl={imageUrl}
          folder="plans"
          onUpload={(url) => setImageUrl(url)}
        />

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Plan Adı
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Off-Season Power 12 Hafta"
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Açıklama
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Bu planın amacı, hedef kitlesi, beklenen sonuç..."
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              Hafta Sayısı (1-24)
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={weeksCount}
              onChange={(e) => handleWeeksChange(parseInt(e.target.value) || 1)}
              required
              className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Toplam {weeksCount * 7} gün oluşacak
            </p>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              Yayın Durumu
            </label>
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`w-full px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                isPublished
                  ? "bg-green-900/30 border-green-700 text-green-400"
                  : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              {isPublished ? "✓ YAYINDA" : "TASLAK"}
            </button>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Yayında değilken iOS uygulamasında görünmez
            </p>
          </div>
        </div>
      </div>

      {/* DAYS SECTION */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-4">
          GÜNLER ({days.length})
        </h2>

        <div className="space-y-2">
          {weeks.map((weekDays, w) => {
            const filled = weekDays.filter((d) => {
              if (d.day_type === "rest") return true;
              if (d.day_type === "workout")
                return (d.exercises || []).length > 0;
              return true; // basketball/recovery: opsiyonel egzersiz
            }).length;
            const isOpen = openWeek === w;
            return (
              <div
                key={w}
                className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-card)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenWeek(isOpen ? null : w)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[var(--accent)]">
                      HAFTA {w + 1}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {filled}/7 hazır
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Gün {w * 7 + 1} - {w * 7 + 7}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {isOpen ? "▼" : "▶"}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border)]">
                    {weekDays.map((day, weekdayIdx) => {
                      const globalIdx = w * 7 + weekdayIdx;
                      return (
                        <DayEditor
                          key={globalIdx}
                          day={day}
                          dayLabel={`Gün ${globalIdx + 1} · ${TR_WEEKDAYS[weekdayIdx]}`}
                          onChange={(patch) => updateDay(globalIdx, patch)}
                          onAddNewExercise={() =>
                            setExerciseModal({
                              dayIndex: globalIdx,
                              exerciseIndex: -1,
                            })
                          }
                          onEditExercise={(exIdx) =>
                            setExerciseModal({
                              dayIndex: globalIdx,
                              exerciseIndex: exIdx,
                            })
                          }
                          onDeleteExercise={(exIdx) => {
                            const next = (day.exercises || []).filter(
                              (_, i) => i !== exIdx
                            );
                            setDayExercises(globalIdx, next);
                          }}
                          onMoveExercise={(exIdx, dir) => {
                            const list = [...(day.exercises || [])];
                            const target = exIdx + dir;
                            if (target < 0 || target >= list.length) return;
                            [list[exIdx], list[target]] = [
                              list[target],
                              list[exIdx],
                            ];
                            setDayExercises(globalIdx, list);
                          }}
                          onPickFromLibrary={() =>
                            setLibraryForDay(globalIdx)
                          }
                          onUpdateExerciseField={(exIdx, patch) =>
                            updateExerciseField(globalIdx, exIdx, patch)
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* VALIDATION SUMMARY */}
      {validation.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4 max-w-2xl">
          <p className="text-orange-400 font-semibold mb-2">
            {validation.length} eksik var
          </p>
          <ul className="text-sm text-orange-300 space-y-1">
            {validation.slice(0, 5).map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
            {validation.length > 5 && (
              <li className="text-orange-400">
                ... ve {validation.length - 5} daha
              </li>
            )}
          </ul>
        </div>
      )}

      {/* SUBMIT */}
      <div className="flex gap-3 max-w-2xl">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-6 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : isEdit ? "GÜNCELLE" : "KAYDET"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/plans")}
          className="px-6 py-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
        >
          İptal
        </button>
      </div>

      {/* SHRINK CONFIRM DIALOG */}
      {confirmShrink !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)] max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Hafta Sayısı Azaltma</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              {weeksCount} haftadan {confirmShrink} haftaya düşürüyorsun. Son{" "}
              {(weeksCount - confirmShrink) * 7} günün içeriği SİLİNECEK.
              Bu plana başlamış kullanıcıların silinen günlerden sonraki ilerlemesi
              bozulabilir. Devam etmek istiyor musun?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmShrink(null)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm hover:bg-[var(--border)] transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmShrinkApply}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
              >
                Evet, Azalt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Egzersiz formu modal */}
      {exerciseModal && editingDay && (
        <PlanDayExerciseForm
          exercise={editingExercise}
          storageNamespace={
            editingDay.id
              ? `plan-day-${editingDay.id}`
              : `plan-pending-${plan?.id || "new"}-d${exerciseModal.dayIndex}`
          }
          exerciseStorageId={
            editingExercise?.id ||
            `tmp-${exerciseModal.dayIndex}-${Date.now()}`
          }
          onSave={(data) => {
            const dayIdx = exerciseModal.dayIndex;
            const exIdx = exerciseModal.exerciseIndex;
            const list = [...(days[dayIdx].exercises || [])];
            if (exIdx >= 0) {
              list[exIdx] = { ...list[exIdx], ...data };
            } else {
              list.push({ ...data, sort_order: list.length });
            }
            setDayExercises(dayIdx, list);
            setExerciseModal(null);
          }}
          onClose={() => setExerciseModal(null)}
        />
      )}

      {/* Kütüphane modal */}
      <ExerciseLibraryPicker
        isOpen={libraryForDay !== null}
        onClose={() => setLibraryForDay(null)}
        onPick={(picked) => {
          if (libraryForDay !== null) {
            appendDayExercises(libraryForDay, picked);
          }
        }}
      />
    </form>
  );
}

// MARK: - Day Editor Row

interface DayEditorProps {
  day: TrainingPlanDay;
  dayLabel: string;
  onChange: (patch: Partial<TrainingPlanDay>) => void;
  onAddNewExercise: () => void;
  onEditExercise: (exerciseIndex: number) => void;
  onDeleteExercise: (exerciseIndex: number) => void;
  onMoveExercise: (exerciseIndex: number, direction: -1 | 1) => void;
  onPickFromLibrary: () => void;
  onUpdateExerciseField: (
    exerciseIndex: number,
    patch: Partial<TrainingPlanDayExercise>
  ) => void;
}

function DayEditor({
  day,
  dayLabel,
  onChange,
  onAddNewExercise,
  onEditExercise,
  onDeleteExercise,
  onMoveExercise,
  onPickFromLibrary,
  onUpdateExerciseField,
}: DayEditorProps) {
  const [showNotes, setShowNotes] = useState(!!day.notes);
  const [showExercises, setShowExercises] = useState(false);

  const dayTypeColor: Record<DayType, string> = {
    workout: "bg-orange-900/30 text-orange-400 border-orange-700",
    rest: "bg-gray-900/30 text-gray-400 border-gray-700",
    basketball: "bg-blue-900/30 text-blue-400 border-blue-700",
    recovery: "bg-green-900/30 text-green-400 border-green-700",
  };

  const exercises = day.exercises || [];
  const canHaveExercises = day.day_type !== "rest";
  const exerciseRequired = day.day_type === "workout";

  return (
    <div className="border-b border-[var(--border)] last:border-0 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          {dayLabel}
        </span>
        <span
          className={`px-2 py-1 rounded text-xs border ${dayTypeColor[day.day_type]}`}
        >
          {DAY_TYPE_LABELS[day.day_type]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Gün Tipi
          </label>
          <select
            value={day.day_type}
            onChange={(e) => onChange({ day_type: e.target.value as DayType })}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            {DAY_TYPES.map((t) => (
              <option key={t} value={t}>
                {DAY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Yoğunluk
          </label>
          <select
            value={day.intensity || ""}
            onChange={(e) =>
              onChange({
                intensity: (e.target.value || null) as Intensity | null,
              })
            }
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">—</option>
            {INTENSITIES.map((i) => (
              <option key={i} value={i}>
                {INTENSITY_LABELS[i]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Başlık
        </label>
        <input
          type="text"
          value={day.title}
          onChange={(e) => onChange({ title: e.target.value })}
          required
          placeholder="örn. Alt Vücut Güç"
          className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="px-3 py-2 rounded bg-[var(--bg-secondary)]/50 border border-[var(--border)] flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">
          Tahmini Süre
        </span>
        <span className="text-sm text-white font-medium">
          {day.estimated_duration_min
            ? `~${day.estimated_duration_min} dk`
            : day.day_type === "rest"
              ? "—"
              : "Egzersiz ekleyince hesaplanır"}
        </span>
      </div>

      {/* EGZERSİZLER */}
      {canHaveExercises && (
        <div className="rounded border border-[var(--border)] bg-[var(--bg-secondary)]/50">
          <button
            type="button"
            onClick={() => setShowExercises((s) => !s)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <span className="font-semibold">
              EGZERSİZLER ({exercises.length})
              {exerciseRequired && exercises.length === 0 && (
                <span className="ml-2 text-orange-400 text-xs">⚠ Zorunlu</span>
              )}
            </span>
            <span className="text-[var(--text-secondary)]">
              {showExercises ? "▼" : "▶"}
            </span>
          </button>

          {showExercises && (
            <div className="px-3 pb-3 space-y-2">
              {exercises.length > 0 && (
                <ul className="space-y-1.5">
                  {exercises.map((ex, idx) => (
                    <li
                      key={idx}
                      className="px-2 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-secondary)] font-mono w-5 flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <p className="flex-1 text-sm text-white truncate">
                          {ex.name}
                        </p>
                        {ex.video_url && (
                          <span
                            className="text-xs text-[var(--accent)]"
                            title="Video yüklü"
                          >
                            🎥
                          </span>
                        )}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => onMoveExercise(idx, -1)}
                            disabled={idx === 0}
                            title="Yukarı"
                            className="px-1.5 py-1 text-xs text-[var(--text-secondary)] hover:text-white disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveExercise(idx, 1)}
                            disabled={idx === exercises.length - 1}
                            title="Aşağı"
                            className="px-1.5 py-1 text-xs text-[var(--text-secondary)] hover:text-white disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditExercise(idx)}
                            title="Ad/açıklama/video düzenle"
                            className="px-2 py-1 rounded text-xs bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExercise(idx)}
                            className="px-2 py-1 rounded text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400"
                          >
                            Sil
                          </button>
                        </div>
                      </div>

                      {/* Inline number editing */}
                      <div className="flex items-center gap-2 pl-7 text-xs flex-wrap">
                        <label className="text-[var(--text-secondary)]">
                          Set
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={ex.sets}
                          onChange={(e) =>
                            onUpdateExerciseField(idx, {
                              sets: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-14 px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                        />
                        <span className="text-[var(--text-secondary)]">×</span>
                        {ex.reps > 0 ? (
                          <>
                            <label className="text-[var(--text-secondary)]">
                              Tekrar
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={ex.reps}
                              onChange={(e) =>
                                onUpdateExerciseField(idx, {
                                  reps: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-14 px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                            />
                          </>
                        ) : (
                          <>
                            <label className="text-[var(--text-secondary)]">
                              Süre
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={ex.duration_seconds}
                              onChange={(e) =>
                                onUpdateExerciseField(idx, {
                                  duration_seconds: Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  ),
                                })
                              }
                              className="w-16 px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                            />
                            <span className="text-[var(--text-secondary)]">
                              sn
                            </span>
                          </>
                        )}
                        <span className="text-[var(--text-secondary)] mx-1">
                          ·
                        </span>
                        <label className="text-[var(--text-secondary)]">
                          Dinlenme
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={ex.rest_seconds}
                          onChange={(e) =>
                            onUpdateExerciseField(idx, {
                              rest_seconds: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          className="w-14 px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-xs focus:outline-none focus:border-[var(--accent)]"
                        />
                        <span className="text-[var(--text-secondary)]">sn</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={onAddNewExercise}
                  className="px-3 py-1.5 rounded text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors"
                >
                  + Yeni Egzersiz
                </button>
                <button
                  type="button"
                  onClick={onPickFromLibrary}
                  className="px-3 py-1.5 rounded text-xs bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 text-purple-300 transition-colors"
                >
                  + Kütüphaneden Seç
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          {showNotes ? "− Not gizle" : "+ Not ekle"}
        </button>
        {showNotes && (
          <textarea
            value={day.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value || null })}
            rows={2}
            placeholder="Sporcuya özel not..."
            className="mt-2 w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        )}
      </div>
    </div>
  );
}
