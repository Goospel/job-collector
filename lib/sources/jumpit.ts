import type { JobSource } from "@/lib/sources/job-source";
import type { NormalizedJob, Query } from "@/types/job";

/**
 * 점핏(jumpit.saramin.co.kr) 데이터 소스 어댑터.
 * - 공식 오픈API가 없어 웹앱이 쓰는 내부 JSON API(`/api/position/{id}`)를 사용.
 * - robots.txt는 /api/·/sitemap/ 을 허용(막힌 건 이력서·계정·인증 영역). GPTBot만 전면 차단.
 * - 예의 크롤링: 순차 호출 + 호출 간 지연(rate limit) + 신원 User-Agent 명시.
 * - 비밀값이 없어 'server-only'로 마크하지 않는다(순수 함수는 테스트에서 node로 임포트).
 */

const BASE_URL = "https://jumpit.saramin.co.kr";
const USER_AGENT =
  "job-collector-dev/0.1 (personal portfolio; +https://github.com/Goospel/job-collector)";
const SITEMAP_PATH = "/sitemap/sitemap_position_view_1.xml";
const DEFAULT_LIMIT = 20;
const DEFAULT_DELAY_MS = 1000;
const SUCCESS_CODE = "C001";

export interface JumpitTechStack {
  stack: string;
  imagePath?: string;
}

export interface JumpitPositionResult {
  id: number;
  title: string;
  companyName: string;
  techStacks: JumpitTechStack[];
  serviceInfo?: string;
  responsibility?: string;
  qualifications?: string;
  preferredRequirements?: string;
  welfares?: string;
  recruitProcess?: string;
  newcomer: boolean;
  minCareer: number;
  maxCareer: number;
  publishedAt: string;
  closedAt: string;
  location: string;
  alwaysOpen: boolean;
  [key: string]: unknown;
}

export interface JumpitApiResponse {
  message: string;
  status: number;
  code: string;
  result: JumpitPositionResult;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface JumpitDeps {
  fetch?: FetchLike;
  /** position 호출 간 지연(ms) — rate limit. 테스트에선 0. */
  delayMs?: number;
  baseUrl?: string;
}

/** 점핏 KST 문자열("2026-07-06 00:00:00")을 ISO로. 파싱 실패 시 null. */
function toIso(s: string | undefined | null): string | null {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T") + "+09:00");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 점핏 position API 응답을 공통 NormalizedJob으로 정규화한다. */
export function normalizeJumpitPosition(res: JumpitApiResponse): NormalizedJob {
  if (!res || res.code !== SUCCESS_CODE || !res.result) {
    throw new Error(`점핏 응답 실패: code=${res?.code ?? "unknown"}`);
  }
  const r = res.result;

  const descParts: string[] = [];
  if (r.serviceInfo) descParts.push(`[서비스 소개]\n${r.serviceInfo}`);
  if (r.responsibility) descParts.push(`[주요업무]\n${r.responsibility}`);
  if (r.qualifications) descParts.push(`[자격요건]\n${r.qualifications}`);
  if (r.preferredRequirements) descParts.push(`[우대사항]\n${r.preferredRequirements}`);
  if (r.welfares) descParts.push(`[복지]\n${r.welfares}`);

  return {
    id: `jumpit:${r.id}`,
    source: "jumpit",
    sourceId: String(r.id),
    title: r.title,
    company: r.companyName,
    location: r.location ? r.location : null,
    url: `${BASE_URL}/position/${r.id}`,
    description: descParts.join("\n\n"),
    techStacks: (r.techStacks ?? []).map((t) => t.stack).filter(Boolean),
    minCareer: r.newcomer ? 0 : num(r.minCareer),
    maxCareer: num(r.maxCareer),
    employmentType: null,
    postedAt: toIso(r.publishedAt),
    closedAt: r.alwaysOpen ? null : toIso(r.closedAt),
  };
}

/** 점핏 position-view 사이트맵 XML에서 position id들을 순서대로 추출한다. */
export function parsePositionIdsFromSitemap(xml: string): string[] {
  const ids: string[] = [];
  const re = /\/position\/(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function matchesKeywords(job: NormalizedJob, keywords: string[]): boolean {
  const haystack = [job.title, job.description, job.company, ...job.techStacks]
    .join(" ")
    .toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

/**
 * 점핏 JobSource. 사이트맵으로 position id를 열거한 뒤 개별 API를 순차 호출해 정규화한다.
 * fetch/지연/baseUrl은 주입 가능(테스트에서 mock).
 */
export function createJumpitSource(deps?: JumpitDeps): JobSource {
  const doFetch: FetchLike = deps?.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const delayMs = deps?.delayMs ?? DEFAULT_DELAY_MS;
  const baseUrl = deps?.baseUrl ?? BASE_URL;

  return {
    id: "jumpit",
    async fetchListings(query?: Query): Promise<NormalizedJob[]> {
      // 1) 사이트맵에서 position id 열거
      const sitemapRes = await doFetch(`${baseUrl}${SITEMAP_PATH}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!sitemapRes.ok) {
        throw new Error(`점핏 사이트맵 조회 실패: ${sitemapRes.status}`);
      }
      const xml = await sitemapRes.text();
      const allIds = parsePositionIdsFromSitemap(xml);

      const limit = query?.limit ?? DEFAULT_LIMIT;
      const ids = allIds.slice(0, limit);

      // 2) 개별 position 순차 호출(rate limit) → 정규화. 실패는 격리.
      const jobs: NormalizedJob[] = [];
      for (let i = 0; i < ids.length; i++) {
        try {
          const res = await doFetch(`${baseUrl}/api/position/${ids[i]}`, {
            headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
          });
          if (!res.ok) throw new Error(`position ${ids[i]} 조회 실패: ${res.status}`);
          const data = (await res.json()) as JumpitApiResponse;
          jobs.push(normalizeJumpitPosition(data));
        } catch (err) {
          console.error(`[jumpit] position ${ids[i]} 스킵:`, err instanceof Error ? err.message : err);
        }
        if (delayMs > 0 && i < ids.length - 1) await sleep(delayMs);
      }

      // 3) 선택적 키워드 필터
      const keywords = query?.keywords?.map((k) => k.toLowerCase().trim()).filter(Boolean);
      if (keywords && keywords.length > 0) {
        return jobs.filter((job) => matchesKeywords(job, keywords));
      }
      return jobs;
    },
  };
}
