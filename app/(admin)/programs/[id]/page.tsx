"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Program, Exercise } from "@/lib/types";
import ProgramForm from "@/components/program-form";
import ExerciseList from "@/components/exercise-list";

export default function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = decodeURIComponent(rawId);
  const [program, setProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [programRes, exercisesRes] = await Promise.all([
      supabase.from("programs").select("*").eq("id", id).single(),
      supabase
        .from("exercises")
        .select("*")
        .eq("program_id", id)
        .order("sort_order"),
    ]);
    if (programRes.error) {
      console.error("Program fetch error:", programRes.error);
    }
    setProgram(programRes.data as Program);
    setExercises((exercisesRes.data || []) as Exercise[]);
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

  if (!program) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Program bulunamadı.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">PROGRAMI DÜZENLE</h1>
      <ProgramForm program={program} />

      <hr className="border-[var(--border)] my-8" />

      <ExerciseList
        programId={id}
        exercises={exercises}
        onUpdate={fetchData}
      />
    </div>
  );
}
