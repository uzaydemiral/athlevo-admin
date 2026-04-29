"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Program, Category, Difficulty } from "@/lib/types";
import { SECTIONS } from "@/lib/types";
import ImageUpload from "./image-upload";

interface Props {
  program?: Program;
}

export default function ProgramForm({ program }: Props) {
  const router = useRouter();
  const isEdit = !!program;

  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(program?.name || "");
  const [categoryId, setCategoryId] = useState(program?.category_id || "");
  const [difficultyId, setDifficultyId] = useState(program?.difficulty_id || "");
  const [section, setSection] = useState(program?.section || SECTIONS[0]);
  const [subtitle, setSubtitle] = useState(program?.subtitle || "");
  const [description, setDescription] = useState(program?.description || "");
  const [isFeatured, setIsFeatured] = useState(program?.is_featured || false);
  const [sortOrder, setSortOrder] = useState(program?.sort_order || 0);
  const [imageUrl, setImageUrl] = useState(program?.image_url || "");
  const [hasPhase, setHasPhase] = useState(program?.phase != null);
  const [phase, setPhase] = useState(program?.phase || 1);
  const [phaseGroupId, setPhaseGroupId] = useState(program?.phase_group_id || "");
  const [phaseUnlockThreshold, setPhaseUnlockThreshold] = useState(program?.phase_unlock_threshold || 3);
  const [isPremium, setIsPremium] = useState(program?.is_premium || false);
  const [isHidden, setIsHidden] = useState(program?.is_hidden || false);

  useEffect(() => {
    async function fetchOptions() {
      setLoading(true);
      const supabase = createClient();
      const [catsRes, diffsRes] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("difficulties").select("*").order("sort_order"),
      ]);
      setCategories((catsRes.data || []) as Category[]);
      setDifficulties((diffsRes.data || []) as Difficulty[]);
      setLoading(false);
    }
    fetchOptions();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const categoryName = categories.find((c) => c.id === categoryId)?.name || "";
    const difficultyName = difficulties.find((d) => d.id === difficultyId)?.name || "";

    const data: Record<string, unknown> = {
      name,
      category: categoryName,
      category_id: categoryId,
      difficulty: difficultyName,
      difficulty_id: difficultyId,
      section,
      subtitle,
      description,
      is_featured: isFeatured,
      sort_order: sortOrder,
      image_url: imageUrl || null,
      phase: hasPhase ? phase : null,
      phase_group_id: hasPhase ? phaseGroupId || null : null,
      is_premium: isPremium,
      is_hidden: isHidden,
    };

    if (hasPhase) {
      data.phase_unlock_threshold = phaseUnlockThreshold;
    }

    if (isEdit) {
      console.log("Updating program:", program.id, "with data:", JSON.stringify(data));
      const { error, count, status, statusText } = await supabase
        .from("programs")
        .update(data)
        .eq("id", program.id)
        .select();
      console.log("Update result:", { error, count, status, statusText });
      if (error) {
        console.error("Update error:", error);
        alert("Güncelleme hatası: " + error.message);
        setSaving(false);
        return;
      }
    } else {
      const id = name
        .toLowerCase()
        .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30)
        + "-" + Date.now().toString(36);
      const { error } = await supabase.from("programs").insert({ id, ...data });
      if (error) {
        console.error("Insert error:", error);
        alert("Ekleme hatası: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/programs");
    router.refresh();
  }

  if (loading) {
    return <p className="text-[var(--text-secondary)]">Yükleniyor...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <ImageUpload
        currentUrl={imageUrl}
        folder="programs"
        onUpload={(url) => setImageUrl(url)}
      />

      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1">
          Program Adı
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1">
          Alt Başlık
        </label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Kategori
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
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
            Zorluk
          </label>
          <select
            value={difficultyId}
            onChange={(e) => setDifficultyId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">Seç...</option>
            {difficulties.map((diff) => (
              <option key={diff.id} value={diff.id}>
                {diff.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Bölüm
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
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
            Sıralama
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
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
          rows={3}
          className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)] resize-none"
        />
      </div>

      {/* Phase System */}
      <div className="space-y-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHasPhase(!hasPhase)}
            className={`w-12 h-6 rounded-full transition-colors ${
              hasPhase ? "bg-[var(--accent)]" : "bg-[var(--border)]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                hasPhase ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <label className="text-sm text-[var(--text-secondary)]">
            Fazlı Program
          </label>
        </div>

        {hasPhase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Faz
                </label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value={1}>Faz 1 — Temel</option>
                  <option value={2}>Faz 2 — Gelişmiş</option>
                  <option value={3}>Faz 3 — Elit</option>
                  <option value={4}>Faz 4 — Usta</option>
                  <option value={5}>Faz 5 — Efsane</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                  Faz Grup ID
                </label>
                <input
                  type="text"
                  value={phaseGroupId}
                  onChange={(e) => setPhaseGroupId(e.target.value)}
                  placeholder="ör: guc-temel"
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Aynı gruptaki fazlar aynı ID&apos;yi paylaşır
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Faz Açma Eşiği
              </label>
              <select
                value={phaseUnlockThreshold}
                onChange={(e) => setPhaseUnlockThreshold(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)]"
              >
                {[1, 2, 3, 4, 5, 7, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} tamamlama
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Bu program grubunda sonraki fazı açmak için gereken tamamlama sayısı
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFeatured(!isFeatured)}
            className={`w-12 h-6 rounded-full transition-colors ${
              isFeatured ? "bg-[var(--accent)]" : "bg-[var(--border)]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isFeatured ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <label className="text-sm text-[var(--text-secondary)]">
            Öne Çıkan Program
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPremium(!isPremium)}
            className={`w-12 h-6 rounded-full transition-colors ${
              isPremium ? "bg-yellow-500" : "bg-[var(--border)]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isPremium ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <label className="text-sm text-[var(--text-secondary)]">
            💎 Premium (Abonelik Gerekli)
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsHidden(!isHidden)}
            className={`w-12 h-6 rounded-full transition-colors ${
              isHidden ? "bg-purple-600" : "bg-[var(--border)]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isHidden ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <label className="text-sm text-[var(--text-secondary)]">
            🔒 Plan İçi (Programlar listesinden gizle)
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/programs")}
          className="px-6 py-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
