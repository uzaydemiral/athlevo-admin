"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, Program } from "@/lib/types";

export interface PickedExerciseRow extends Exercise {
  programName?: string;
  programCategory?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Seçilen ham egzersiz satırları. Çağıran taraf snapshot/insert dönüşümünü yapar. */
  onPick: (rows: PickedExerciseRow[]) => void;
  /** Verildiğinde bu programa ait egzersizler kaynak listesinden gizlenir.
   *  (Aynı programa kendi egzersizini kopyalamak anlamsız.) */
  excludeProgramId?: string;
  /** Modal başlığı; varsayılan plan-day akışına uygun. */
  title?: string;
  /** Açıklama satırı; akışa göre özelleştirilebilir. */
  subtitle?: string;
}

export default function ExerciseLibraryPicker({
  isOpen,
  onClose,
  onPick,
  excludeProgramId,
  title = "Kütüphaneden Egzersiz Seç",
  subtitle = "Seçilen egzersizler snapshot olarak kopyalanır. Sonradan düzenleyebilirsin.",
}: Props) {
  const [exercises, setExercises] = useState<PickedExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearch("");
      return;
    }
    async function fetchAll() {
      setLoading(true);
      const supabase = createClient();
      const [exRes, prRes] = await Promise.all([
        supabase
          .from("exercises")
          .select("*")
          .order("name", { ascending: true }),
        supabase
          .from("programs")
          .select("id, name, category")
          .eq("is_hidden", false),
      ]);
      const programLookup = new Map<string, Pick<Program, "name" | "category">>();
      (prRes.data || []).forEach((p) => {
        programLookup.set(p.id as string, {
          name: (p.name as string) || "",
          category: (p.category as string) || "",
        });
      });
      const enriched: PickedExerciseRow[] = (exRes.data || []).map((ex) => {
        const meta = programLookup.get((ex as Exercise).program_id);
        return {
          ...(ex as Exercise),
          programName: meta?.name,
          programCategory: meta?.category,
        };
      });
      // Plan-içi (hidden) program egzersizlerini gizle: programLookup'a yok.
      // excludeProgramId verilmişse o programa ait egzersizleri de gizle.
      const visible = enriched.filter((e) => {
        if (!e.programName) return false;
        if (excludeProgramId && e.program_id === excludeProgramId) return false;
        return true;
      });
      setExercises(visible);
      setLoading(false);
    }
    fetchAll();
  }, [isOpen, excludeProgramId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => {
      return (
        e.name.toLowerCase().includes(q) ||
        (e.programName || "").toLowerCase().includes(q) ||
        (e.programCategory || "").toLowerCase().includes(q)
      );
    });
  }, [exercises, search]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const picked = exercises.filter((e) => selectedIds.has(e.id));
    onPick(picked);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-white text-2xl leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-3 border-b border-[var(--border)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara: egzersiz, program veya kategori..."
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
              Yükleniyor...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
              Eşleşen egzersiz yok.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((ex) => {
                const selected = selectedIds.has(ex.id);
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => toggle(ex.id)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors flex items-start gap-3 ${
                        selected
                          ? "bg-[var(--accent)]/15 border border-[var(--accent)]"
                          : "border border-transparent hover:bg-[var(--bg-secondary)]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                          selected
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {selected && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {ex.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                          {ex.programName}
                          {ex.programCategory ? ` · ${ex.programCategory}` : ""}
                          {" · "}
                          {ex.reps > 0
                            ? `${ex.sets}×${ex.reps}`
                            : `${ex.sets}×${ex.duration_seconds}sn`}
                        </p>
                      </div>
                      {ex.video_url && (
                        <span className="text-xs text-[var(--accent)] flex-shrink-0">
                          ▶
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            {selectedIds.size} seçili
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 rounded text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
            >
              {selectedIds.size > 0
                ? `${selectedIds.size} Egzersizi Ekle`
                : "Ekle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
