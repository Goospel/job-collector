import type { NormalizedJob, Query } from "@/types/job";

/**
 * 모든 채용 데이터 소스가 구현하는 인터페이스.
 * 이 추상화 덕분에 "더미 → 점핏 내부 API → 사람인 공식 API" 교체가
 * 나머지 코드 변경 없이 이뤄진다. (plan.md §2 어댑터 추상화)
 */
export interface JobSource {
  /** 소스 식별자: 'dummy' | 'jumpit' | 'saramin' | 'wanted' */
  readonly id: string;
  /** 공고 목록을 정규화된 형태로 반환 */
  fetchListings(query?: Query): Promise<NormalizedJob[]>;
}
