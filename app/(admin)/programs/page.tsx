"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Program, Category, Difficulty } from "@/lib/types";

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    const [programsRes, catsRes, diffsRes] = await Promise.all([
      supabase.from("programs").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("difficulties").select("*").order("sort_order"),
    ]);
    setPrograms((programsRes.data || []) as Program[]);
    setCategories((catsRes.data || []) as Category[]);
    setDifficulties((diffsRes.data || []) as Difficulty[]);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("programs").delete().eq("id", id);
    setPrograms((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
  }

  function getCategoryName(id: string | null) {
    return categories.find((c) => c.id === id)?.name || "—";
  }

  function getDifficultyName(id: string | null) {
    return difficulties.find((d) => d.id === id)?.name || "—";
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">PROGRAMLAR</h1>
        <Link
          href="/programs/new"
          className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors"
        >
          + Yeni Program
        </Link>
      </div>

      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] text-sm">
              <th className="text-left px-4 py-3">Program</th>
              <th className="text-left px-4 py-3">Kategori</th>
              <th className="text-left px-4 py-3">Zorluk</th>
              <th className="text-left px-4 py-3">Bölüm</th>
              <th className="text-center px-4 py-3">Faz</th>
              <th className="text-center px-4 py-3">Öne Çıkan</th>
              <th className="text-center px-4 py-3">Sıra</th>
              <th className="text-right px-4 py-3">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr
                key={program.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {program.image_url ? (
                      <img
                        src={program.image_url}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] text-xs">
                        —
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{program.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {program.subtitle}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                    {getCategoryName(program.category_id)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                    {getDifficultyName(program.difficulty_id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {program.section}
                </td>
                <td className="px-4 py-3 text-center">
                  {program.phase ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="px-2 py-1 rounded text-xs bg-orange-900/30 text-orange-400">
                        F{program.phase}
                      </span>
                      {program.phase_unlock_threshold && (
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          ×{program.phase_unlock_threshold}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {program.is_featured ? "⭐" : "—"}
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {program.sort_order}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/programs/${program.id}`}
                      className="px-3 py-1 rounded text-xs bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
                    >
                      Düzenle
                    </Link>
                    <button
                      onClick={() => setDeleteId(program.id)}
                      className="px-3 py-1 rounded text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {programs.length === 0 && (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            Henüz program yok.
          </div>
        )}
      </div>

      {/* Silme onay dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)] max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Programı Sil</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              Bu program ve tüm egzersizleri kalıcı olarak silinecek. Devam
              etmek istiyor musun?
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
