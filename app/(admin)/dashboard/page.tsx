"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

interface Stats {
  programCount: number;
  exerciseCount: number;
  featuredCount: number;
  categoryCounts: { name: string; count: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      const [programsRes, exercisesRes, featuredRes, categoriesRes, programsDataRes] =
        await Promise.all([
          supabase.from("programs").select("*", { count: "exact", head: true }),
          supabase.from("exercises").select("*", { count: "exact", head: true }),
          supabase
            .from("programs")
            .select("*", { count: "exact", head: true })
            .eq("is_featured", true),
          supabase.from("categories").select("*").order("sort_order"),
          supabase.from("programs").select("category_id"),
        ]);

      const categories = (categoriesRes.data || []) as Category[];
      const programs = programsDataRes.data || [];

      const categoryCounts = categories.map((cat) => ({
        name: cat.name,
        count: programs.filter((p) => p.category_id === cat.id).length,
      }));

      setStats({
        programCount: programsRes.count || 0,
        exerciseCount: exercisesRes.count || 0,
        featuredCount: featuredRes.count || 0,
        categoryCounts,
      });

      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Yükleniyor...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">GENEL BAKIŞ</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Toplam Program" value={stats.programCount} />
        <StatCard title="Toplam Egzersiz" value={stats.exerciseCount} />
        <StatCard title="Öne Çıkan" value={stats.featuredCount} />
      </div>

      <h2 className="text-lg font-semibold mb-4">Kategoriye Göre Dağılım</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.categoryCounts.map((cat) => (
          <div
            key={cat.name}
            className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]"
          >
            <p className="text-[var(--text-secondary)] text-sm">{cat.name}</p>
            <p className="text-2xl font-bold mt-1">{cat.count}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Faz Sistemi</h2>
      <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)] max-w-md">
        <p className="text-sm text-[var(--text-secondary)]">
          Faz açma eşiği artık her program grubuna özel ayarlanıyor.
          Program düzenlerken &quot;Faz Açma Eşiği&quot; alanından değiştir.
        </p>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)]">
      <p className="text-[var(--text-secondary)] text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
