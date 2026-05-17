import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// v4.1 admin — receives a voice note blob, uploads to private bucket as
// service_role, inserts coach_voice_notes row, triggers send-voice-note edge fn.
//
// Body: multipart form with `audio` (Blob), `user_id`, `reason`, `duration_seconds`.
// Auth: requires an authenticated admin session (anon SSR check) — service_role is used
// only AFTER session is verified.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Verify the caller is an authenticated admin (SSR session).
  const ssr = await createServerClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  // 2. Parse multipart form.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }
  const audio = form.get("audio");
  const targetUserId = form.get("user_id");
  const reason = form.get("reason");
  const durationStr = form.get("duration_seconds");

  if (
    !(audio instanceof Blob) ||
    typeof targetUserId !== "string" ||
    typeof reason !== "string" ||
    typeof durationStr !== "string"
  ) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }
  const duration = parseInt(durationStr, 10);
  if (!Number.isFinite(duration) || duration < 1 || duration > 300) {
    return NextResponse.json({ ok: false, error: "Invalid duration" }, { status: 400 });
  }

  // 3. Service role client for bucket write + table insert.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Server missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } },
  );

  // 4. Upload blob to voice-notes bucket: <target_user_id>/<uuid>.<ext>
  // Bucket allowed_mime_types validates exact strings, so strip any codec params
  // ("audio/webm; codecs=opus" → "audio/webm"). Browser-side blob.type can include
  // a codec parameter, which would fail the bucket's allowlist otherwise.
  const ext = extFromMime(audio.type);
  const fileName = `${targetUserId}/${randomUUID()}.${ext}`;
  const arrayBuf = await audio.arrayBuffer();
  const normalizedType = (audio.type || "audio/webm").split(";")[0].trim();
  const { error: uploadErr } = await admin.storage
    .from("voice-notes")
    .upload(fileName, arrayBuf, {
      contentType: normalizedType,
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  // 5. Insert coach_voice_notes row (audio_url stores the path, not a full URL).
  // Table CHECK constraint allows: churn_risk, milestone, new_pro, random.
  // RPC + client use hyphenated variants — normalize here.
  const reasonMap: Record<string, string> = {
    "churn-risk": "churn_risk",
    "churn_risk": "churn_risk",
    "new-user": "new_pro",
    "new_user": "new_pro",
    "new_pro": "new_pro",
    "milestone": "milestone",
    "random": "random",
  };
  const normalizedReason = reasonMap[reason] ?? "random";

  const { data: inserted, error: insertErr } = await admin
    .from("coach_voice_notes")
    .insert({
      user_id: targetUserId,
      audio_url: fileName,
      duration_seconds: duration,
      reason: normalizedReason,
      recorded_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    // Roll back the upload to avoid orphaned files.
    await admin.storage.from("voice-notes").remove([fileName]);
    return NextResponse.json(
      { ok: false, error: `Insert failed: ${insertErr?.message ?? "no row"}` },
      { status: 500 },
    );
  }

  // 6. Trigger send-voice-note edge fn with the shared internal-trigger key.
  // (Bearer service_role and SDK functions.invoke both failed in dev, so we
  // use the dedicated symmetric secret pattern we control end-to-end.)
  const internalKey = process.env.INTERNAL_TRIGGER_KEY;
  if (!internalKey) {
    return NextResponse.json(
      { ok: false, error: "Server missing INTERNAL_TRIGGER_KEY" },
      { status: 500 },
    );
  }
  // Supabase Gateway requires a Bearer JWT to even reach the function (verify_jwt
  // is on by default). service_role passes the outer gate; the internal trigger
  // key is the function-internal auth signal we control end-to-end.
  const triggerRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-voice-note`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "x-internal-trigger-key": internalKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ voice_note_id: inserted.id }),
    },
  );
  let triggerJson: unknown = null;
  try {
    triggerJson = await triggerRes.json();
  } catch {
    triggerJson = { warning: "Could not parse trigger response" };
  }
  if (!triggerRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        stage: "send-voice-note",
        voice_note_id: inserted.id,
        trigger: triggerJson,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    voice_note_id: inserted.id,
    trigger: triggerJson,
  });
}

function extFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}
