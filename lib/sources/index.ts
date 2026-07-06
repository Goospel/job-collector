import type { JobSource } from "@/lib/sources/job-source";
import type { NormalizedJob, Query } from "@/types/job";
import { dummySource } from "@/lib/sources/dummy";

/**
 * 활성 소스 레지스트리.
 * 실데이터 소스를 붙일 때 여기에 어댑터를 등록하기만 하면 된다.
 * 예: sources.push(jumpitSource) — 나머지 코드(라우트/UI)는 변경 불필요.
 */
const sources: JobSource[] = [dummySource];

export function getSources(): JobSource[] {
  return sources;
}

export function getSource(id: string): JobSource | undefined {
  return sources.find((s) => s.id === id);
}

/**
 * 등록된 모든 소스에서 공고를 모아 반환한다.
 * 한 소스가 실패해도 나머지는 반환(부분 실패 격리).
 */
export async function fetchAllJobs(query?: Query): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled(sources.map((s) => s.fetchListings(query)));

  const jobs: NormalizedJob[] = [];
  for (const [i, result] of results.entries()) {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    } else {
      console.error(`[sources] '${sources[i].id}' 수집 실패:`, result.reason);
    }
  }
  return jobs;
}
