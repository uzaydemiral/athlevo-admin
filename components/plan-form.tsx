"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type {
  TrainingPlan,
  TrainingPlanDay,
  Program,
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
import ProgramQuickCreateModal from "./program-quick-create-modal";

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
  };
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

  // Days
  const [days, setDays] = useState<TrainingPlanDay[]>(() => {
    const planId = plan?.id || "new";
    const total = (plan?.weeks_count || 12) * 7;
    const seeded = initialDays || [];
    const arr: TrainingPlanDay[] = [];
    for (let i = 0; i < total; i++) {
      const existing = seeded.find((d) => d.day_index === i);
      arr.push(existing || emptyDay(planId, i));
    }
    return arr;
  });

  // Programs (for workout day selector)
  const [programs, setPrograms] = useState<Program[]>([]);

  // UI state
  const [openWeek, setOpenWeek] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [confirmShrink, setConfirmShrink] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPrograms() {
      const supabase = createClient();
      const { data } = await supabase
        .from("programs")
        .select("*")
        .order("name");
      setPrograms((data || []) as Program[]);
    }
    fetchPrograms();
  }, []);

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
        // Constraint: only "rest" days clear the program. Workout/basketball/recovery
        // can hold a program (workout requires one, others optional).
        if (merged.day_type === "rest") {
          merged.workout_program_id = null;
        }
        return merged;
      })
    );
  }

  // Quick-create modal state — hangi gün için açıldığını tut.
  const [quickCreateForDay, setQuickCreateForDay] = useState<number | null>(null);

  function quickCreateSuggestedName(dayIndex: number): string {
    const week = Math.floor(dayIndex / 7) + 1;
    const dayInWeek = (dayIndex % 7) + 1;
    return `Hafta ${week} · Gün ${dayInWeek}`;
  }

  function handleQuickCreated(newProgram: Program) {
    if (quickCreateForDay === null) return;
    setPrograms((prev) => [...prev, newProgram]);
    updateDay(quickCreateForDay, { workout_program_id: newProgram.id });
    setQuickCreateForDay(null);
  }

  function handleWeeksChange(newWeeks: number) {
    if (newWeeks < weeksCount && isEdit) {
      // Shrinking on edit — confirm because user_plan_progress may reference removed days
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
      if (d.day_type === "workout" && !d.workout_program_id) {
        errors.push(`Gün ${i + 1}: Antrenman günü için program seç`);
      }
      if (!d.title.trim()) {
        errors.push(`Gün ${i + 1}: Başlık boş olamaz`);
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

    // Strategy: delete all existing days for this plan, re-insert from current state.
    // Safe because user_plan_progress references day_index (int), not day UUID.
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
      workout_program_id: d.workout_program_id,
      title: d.title,
      notes: d.notes,
      estimated_duration_min: d.estimated_duration_min,
      intensity: d.intensity,
    }));

    const { error: insError } = await supabase
      .from("training_plan_days")
      .insert(dayRows);
    if (insError) {
      alert("Gün ekleme hatası: " + insError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/plans");
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
            const filled = weekDays.filter(
              (d) => d.day_type !== "workout" || d.workout_program_id
            ).length;
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
                          programs={programs}
                          onChange={(patch) => updateDay(globalIdx, patch)}
                          onQuickCreate={() => setQuickCreateForDay(globalIdx)}
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

      {/* Plan-içi yeni program oluşturma modal'ı */}
      <ProgramQuickCreateModal
        isOpen={quickCreateForDay !== null}
        suggestedName={
          quickCreateForDay !== null ? quickCreateSuggestedName(quickCreateForDay) : ""
        }
        onClose={() => setQuickCreateForDay(null)}
        onCreated={handleQuickCreated}
      />
    </form>
  );
}

// MARK: - Day Editor Row

interface DayEditorProps {
  day: TrainingPlanDay;
  dayLabel: string;
  programs: Program[];
  onChange: (patch: Partial<TrainingPlanDay>) => void;
  onQuickCreate: () => void;
}

function DayEditor({ day, dayLabel, programs, onChange, onQuickCreate }: DayEditorProps) {
  const [showNotes, setShowNotes] = useState(!!day.notes);

  const dayTypeColor: Record<DayType, string> = {
    workout: "bg-orange-900/30 text-orange-400 border-orange-700",
    rest: "bg-gray-900/30 text-gray-400 border-gray-700",
    basketball: "bg-blue-900/30 text-blue-400 border-blue-700",
    recovery: "bg-green-900/30 text-green-400 border-green-700",
  };

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

        {day.day_type !== "rest" && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Program {day.day_type === "workout" ? "*" : "(opsiyonel)"}
            </label>
            <div className="flex gap-2">
              <select
                value={day.workout_program_id || ""}
                onChange={(e) =>
                  onChange({ workout_program_id: e.target.value || null })
                }
                required={day.day_type === "workout"}
                className={`flex-1 px-3 py-2 rounded bg-[var(--bg-secondary)] border text-white text-sm focus:outline-none focus:border-[var(--accent)] ${
                  day.day_type === "workout" && !day.workout_program_id
                    ? "border-orange-700"
                    : "border-[var(--border)]"
                }`}
              >
                <option value="">Seç...</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onQuickCreate}
                title="Plan-içi yeni program oluştur"
                className="px-3 py-2 rounded bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 text-purple-400 text-sm transition-colors whitespace-nowrap"
              >
                + Yeni
              </button>
            </div>
          </div>
        )}
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

      <div className="grid grid-cols-2 gap-3">
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

        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Süre (dk)
          </label>
          <input
            type="number"
            min={0}
            max={600}
            value={day.estimated_duration_min ?? ""}
            onChange={(e) =>
              onChange({
                estimated_duration_min: e.target.value
                  ? parseInt(e.target.value)
                  : null,
              })
            }
            placeholder="—"
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

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
