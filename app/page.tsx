"use client";

import { useState } from "react";
import type { ScoredJob } from "@/types/job";
import { isProfileMatchable } from "@/lib/profile/schema";
import { useProfile } from "@/lib/profile/useProfile";
import { ProfileForm } from "@/components/ProfileForm";
import { JobResultCard } from "@/components/JobResultCard";

export default function Home() {
  const [profile, setProfile, loaded] = useProfile();
  const [results, setResults] = useState<ScoredJob[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMatch() {
    setError(null);
    if (!isProfileMatchable(profile)) {
      setError("기술스택·자격증·포트폴리오 중 최소 하나는 입력해야 매칭할 수 있습니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "매칭에 실패했습니다.");
      }
      setResults(data.results as ScoredJob[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "매칭 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">구인정보 콜렉터</h1>
        <p className="mt-1 text-sm text-slate-600">
          내 능력을 입력하면, 채용공고와의 적합도를 AI가 평가해 순위로 보여줍니다.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          현재 데모 데이터로 동작합니다 — 실제 채용공고 연동(점핏·사람인)은 다음 단계에서 붙습니다.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* 프로필 입력 */}
        <section className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">내 능력 프로필</h2>
            {loaded ? (
              <ProfileForm profile={profile} onChange={setProfile} />
            ) : (
              <p className="text-sm text-slate-400">불러오는 중…</p>
            )}
            <button
              onClick={handleMatch}
              disabled={loading || !loaded}
              className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "매칭 중…" : "매칭 실행"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              프로필은 이 브라우저에만 저장됩니다.
            </p>
          </div>
        </section>

        {/* 결과 */}
        <section>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              공고를 하나씩 평가하고 있습니다…
            </div>
          )}

          {!loading && results && results.length > 0 && (
            <>
              <p className="mb-3 text-sm text-slate-500">
                총 {results.length}건 중 {results.filter((r) => r.score !== null).length}건 평가 완료
                {results.some((r) => r.score === null)
                  ? `, ${results.filter((r) => r.score === null).length}건 평가 실패`
                  : ""}{" "}
                — 적합도순 정렬.
              </p>
              <div className="space-y-4">
                {results.map((scored) => (
                  <JobResultCard key={scored.job.id} scored={scored} />
                ))}
              </div>
            </>
          )}

          {!loading && !results && !error && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-10 text-center text-sm text-slate-500">
              왼쪽에 능력 프로필을 입력하고 <b>매칭 실행</b>을 눌러보세요.
            </div>
          )}

          {!loading && results && results.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              매칭할 공고가 없습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
