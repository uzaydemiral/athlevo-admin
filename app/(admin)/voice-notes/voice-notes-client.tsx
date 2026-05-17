"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  last_workout_at: string | null;
  days_inactive: number;
  signup_at: string;
  days_since_signup: number;
  reason: "churn-risk" | "new-user" | "random";
  score: number;
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

const MAX_RECORDING_SECONDS = 90;
const MIN_RECORDING_SECONDS = 5;

const reasonLabel: Record<string, { label: string; color: string }> = {
  "churn-risk": { label: "Kayıp riski", color: "bg-red-500/15 text-red-400" },
  "new-user": { label: "Yeni kullanıcı", color: "bg-blue-500/15 text-blue-400" },
  random: { label: "Random", color: "bg-zinc-500/15 text-zinc-400" },
  milestone: { label: "Kilometre taşı", color: "bg-emerald-500/15 text-emerald-400" },
};

export default function VoiceNotesClient({
  candidates,
  recent,
}: {
  candidates: Candidate[];
  recent: RecentVoiceNote[];
}) {
  const [activeTarget, setActiveTarget] = useState<Candidate | null>(null);

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Ses Notları</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Aday kullanıcılara 60-90 sn kişisel ses notu kaydet ve gönder.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-wider text-[var(--text-secondary)] mb-4">
          Aday Kullanıcılar ({candidates.length})
        </h2>
        {candidates.length === 0 ? (
          <div className="text-[var(--text-secondary)] text-sm p-6 border border-[var(--border)] rounded-lg">
            Şu an gönderilebilecek aday yok. (Son 14 günde herkese gönderilmiş olabilir.)
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((c) => (
              <CandidateCard
                key={c.user_id}
                candidate={c}
                onPick={() => setActiveTarget(c)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-[var(--text-secondary)] mb-4">
          Son Gönderimler
        </h2>
        {recent.length === 0 ? (
          <div className="text-[var(--text-secondary)] text-sm p-6 border border-[var(--border)] rounded-lg">
            Henüz hiç ses notu gönderilmemiş.
          </div>
        ) : (
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-card)]">
                <tr>
                  <th className="text-left p-3 font-medium">Tarih</th>
                  <th className="text-left p-3 font-medium">Süre</th>
                  <th className="text-left p-3 font-medium">Sebep</th>
                  <th className="text-left p-3 font-medium">Durum</th>
                  <th className="text-left p-3 font-medium">Geri Bildirim</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--border)]">
                    <td className="p-3">{new Date(r.recorded_at).toLocaleString("tr-TR")}</td>
                    <td className="p-3">{r.duration_seconds} sn</td>
                    <td className="p-3">{reasonLabel[r.reason]?.label ?? r.reason}</td>
                    <td className="p-3">
                      {r.listened_at
                        ? "Dinlendi"
                        : r.delivered_at
                        ? "Gönderildi"
                        : "Bekliyor"}
                    </td>
                    <td className="p-3">
                      {r.feedback_thumbs === "up"
                        ? "👍"
                        : r.feedback_thumbs === "down"
                        ? "👎"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {activeTarget && (
        <RecorderModal target={activeTarget} onClose={() => setActiveTarget(null)} />
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  onPick,
}: {
  candidate: Candidate;
  onPick: () => void;
}) {
  const reason = reasonLabel[candidate.reason] ?? {
    label: candidate.reason,
    color: "bg-zinc-500/15 text-zinc-400",
  };
  const name = candidate.display_name || candidate.username || "Kullanıcı";
  const username = candidate.username ? `@${candidate.username}` : "";

  return (
    <div className="p-5 border border-[var(--border)] rounded-lg bg-[var(--bg-card)] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{name}</p>
          {username && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{username}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded ${reason.color}`}>{reason.label}</span>
      </div>

      <div className="text-xs text-[var(--text-secondary)] space-y-1">
        {candidate.last_workout_at ? (
          <p>Son antrenman: {candidate.days_inactive} gün önce</p>
        ) : (
          <p>Hiç antrenman yapmadı</p>
        )}
        <p>Kayıt: {candidate.days_since_signup} gün önce</p>
        <p className="opacity-60">Skor: {candidate.score.toFixed(2)}</p>
      </div>

      <button
        onClick={onPick}
        className="mt-2 w-full py-2 rounded-md bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        🎙️ Kayıt Başlat
      </button>
    </div>
  );
}

function RecorderModal({
  target,
  onClose,
}: {
  target: Candidate;
  onClose: () => void;
}) {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<
    "idle" | "recording" | "stopped" | "uploading" | "done" | "error"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function startRecording() {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: pickMimeType() });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Mikrofon izni alınamadı.");
      setState("error");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setState("stopped");
  }

  function resetRecording() {
    setBlob(null);
    setAudioUrl(null);
    setSeconds(0);
    setState("idle");
  }

  async function uploadAndSend() {
    if (!blob || seconds < MIN_RECORDING_SECONDS) return;
    setState("uploading");
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append("audio", blob, `voice-note.${blobExtension(blob.type)}`);
      form.append("user_id", target.user_id);
      form.append("reason", target.reason);
      form.append("duration_seconds", String(seconds));

      const res = await fetch("/api/voice-notes/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        // Surface the full server payload — trigger payload first so edge-fn
        // diagnostic JSON is visible, then stage/error fallbacks.
        const triggerPart = json.trigger
          ? typeof json.trigger === "string"
            ? json.trigger
            : JSON.stringify(json.trigger)
          : null;
        const detail =
          triggerPart ||
          json.error ||
          json.stage ||
          `HTTP ${res.status}`;
        throw new Error(`${json.stage ?? "err"}: ${detail}`);
      }
      setState("done");
      router.refresh();
      setTimeout(onClose, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Yükleme sırasında hata.");
      setState("error");
    }
  }

  const targetName = target.display_name || target.username || "Kullanıcı";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg max-w-lg w-full p-6">
        <header className="mb-4">
          <h3 className="text-lg font-bold">Ses notu kaydet</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Hedef: <span className="font-medium text-white">{targetName}</span>
          </p>
        </header>

        <div className="my-6 p-6 border border-[var(--border)] rounded-lg flex flex-col items-center gap-4">
          <div className="text-5xl font-mono">
            {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Max {MAX_RECORDING_SECONDS} sn · Min {MIN_RECORDING_SECONDS} sn
          </p>

          {state === "idle" && (
            <button
              onClick={startRecording}
              className="px-6 py-3 bg-red-500 text-white rounded-full font-medium hover:bg-red-600"
            >
              ● Kayda Başla
            </button>
          )}

          {state === "recording" && (
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-zinc-800 text-white rounded-full font-medium animate-pulse"
            >
              ■ Durdur
            </button>
          )}

          {state === "stopped" && audioUrl && (
            <>
              <audio src={audioUrl} controls className="w-full" />
              <div className="flex gap-3 mt-2">
                <button
                  onClick={resetRecording}
                  className="px-4 py-2 border border-[var(--border)] rounded-md text-sm"
                >
                  Tekrar Kaydet
                </button>
                <button
                  onClick={uploadAndSend}
                  disabled={seconds < MIN_RECORDING_SECONDS}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Onayla & Gönder
                </button>
              </div>
              {seconds < MIN_RECORDING_SECONDS && (
                <p className="text-xs text-red-400">
                  En az {MIN_RECORDING_SECONDS} sn kayıt yap.
                </p>
              )}
            </>
          )}

          {state === "uploading" && (
            <p className="text-sm text-[var(--text-secondary)]">
              Yükleniyor ve gönderiliyor…
            </p>
          )}

          {state === "done" && (
            <p className="text-sm text-green-400">✓ Gönderildi.</p>
          )}

          {state === "error" && errorMsg && (
            <p className="text-sm text-red-400">{errorMsg}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function pickMimeType(): string {
  // iOS AVAudioPlayer doesn't decode webm/opus. Prefer m4a/AAC so the same blob
  // plays natively on the recipient's iPhone without server-side transcoding.
  // Safari MediaRecorder supports audio/mp4; Chrome falls back to webm.
  const candidates = [
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm";
}

function blobExtension(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}
