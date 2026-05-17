import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VoiceNotesClient from "./voice-notes-client";

// v4.1 admin — surfaces voice-note candidates and recent sends.
// Uses suggest_voice_note_targets RPC (service_role only). Page is server-rendered;
// recording + sending lives in the client component.

export const dynamic = "force-dynamic";

type Candidate = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  user_position: string | null;
  last_workout_at: string | null;
  days_inactive: number;
  signup_at: string;
  days_since_signup: number;
  reason: "churn-risk" | "new-user" | "random";
  score: number;
  this_week_workout_count: number;
  recent_program_names: string[];
  best_jump_cm: number | null;
  recent_jump_count: number;
  current_streak: number;
  longest_streak: number;
  total_workout_count: number;
  is_test_account: boolean;
};

type RecentVoiceNote = {
  id: string;
  user_id: string;
  reason: string;
  duration_seconds: number;
  recorded_at: string;
  delivered_at: string | null;
  listened_at: string | null;
  feedback_thumbs: string | null;
};

async function fetchCandidates(limit: number, includeTest: boolean): Promise<Candidate[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/suggest_voice_note_targets`,
    {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_limit: limit, p_include_test: includeTest }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error("suggest_voice_note_targets failed:", res.status, await res.text());
    return [];
  }
  return res.json();
}

async function fetchRecent(): Promise<RecentVoiceNote[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/coach_voice_notes?select=id,user_id,reason,duration_seconds,recorded_at,delivered_at,listened_at,feedback_thumbs&order=recorded_at.desc&limit=20`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function VoiceNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ include_test?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const includeTest = params.include_test === "1";

  const [candidates, recent] = await Promise.all([
    fetchCandidates(30, includeTest),
    fetchRecent(),
  ]);

  return (
    <VoiceNotesClient
      candidates={candidates}
      recent={recent}
      includeTest={includeTest}
    />
  );
}
