"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Difficulty } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [loading, setLoading] = useState(true);

  // Kategori form
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Zorluk form
  const [diffName, setDiffName] = useState("");
  const [editingDiff, setEditingDiff] = useState<Difficulty | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    const [catsRes, diffsRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("difficulties").select("*").order("sort_order"),
    ]);
    setCategories((catsRes.data || []) as Category[]);
    setDifficulties((diffsRes.data || []) as Difficulty[]);
    setLoading(false);
  }

  // Kategori CRUD
  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    if (editingCat) {
      await supabase
        .from("categories")
        .update({ name: catName, icon: catIcon })
        .eq("id", editingCat.id);
      setEditingCat(null);
    } else {
      const id = "cat-" + catName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
      await supabase.from("categories").insert({
        id,
        name: catName,
        icon: catIcon || "questionmark",
        sort_order: categories.length + 1,
      });
    }
    setCatName("");
    setCatIcon("");
    fetchData();
  }

  async function handleDeleteCategory(id: string) {
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    fetchData();
  }

  // Zorluk CRUD
  async function handleSaveDifficulty(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    if (editingDiff) {
      await supabase
        .from("difficulties")
        .update({ name: diffName })
        .eq("id", editingDiff.id);
      setEditingDiff(null);
    } else {
      const id = "diff-" + diffName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
      await supabase.from("difficulties").insert({
        id,
        name: diffName,
        sort_order: difficulties.length + 1,
      });
    }
    setDiffName("");
    fetchData();
  }

  async function handleDeleteDifficulty(id: string) {
    const supabase = createClient();
    await supabase.from("difficulties").delete().eq("id", id);
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">KATEGORİLER & ZORLUK SEVİYELERİ</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kategoriler */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Kategoriler</h2>

          <form onSubmit={handleSaveCategory} className="flex gap-2 mb-4">
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Kategori adı"
              required
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <input
              type="text"
              value={catIcon}
              onChange={(e) => setCatIcon(e.target.value)}
              placeholder="SF Symbol (ör: basketball.fill)"
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm transition-colors"
            >
              {editingCat ? "Güncelle" : "Ekle"}
            </button>
            {editingCat && (
              <button
                type="button"
                onClick={() => {
                  setEditingCat(null);
                  setCatName("");
                  setCatIcon("");
                }}
                className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm text-white transition-colors"
              >
                İptal
              </button>
            )}
          </form>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {cat.icon}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCat(cat);
                      setCatName(cat.name);
                      setCatIcon(cat.icon);
                    }}
                    className="px-3 py-1 rounded text-xs bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="px-3 py-1 rounded text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zorluk Seviyeleri */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Zorluk Seviyeleri</h2>

          <form onSubmit={handleSaveDifficulty} className="flex gap-2 mb-4">
            <input
              type="text"
              value={diffName}
              onChange={(e) => setDiffName(e.target.value)}
              placeholder="Zorluk adı"
              required
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-white focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm transition-colors"
            >
              {editingDiff ? "Güncelle" : "Ekle"}
            </button>
            {editingDiff && (
              <button
                type="button"
                onClick={() => {
                  setEditingDiff(null);
                  setDiffName("");
                }}
                className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm text-white transition-colors"
              >
                İptal
              </button>
            )}
          </form>

          <div className="space-y-2">
            {difficulties.map((diff) => (
              <div
                key={diff.id}
                className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-3 flex items-center justify-between"
              >
                <p className="font-medium">{diff.name}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingDiff(diff);
                      setDiffName(diff.name);
                    }}
                    className="px-3 py-1 rounded text-xs bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteDifficulty(diff.id)}
                    className="px-3 py-1 rounded text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
