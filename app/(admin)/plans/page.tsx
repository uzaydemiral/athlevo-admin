"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { TrainingPlan } from "@/lib/types";

export default function PlansPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    const { data: plansData } = await supabase
      .from("training_plans")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (plansData || []) as TrainingPlan[];
    setPlans(list);

    // Fetch day counts per plan (single grouped query)
    if (list.length > 0) {
      const planIds = list.map((p) => p.id);
      const { data: daysData } = await supabase
        .from("training_plan_days")
        .select("plan_id")
        .in("plan_id", planIds);
      const counts: Record<string, number> = {};
      (daysData || []).forEach((d: { plan_id: string }) => {
        counts[d.plan_id] = (counts[d.plan_id] || 0) + 1;
      });
      setDayCounts(counts);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error, count } = await supabase
      .from("training_plans")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) {
      alert("Plan silinemedi: " + error.message);
      return;
    }
    if (!count) {
      alert(
        "Plan silinemedi — yetki yok veya RLS engelliyor. Migration: 20260506_training_plans_admin_rls_fix.sql çalıştırıldı mı?"
      );
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
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
        <h1 className="text-2xl font-bold">PLANLAR</h1>
        <Link
          href="/plans/new"
          className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors"
        >
          + Yeni Plan
        </Link>
      </div>

      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] text-sm">
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-center px-4 py-3">Hafta</th>
              <th className="text-center px-4 py-3">Gün</th>
              <th className="text-center px-4 py-3">Yayın</th>
              <th className="text-right px-4 py-3">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr
                key={plan.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {plan.image_url ? (
                      <img
                        src={plan.image_url}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] text-xs">
                        —
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-md">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {plan.weeks_count}
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      (dayCounts[plan.id] || 0) === plan.weeks_count * 7
                        ? "bg-green-900/30 text-green-400"
                        : "bg-orange-900/30 text-orange-400"
                    }`}
                  >
                    {dayCounts[plan.id] || 0} / {plan.weeks_count * 7}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {plan.is_published ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400">
                      Yayında
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      Taslak
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/plans/${plan.id}`}
                      className="px-3 py-1 rounded text-xs bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-white transition-colors"
                    >
                      Düzenle
                    </Link>
                    <button
                      onClick={() => setDeleteId(plan.id)}
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

        {plans.length === 0 && (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            Henüz plan yok.
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)] max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Planı Sil</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              Bu plan ve tüm günleri kalıcı olarak silinecek. Bu plana
              başlamış kullanıcıların ilerlemesi de silinir. Devam etmek
              istiyor musun?
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
