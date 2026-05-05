"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TrainingPlan, TrainingPlanDay } from "@/lib/types";
import PlanForm from "@/components/plan-form";

export default function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = decodeURIComponent(rawId);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [days, setDays] = useState<TrainingPlanDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [planRes, daysRes] = await Promise.all([
      supabase.from("training_plans").select("*").eq("id", id).single(),
      supabase
        .from("training_plan_days")
        .select("*, exercises:training_plan_day_exercises(*)")
        .eq("plan_id", id)
        .order("day_index"),
    ]);
    if (planRes.error) {
      console.error("Plan fetch error:", planRes.error);
    }
    setPlan(planRes.data as TrainingPlan);
    // Egzersizleri sort_order'a göre sırala
    const daysWithSortedExercises = ((daysRes.data || []) as TrainingPlanDay[]).map(
      (d) => ({
        ...d,
        exercises: (d.exercises || []).slice().sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      })
    );
    setDays(daysWithSortedExercises);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Yükleniyor...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Plan bulunamadı.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">PLANI DÜZENLE</h1>
      <PlanForm plan={plan} initialDays={days} />
    </div>
  );
}
