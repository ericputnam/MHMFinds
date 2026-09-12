'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  CAST,
  scoreLook,
  buildShareText,
  getEpisodeInfo,
  type CastMember,
  type RackItem,
  type Scene,
  type ScoreBreakdown,
} from '@/lib/game/mainCharacter';

interface DailySlot {
  slot: string;
  label: string;
  emoji: string;
  items: RackItem[];
}

interface DailyEpisode {
  episode: number;
  date: string;
  scene: Scene;
  castId: string;
  slots: DailySlot[];
}

interface SavedGame {
  date: string;
  pickIds: Record<string, string>;
  score: number;
  streak: number;
}

const STORAGE_KEY = 'mhm-main-character';

function loadSaved(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  } catch {
    return null;
  }
}

function isYesterday(dateStr: string, todayStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10) === todayStr;
}

export default function PlayClient() {
  const [data, setData] = useState<DailyEpisode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, RackItem>>({});
  const [result, setResult] = useState<ScoreBreakdown | null>(null);
  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/game/daily')
      .then((res) => {
        if (!res.ok) throw new Error('bad response');
        return res.json();
      })
      .then((json: DailyEpisode) => {
        if (cancelled) return;
        setData(json);

        // Restore today's finished game if the player already played.
        const saved = loadSaved();
        if (saved && saved.date === json.date && saved.score >= 0) {
          const restored: Record<string, RackItem> = {};
          for (const slot of json.slots) {
            const id = saved.pickIds[slot.slot];
            const item = slot.items.find((i) => i.id === id);
            if (item) restored[slot.slot] = item;
          }
          if (Object.keys(restored).length === json.slots.length) {
            const cast = CAST.find((c) => c.id === json.castId) ?? CAST[0];
            setPicks(restored);
            setResult(scoreLook(Object.values(restored), json.scene, cast));
            setStreak(saved.streak);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load today\'s episode. Try refreshing in a moment.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cast: CastMember | null = useMemo(
    () => (data ? CAST.find((c) => c.id === data.castId) ?? CAST[0] : null),
    [data]
  );

  const allPicked = data ? data.slots.every((s) => picks[s.slot]) : false;

  const handlePick = (slot: string, item: RackItem) => {
    if (result) return; // locked after submitting
    setPicks((prev) => ({ ...prev, [slot]: item }));
  };

  const handleSubmit = () => {
    if (!data || !cast || !allPicked || result) return;
    const chosen = data.slots.map((s) => picks[s.slot]);
    const score = scoreLook(chosen, data.scene, cast);

    const saved = loadSaved();
    const newStreak =
      saved && isYesterday(saved.date, data.date) ? saved.streak + 1 : 1;
    const pickIds: Record<string, string> = {};
    for (const s of data.slots) pickIds[s.slot] = picks[s.slot].id;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: data.date, pickIds, score: score.total, streak: newStreak })
      );
    } catch {
      // localStorage unavailable (private mode) — game still works, streak won't persist
    }

    setStreak(newStreak);
    setResult(score);
  };

  const handleShare = useCallback(async () => {
    if (!data || !result) return;
    const info = getEpisodeInfo(data.date);
    const text = buildShareText(info, result, streak);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked — no-op
    }
  }, [data, result, streak]);

  return (
    <div className="min-h-screen bg-mhm-dark text-white font-sans">
      <Navbar />

      <main className="pb-20">
        {/* Main + sidebar layout — mirrors /games/[game]/[topic] and
            /mods/[id] so Mediavine's sidebar targeting reuses the same
            shape. The game is NOT gated behind a loading spinner: the
            header, scene card and rack all render as skeletons on first
            paint, so Mediavine's single DOM scan finds every ad anchor.
            See CLAUDE.md "Loading guards hide ad anchors from Mediavine". */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Game column */}
            <div className="lg:col-span-3 min-w-0">
              {/* Header */}
              <header className="text-center pt-10 pb-8">
                <p className="text-xs uppercase tracking-[0.3em] text-sims-pink font-semibold mb-3">
                  The daily styling game
                </p>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                  MAIN{' '}
                  <span className="bg-gradient-to-r from-sims-pink via-sims-purple to-sims-blue bg-clip-text text-transparent">
                    CHARACTER
                  </span>
                </h1>
                <p className="mt-3 text-gray-400 max-w-xl mx-auto">
                  A new scene every day. Style the star with real Sims 4 custom content,
                  get your Director&apos;s Score, and share your look.
                </p>
              </header>

              {error && (
                <div className="max-w-xl mx-auto bg-mhm-card border border-white/10 rounded-2xl p-8 text-center text-gray-300">
                  {error}
                </div>
              )}

              {/* Scene card */}
              {!error && (
                <section className="mb-10">
                  {data && cast ? (
                    <div className="bg-mhm-card border border-white/5 rounded-3xl overflow-hidden">
                      <div className={`h-1.5 bg-gradient-to-r ${cast.gradient}`} />
                      <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
                        <div
                          className={`shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${cast.gradient} flex items-center justify-center text-4xl shadow-glow`}
                          aria-hidden
                        >
                          {cast.emoji}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
                            Episode {data.episode} · Starring {cast.name} ({cast.pronouns}) ·{' '}
                            {cast.trait}
                          </p>
                          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                            {data.scene.title}
                          </h2>
                          <p className="text-gray-300 leading-relaxed">{data.scene.prompt}</p>
                          <p className="mt-3 text-sm text-gray-500 italic">{cast.tagline}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-mhm-card border border-white/5 rounded-3xl p-8 animate-pulse">
                      <div className="h-4 w-48 bg-white/10 rounded mb-4" />
                      <div className="h-8 w-72 bg-white/10 rounded mb-3" />
                      <div className="h-4 w-full max-w-lg bg-white/10 rounded" />
                    </div>
                  )}
                </section>
              )}

              {/* Result panel */}
              {result && data && cast && (
                <section className="mb-12 bg-mhm-card border border-sims-pink/30 rounded-3xl p-6 sm:p-10 text-center shadow-glow">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">
                    Director&apos;s Score
                  </p>
                  <p className="text-6xl sm:text-7xl font-extrabold bg-gradient-to-r from-sims-pink to-sims-purple bg-clip-text text-transparent">
                    {result.total}
                    <span className="text-2xl text-gray-500">/100</span>
                  </p>
                  <p className="mt-4 text-lg text-gray-200 italic max-w-xl mx-auto">
                    {result.reaction}
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-gray-400">
                    <span className="bg-mhm-elevated rounded-full px-4 py-1.5">
                      🎬 On-brief +{result.onBrief}
                    </span>
                    <span className="bg-mhm-elevated rounded-full px-4 py-1.5">
                      {cast.emoji} {cast.name}&apos;s taste +{result.taste}
                    </span>
                    <span className="bg-mhm-elevated rounded-full px-4 py-1.5">
                      ✨ Cohesion +{result.cohesion}
                    </span>
                    {streak > 1 && (
                      <span className="bg-mhm-elevated rounded-full px-4 py-1.5">
                        🔥 {streak}-day streak
                      </span>
                    )}
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleShare}
                      className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-sims-pink to-sims-purple hover:opacity-90 transition"
                    >
                      {copied ? 'Copied! Paste it anywhere 🎉' : 'Share your result'}
                    </button>
                  </div>

                  {/* Shop the look */}
                  <div className="mt-10 text-left">
                    <h3 className="text-lg font-bold mb-4 text-center">
                      Get today&apos;s look — every piece is real CC
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {data.slots.map((slot) => {
                        const item = picks[slot.slot];
                        if (!item) return null;
                        return (
                          <Link
                            key={slot.slot}
                            href={`/go/${item.id}`}
                            className="group bg-mhm-elevated rounded-2xl overflow-hidden border border-white/5 hover:border-sims-pink/40 transition"
                          >
                            <div className="relative aspect-square">
                              {item.thumbnail ? (
                                <Image
                                  src={item.thumbnail}
                                  alt={item.title}
                                  fill
                                  sizes="(max-width: 640px) 50vw, 200px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-mhm-card" />
                              )}
                            </div>
                            <div className="p-3">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                {slot.label}
                              </p>
                              <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                              <p className="text-xs text-sims-pink mt-1 group-hover:underline">
                                Download →
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <p className="mt-8 text-sm text-gray-500">
                    New episode at midnight ET. Come back tomorrow to keep your streak.
                  </p>
                </section>
              )}

              {/* Rack */}
              {!error && !result && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Build the look</h2>
                    <p className="text-sm text-gray-500">
                      Pick one per slot ·{' '}
                      {data ? `${Object.keys(picks).length}/${data.slots.length}` : '0/4'} chosen
                    </p>
                  </div>

                  <div className="space-y-10">
                    {(data?.slots ?? Array.from({ length: 4 }, () => null)).map(
                      (slot, slotIndex) => (
                        <div key={slot?.slot ?? slotIndex}>
                          <h3 className="font-semibold mb-3 text-gray-200">
                            {slot ? (
                              <>
                                {slot.emoji} {slot.label}
                                {picks[slot.slot] && (
                                  <span className="ml-2 text-sims-green text-sm">✓</span>
                                )}
                              </>
                            ) : (
                              <span className="inline-block h-5 w-24 bg-white/10 rounded animate-pulse" />
                            )}
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {slot
                              ? slot.items.map((item) => {
                                  const selected = picks[slot.slot]?.id === item.id;
                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => handlePick(slot.slot, item)}
                                      className={`text-left bg-mhm-card rounded-2xl overflow-hidden border transition hover:-translate-y-0.5 ${
                                        selected
                                          ? 'border-sims-pink ring-2 ring-sims-pink/60 shadow-glow'
                                          : 'border-white/5 hover:border-sims-purple/40'
                                      }`}
                                    >
                                      <div className="relative aspect-square">
                                        {item.thumbnail ? (
                                          <Image
                                            src={item.thumbnail}
                                            alt={item.title}
                                            fill
                                            sizes="(max-width: 640px) 50vw, 160px"
                                            className="object-cover"
                                            unoptimized
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-mhm-elevated" />
                                        )}
                                        {selected && (
                                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sims-pink flex items-center justify-center text-xs font-bold">
                                            ✓
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-2.5">
                                        <p className="text-xs font-medium line-clamp-2">
                                          {item.title}
                                        </p>
                                        {item.author && (
                                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                                            {item.author}
                                          </p>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })
                              : Array.from({ length: 6 }, (_, i) => (
                                  <div
                                    key={i}
                                    className="bg-mhm-card rounded-2xl border border-white/5 animate-pulse"
                                  >
                                    <div className="aspect-square bg-white/5" />
                                    <div className="p-2.5">
                                      <div className="h-3 bg-white/10 rounded" />
                                    </div>
                                  </div>
                                ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Submit bar */}
                  <div className="sticky bottom-4 mt-10 flex justify-center">
                    <button
                      onClick={handleSubmit}
                      disabled={!allPicked}
                      className={`px-10 py-4 rounded-2xl font-bold text-lg transition shadow-large ${
                        allPicked
                          ? 'bg-gradient-to-r from-sims-pink to-sims-purple hover:opacity-90'
                          : 'bg-mhm-elevated text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {allPicked ? '🎬 Action! Submit the look' : 'Pick one item per slot'}
                    </button>
                  </div>
                </section>
              )}

              {/* Below-the-game content, wrapped in .mv-ads so Mediavine has an
                  in-content injection point. Two children (cast, how-to-play) are
                  required — Mediavine injects BETWEEN children, so a single-child
                  .mv-ads stays empty. Deliberately below the rack and the result
                  panel so no ad ever lands inside the play interaction. */}
              <div className="mv-ads">
                {/* Meet the cast */}
                <section className="mt-20">
                  <h2 className="text-xl font-bold text-center mb-2">Meet the cast</h2>
                  <p className="text-center text-gray-500 text-sm mb-8 max-w-lg mx-auto">
                    Four stars, one wardrobe department: you. Each is playable in your own game
                    with our free{' '}
                    <Link href="/?search=main%20character%20energy" className="text-sims-pink hover:underline">
                      Main Character Energy trait pack
                    </Link>
                    .
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CAST.map((member) => (
                      <div
                        key={member.id}
                        className="bg-mhm-card border border-white/5 rounded-2xl p-5 text-center"
                      >
                        <div
                          className={`mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-2xl mb-3`}
                          aria-hidden
                        >
                          {member.emoji}
                        </div>
                        <p className="font-bold">{member.name}</p>
                        <p className="text-xs text-gray-500 mb-2">
                          {member.pronouns} · {member.trait}
                        </p>
                        <p className="text-sm text-gray-400">{member.tagline}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* How to play */}
                <section className="mt-16 max-w-2xl mx-auto text-center text-sm text-gray-500 leading-relaxed">
                  <h2 className="text-base font-bold text-gray-300 mb-2">How to play</h2>
                  <p>
                    One episode per day. Read the scene, pick one CC item per slot for the star,
                    and submit. On-brief picks score big; matching the star&apos;s personal taste
                    and keeping a cohesive visual style earn bonuses. Every item in your look is
                    real custom content you can download. New episode at midnight ET — keep the
                    streak alive.
                  </p>
                </section>
              </div>
            </div>

            {/* Right ad sidebar — Mediavine auto-detects <aside id="secondary">.
                Visible from lg (1024px), not xl: the sticky health score is
                scored on how often the sidebar is actually on screen.
                Do NOT add position:sticky/fixed (Mediavine handles it), do
                NOT put placeholder divs inside (they break auto-fill), and
                keep overflow visible on this element and every ancestor. */}
            <aside
              id="secondary"
              className="widget-area primary-sidebar hidden lg:block overflow-visible"
              role="complementary"
              aria-label="Sidebar ads"
            >
              {/* Empty — Mediavine auto-fills with its own stacked containers. */}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
