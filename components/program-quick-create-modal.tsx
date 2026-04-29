"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Program, Category, Difficulty } from "@/lib/types";
import { SECTIONS } from "@/lib/types";

interface Props {
  isOpen: boolean;
  /** Önerilen başlangıç adı — örn. "Hafta 1 · Gün 1". Kullanıcı düzenleyebilir. */
  suggestedName: string;
  onClose: () => void;
  onCreated: (program: Program) => void;
}

/**
 * Plan editor'den çıkmadan plan-içi (is_hidden=true) program oluşturmaya yarayan modal.
 * Tam program form'unun (image, faz, premium vs.) kısaltılmış sürümü.
 * Egzersizler/videolar sonra Programs sayfasından eklenir.
 */
export default function ProgramQuickCreateModal({
  isOpen,
  suggestedName,
  onClose,
  onCreated,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(suggestedName);
  const [categoryId, setCategoryId] = useState("");
  const [difficultyId, setDifficultyId] = useState("");
  const [section, setSection] = useState<string>(SECTIONS[0]);
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");

  // Modal açılınca form'u sıfırla
  useEffect(() => {
    if (isOpen) {
      setName(suggestedName);
      setCategoryId("");
      setDifficultyId("");
      setSection(SECTIONS[0]);
      setSubtitle("");
      setDescription("");
      setError(null);
    }
  }, [isOpen, suggestedName]);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchOptions() {
      setOptionsLoading(true);
      const supabase = createClient();
      const [catsRes, diffsRes] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("difficulties").select("*").order("sort_order"),
      ]);
      setCategories((catsRes.data || []) as Category[]);
      setDifficulties((diffsRes.data || []) as Difficulty[]);
      setOptionsLoading(false);
    }
    fetchOptions();
  }, [isOpen]);

  async function handleSave() {
    if (saving || optionsLoading) return;
    // Required field guards (HTML form validation devre dışı çünkü <form> kullanmıyoruz —
    // iç içe form parent plan-form'unu submit etmesin diye).
    if (!name.trim() || !subtitle.trim() || !categoryId || !difficultyId || !description.trim()) {
      setError("Lütfen tüm zorunlu alanları doldur.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const categoryName = categories.find((c) => c.id === categoryId)?.name || "";
    const difficultyName =
      difficulties.find((d) => d.id === difficultyId)?.name || "";

    // Slug üret — ProgramForm ile aynı mantık.
    const id =
      name
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30) +
      "-" +
      Date.now().toString(36);

    const payload = {
      id,
      name,
      category: categoryName,
      category_id: categoryId,
      difficulty: difficultyName,
      difficulty_id: difficultyId,
      section,
      subtitle,
      description,
      is_featured: false,
      sort_order: 0,
      image_url: null,
      phase: null,
      phase_group_id: null,
      is_premium: false,
      is_hidden: true, // plan-only — Programlar listesinde görünmez
    };

    const { data, error: insertError } = await supabase
      .from("programs")
      .insert(payload)
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "Bilinmeyen hata");
      setSaving(false);
      return;
    }

    setSaving(false);
    onCreated(data as Program);
  }

  if (!isOpen) return null;

  // NOT: Modal parent plan-form'un <form>'u içinde mount oluyor. HTML iç içe <form>
  // desteklemiyor — browser sessizce iç form'u dropluyor ve butonlar parent form'a
  // bağlanıyor. Bu yüzden modal <div> olarak yapılandırıldı, submit yerine onClick ile
  // tetiklenir. Enter tuşunu input'larda yakalayıp aynı handler'a bağlıyoruz.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">🔒 Yeni Plan-İçi Program</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Programlar listesinde görünmez — sadece bu planda kullanılır.
              Egzersiz ve videoları sonradan Programs sayfasından eklersin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-[var(--text-secondary)] hover:text-white transition-colors text-2xl leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {optionsLoading ? (
            <p className="text-sm text-[var(--text-secondary)]">Yükleniyor...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Program Adı *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Alt Başlık *
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="örn. Patlayıcılığını arttır"
                  className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Kategori *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Seç...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">
                    Zorluk *
                  </label>
                  <select
                    value={difficultyId}
                    onChange={(e) => setDifficultyId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Seç...</option>
                    {difficulties.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Bölüm
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Açıklama *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-white text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-700 rounded px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded text-sm bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || optionsLoading}
            className="px-4 py-2 rounded text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
          >
            {saving ? "Oluşturuluyor..." : "Oluştur ve Seç"}
          </button>
        </div>
      </div>
    </div>
  );
}
