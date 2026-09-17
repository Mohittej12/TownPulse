"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useQuizGame } from "@/context/QuizGameContext";
import { TactileButton } from "@/components/ui/primitives";

const AVATARS = ["🦊", "🐼", "🐸", "🦁", "🐨", "🦉", "🐢", "🐙", "🦄", "🐯", "🦋", "🐳"];

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { joinSession } = useQuizGame();

  const [pin, setPin] = useState(searchParams.get("pin") ?? "");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!pin.trim()) {
      setError("Enter the room PIN first.");
      return;
    }
    if (!name.trim()) {
      setError("Enter a display name first.");
      return;
    }
    setSubmitting(true);
    const result = await joinSession(pin.trim(), name.trim(), avatar);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/play/${result.sessionId}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white border border-brand-tint rounded-card shadow-sm p-6 flex flex-col gap-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Join townhall</h1>
          <p className="text-sm text-ink-soft">townpulse.app/join</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Room PIN</span>
            <input
              id="join-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              placeholder="482913"
              className="rounded-xl border border-brand-tint bg-canvas px-3 py-2.5 text-lg font-display tracking-widest text-center text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Display name</span>
            <input
              id="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              className="rounded-xl border border-brand-tint bg-canvas px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Pick an avatar</span>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  aria-pressed={avatar === a}
                  aria-label={`Avatar ${a}`}
                  className={clsx(
                    "text-xl rounded-lg py-2 border",
                    avatar === a ? "bg-brand-tint border-brand" : "bg-canvas border-brand-tint"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-option-red-border">{error}</p>}

          <TactileButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Joining…" : "Join townhall"}
          </TactileButton>
        </form>
      </div>
    </main>
  );
}
