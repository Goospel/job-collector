import "server-only";

import type { NormalizedJob, ScoredJob } from "@/types/job";
import type { Profile } from "@/lib/profile/schema";
import { scoreJob } from "@/lib/matching/claude";

/** 동시 API 호출 상한 (레이트리밋/과부하 방지) */
const CONCURRENCY = 5;

/**
 * 동시 실행 개수를 제한하며 items를 순회 처리한다.
 * 프로필 프롬프트 캐시는 첫 응답이 스트리밍을 시작해야 읽을 수 있으므로,
 * 첫 호출을 단독으로 먼저 처리해 캐시를 예열한 뒤 나머지를 병렬 처리한다.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * 프로필 기준으로 공고들을 스코어링해 적합도 내림차순으로 반환한다.
 * 개별 공고 평가 실패는 격리한다 — 실패한 공고는 score=null + error로 표시해
 * 결과에 포함(조용히 사라지지 않게)하고 하단에 모으며, 나머지는 정상 반환한다.
 * (호출부는 전부 실패한 경우를 감지해 별도 처리해야 한다 — score가 모두 null이면 전면 실패)
 */
export async function scoreJobs(
  profile: Profile,
  jobs: NormalizedJob[],
): Promise<ScoredJob[]> {
  if (jobs.length === 0) return [];

  // 캐시 예열: 첫 공고를 단독 처리해 프로필 프리픽스를 캐시에 쓴 뒤 나머지 병렬.
  const [first, ...rest] = jobs;
  const firstScored = await scoreOne(profile, first);
  const restScored = await mapWithConcurrency(rest, CONCURRENCY, (job) =>
    scoreOne(profile, job),
  );

  const scored = [firstScored, ...restScored];
  // 성공 공고는 적합도 내림차순, 평가 실패(score=null)는 항상 하단에 분리한다
  // ("평가 실패"와 "실제 0점 부적합"이 섞이지 않도록).
  scored.sort((a, b) => {
    const sa = a.score ? a.score.matchScore : -1;
    const sb = b.score ? b.score.matchScore : -1;
    return sb - sa;
  });
  return scored;
}

async function scoreOne(profile: Profile, job: NormalizedJob): Promise<ScoredJob> {
  try {
    const score = await scoreJob(profile, job);
    return { job, score };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[score] '${job.id}' 평가 실패:`, message);
    // 실패는 가짜 0점이 아니라 score=null + error로 표현 (UI에서 실패로 명확히 구분).
    return { job, score: null, error: message };
  }
}
