/**
 * 소스 간 공통 정규화 스키마.
 * 어떤 잡보드(점핏/사람인/원티드/더미)에서 왔든 이 형태로 정규화한다.
 * 실데이터 소스를 붙일 때 어댑터가 원본을 이 형태로 변환한다.
 */
export interface NormalizedJob {
  /** `${source}:${sourceId}` 형태의 전역 유일 ID (저장소 upsert 키) */
  id: string;
  /** 소스 식별자: 'dummy' | 'jumpit' | 'saramin' | 'wanted' */
  source: string;
  /** 소스 내부 ID */
  sourceId: string;
  title: string;
  company: string;
  location: string | null;
  /** 원문 공고 URL */
  url: string;
  /** 자격요건 + 주요업무 + 우대사항을 통합한 설명 텍스트 (매칭 입력) */
  description: string;
  /** 요구/우대 기술스택 */
  techStacks: string[];
  /** 요구 최소 경력(년). null이면 무관 */
  minCareer: number | null;
  /** 요구 최대 경력(년). null이면 상한 없음 */
  maxCareer: number | null;
  /** 고용형태 (정규직/계약직 등) */
  employmentType: string | null;
  /** 게시일 ISO 문자열 */
  postedAt: string | null;
  /** 마감일 ISO 문자열. null이면 상시채용 */
  closedAt: string | null;
}

/** 소스에 넘기는 조회 조건 */
export interface Query {
  keywords?: string[];
  limit?: number;
}

/** 저장소 조회 필터 */
export interface JobFilter {
  source?: string;
  location?: string;
  techStack?: string;
}

export type Confidence = "high" | "medium" | "low";

/**
 * Claude가 반환하는 매칭 평가 결과.
 * 필드명은 구조화 출력 JSON Schema와 1:1 대응한다(영문 키 — 라벨은 UI에서 한글화).
 */
export interface MatchScore {
  /** 종합 적합도 0~100 */
  matchScore: number;
  subScores: {
    /** 자격증 부합도 */
    certifications: number;
    /** 기술스택 부합도 */
    techStack: number;
    /** 포트폴리오/프로젝트 부합도 */
    portfolio: number;
    /** 경력 부합도 */
    experience: number;
  };
  /** 이 공고를 추천/비추천하는 핵심 근거 (한국어) */
  reasons: string[];
  /** 사용자가 충족하지 못한 결정적 요구사항 (한국어) */
  missingRequirements: string[];
  confidence: Confidence;
}

/**
 * 공고 + 그에 대한 매칭 평가.
 * 평가에 성공하면 score가 채워지고, 실패하면 score는 null·error에 사유가 담긴다
 * (평가 실패와 "실제 0점 부적합"을 명확히 구분하기 위함).
 */
export interface ScoredJob {
  job: NormalizedJob;
  score: MatchScore | null;
  error?: string;
}
