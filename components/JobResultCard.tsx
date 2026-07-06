import type { ScoredJob } from "@/types/job";
import { ScoreBadge } from "@/components/ScoreBadge";

const SUB_LABELS: Record<string, string> = {
  certifications: "자격증",
  techStack: "기술스택",
  portfolio: "포트폴리오",
  experience: "경력",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "신뢰도 높음",
  medium: "신뢰도 보통",
  low: "신뢰도 낮음",
};

function SubScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-slate-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-600">{value}</span>
    </div>
  );
}

/** 공고 + 매칭 평가를 한 장의 카드로 표시 */
export function JobResultCard({ scored }: { scored: ScoredJob }) {
  const { job, score, error } = scored;

  // 평가 실패 공고: 오류를 '추천 근거'처럼 렌더하지 않고 전용 실패 카드로 명확히 구분한다.
  if (!score) {
    return (
      <article className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-900">{job.title}</h3>
            <p className="mt-0.5 text-sm text-slate-600">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
            평가 실패
          </span>
        </div>
        <p className="mt-3 text-sm text-amber-800">
          이 공고는 평가하지 못했습니다{error ? `: ${error}` : "."}
        </p>
        <div className="mt-3 border-t border-amber-100 pt-3 text-right">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            공고 보기 →
          </a>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-900">{job.title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.techStacks.map((t) => (
              <span
                key={t}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <ScoreBadge score={score.matchScore} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          {Object.entries(score.subScores).map(([key, value]) => (
            <SubScoreBar key={key} label={SUB_LABELS[key] ?? key} value={value} />
          ))}
        </div>

        <div className="space-y-3">
          {score.reasons.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">추천 근거</p>
              <ul className="space-y-1">
                {score.reasons.map((r, i) => (
                  <li key={i} className="flex gap-1.5 text-sm text-slate-700">
                    <span className="text-emerald-500">✓</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.missingRequirements.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">부족한 요구사항</p>
              <ul className="space-y-1">
                {score.missingRequirements.map((m, i) => (
                  <li key={i} className="flex gap-1.5 text-sm text-slate-700">
                    <span className="text-amber-500">!</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          {CONFIDENCE_LABEL[score.confidence]}
          {job.closedAt
            ? ` · 마감 ${new Date(job.closedAt).toLocaleDateString("ko-KR")}`
            : " · 상시채용"}
        </span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 hover:text-indigo-800"
        >
          공고 보기 →
        </a>
      </div>
    </article>
  );
}
