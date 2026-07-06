import { z } from "zod";

/**
 * 사용자 능력 프로필.
 * 로그인 없음 — 클라이언트 localStorage에만 저장되고, 매칭 시 서버로 POST된다.
 * 서버는 이 스키마로 들어온 JSON을 파싱/검증한 뒤 Claude 프롬프트에 넣는다.
 */
export const profileSchema = z.object({
  /** 한 줄 소개 (예: "3년차 백엔드 개발자") */
  headline: z.string().max(200).default(""),
  /** 총 경력(년) */
  careerYears: z.number().min(0).max(50).default(0),
  /** 보유 기술스택 */
  techStacks: z.array(z.string().max(50)).max(100).default([]),
  /** 보유 자격증 */
  certifications: z.array(z.string().max(100)).max(50).default([]),
  /** 포트폴리오/프로젝트 서술 (자유 텍스트) */
  portfolioSummary: z.string().max(4000).default(""),
  /** 희망 직무 (예: "백엔드", "데이터 엔지니어") */
  desiredRoles: z.array(z.string().max(50)).max(20).default([]),
  /** 선호 근무지 */
  preferredLocations: z.array(z.string().max(50)).max(20).default([]),
  /** 기타 참고사항 (희망 연봉대, 우선순위 등) */
  notes: z.string().max(2000).default(""),
});

export type Profile = z.infer<typeof profileSchema>;

/** 폼 초기값 / 빈 프로필 */
export const emptyProfile: Profile = {
  headline: "",
  careerYears: 0,
  techStacks: [],
  certifications: [],
  portfolioSummary: "",
  desiredRoles: [],
  preferredLocations: [],
  notes: "",
};

/** 프로필이 매칭을 돌릴 만큼 최소한의 내용을 가졌는지 */
export function isProfileMatchable(p: Profile): boolean {
  return (
    p.techStacks.length > 0 ||
    p.certifications.length > 0 ||
    p.portfolioSummary.trim().length > 0 ||
    p.desiredRoles.length > 0 ||
    p.headline.trim().length > 0
  );
}
