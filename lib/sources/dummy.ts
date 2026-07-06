import type { JobSource } from "@/lib/sources/job-source";
import type { NormalizedJob, Query } from "@/types/job";
import { dummyJobs } from "@/lib/data/dummy-jobs";

/**
 * 더미 데이터 소스 — MVP 데모용.
 * 실데이터 연동 전까지 UI·매칭 파이프라인을 구동한다.
 * 나중에 JumpitAdapter 등으로 교체해도 이 인터페이스만 지키면 나머지 코드는 그대로다.
 */
export const dummySource: JobSource = {
  id: "dummy",
  async fetchListings(query?: Query): Promise<NormalizedJob[]> {
    let jobs = dummyJobs;

    // 선택적 키워드 필터 (제목/설명/기술스택 대상, 대소문자 무시)
    const keywords = query?.keywords?.map((k) => k.toLowerCase().trim()).filter(Boolean);
    if (keywords && keywords.length > 0) {
      jobs = jobs.filter((job) => {
        const haystack = [
          job.title,
          job.description,
          job.company,
          ...job.techStacks,
        ]
          .join(" ")
          .toLowerCase();
        return keywords.some((k) => haystack.includes(k));
      });
    }

    if (query?.limit != null) {
      jobs = jobs.slice(0, query.limit);
    }

    return jobs;
  },
};
