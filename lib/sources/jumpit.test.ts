import { describe, it, expect } from "vitest";
import rawPosition from "./__fixtures__/jumpit-position.json";
import {
  normalizeJumpitPosition,
  parsePositionIdsFromSitemap,
  createJumpitSource,
  type JumpitApiResponse,
} from "./jumpit";

const position = rawPosition as unknown as JumpitApiResponse;

function withResult(overrides: Record<string, unknown>): JumpitApiResponse {
  return {
    ...position,
    result: { ...position.result, ...overrides },
  } as JumpitApiResponse;
}

describe("normalizeJumpitPosition", () => {
  it("핵심 필드를 NormalizedJob으로 매핑한다", () => {
    const job = normalizeJumpitPosition(position);
    expect(job.id).toBe("jumpit:12345678");
    expect(job.source).toBe("jumpit");
    expect(job.sourceId).toBe("12345678");
    expect(job.title).toBe("테스트 백엔드 개발자");
    expect(job.company).toBe("테스트컴퍼니");
    expect(job.url).toBe("https://jumpit.saramin.co.kr/position/12345678");
    expect(job.techStacks).toEqual(["Java", "Spring"]);
    expect(job.minCareer).toBe(3);
    expect(job.maxCareer).toBe(7);
    expect(job.location).toBe("서울 강남구");
  });

  it("설명 파트(주요업무/자격요건/우대사항)를 하나의 description으로 합친다", () => {
    const job = normalizeJumpitPosition(position);
    expect(job.description).toContain("주요업무 내용 텍스트.");
    expect(job.description).toContain("자격요건 내용 텍스트.");
    expect(job.description).toContain("우대사항 내용 텍스트.");
  });

  it("publishedAt/closedAt(KST)을 ISO 문자열로 변환한다", () => {
    const job = normalizeJumpitPosition(position);
    expect(job.postedAt).toBe(new Date("2026-07-06T00:00:00+09:00").toISOString());
    expect(job.closedAt).toBe(new Date("2026-08-04T23:59:59+09:00").toISOString());
  });

  it("alwaysOpen이면 closedAt은 null(상시채용)", () => {
    const job = normalizeJumpitPosition(withResult({ alwaysOpen: true }));
    expect(job.closedAt).toBeNull();
  });

  it("newcomer(신입)면 minCareer는 0", () => {
    const job = normalizeJumpitPosition(withResult({ newcomer: true, minCareer: 0 }));
    expect(job.minCareer).toBe(0);
  });

  it("성공 코드(C001)가 아니면 예외를 던진다", () => {
    expect(() => normalizeJumpitPosition({ ...position, code: "C003" } as JumpitApiResponse)).toThrow();
  });
});

describe("parsePositionIdsFromSitemap", () => {
  const xml =
    "<urlset><url><loc>https://jumpit.saramin.co.kr/position/111</loc></url>" +
    "<url><loc>https://jumpit.saramin.co.kr/position/222</loc></url></urlset>";

  it("position id를 순서대로 추출한다", () => {
    expect(parsePositionIdsFromSitemap(xml)).toEqual(["111", "222"]);
  });

  it("position이 아닌 URL은 무시한다", () => {
    const x = "<url><loc>https://jumpit.saramin.co.kr/company/9</loc></url>" + xml;
    expect(parsePositionIdsFromSitemap(x)).toEqual(["111", "222"]);
  });

  it("빈 사이트맵은 빈 배열", () => {
    expect(parsePositionIdsFromSitemap("<urlset></urlset>")).toEqual([]);
  });
});

describe("createJumpitSource.fetchListings", () => {
  const sitemapXml =
    "<urlset><url><loc>https://jumpit.saramin.co.kr/position/12345678</loc></url>" +
    "<url><loc>https://jumpit.saramin.co.kr/position/222</loc></url>" +
    "<url><loc>https://jumpit.saramin.co.kr/position/333</loc></url></urlset>";

  function fakeFetch(records: { url: string; init?: RequestInit }[]) {
    return async (url: string, init?: RequestInit): Promise<Response> => {
      records.push({ url, init });
      if (url.includes("sitemap_position_view")) {
        return new Response(sitemapXml, { status: 200 });
      }
      if (url.includes("/api/position/")) {
        return new Response(JSON.stringify(position), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error("예상치 못한 요청: " + url);
    };
  }

  it("사이트맵→개별 position 순으로 호출하고 limit만큼 정규화해 반환한다", async () => {
    const records: { url: string; init?: RequestInit }[] = [];
    const src = createJumpitSource({ fetch: fakeFetch(records), delayMs: 0 });
    const jobs = await src.fetchListings({ limit: 2 });

    expect(jobs).toHaveLength(2);
    expect(jobs[0].source).toBe("jumpit");
    // 사이트맵을 먼저 부르고, 그다음 position API를 부른다
    expect(records[0].url).toContain("sitemap_position_view");
    expect(records.filter((r) => r.url.includes("/api/position/"))).toHaveLength(2);
  });

  it("모든 position 요청에 신원 User-Agent 헤더를 실어 보낸다(예의 크롤링)", async () => {
    const records: { url: string; init?: RequestInit }[] = [];
    const src = createJumpitSource({ fetch: fakeFetch(records), delayMs: 0 });
    await src.fetchListings({ limit: 1 });

    const posReq = records.find((r) => r.url.includes("/api/position/"));
    const headers = new Headers(posReq?.init?.headers);
    expect(headers.get("user-agent") ?? "").not.toBe("");
  });

  it("개별 position 실패는 격리하고 나머지는 반환한다", async () => {
    const records: { url: string; init?: RequestInit }[] = [];
    const flakyFetch = async (url: string, init?: RequestInit): Promise<Response> => {
      records.push({ url, init });
      if (url.includes("sitemap_position_view")) return new Response(sitemapXml, { status: 200 });
      if (url.includes("/position/222")) return new Response("nope", { status: 500 });
      if (url.includes("/api/position/")) {
        return new Response(JSON.stringify(position), { status: 200 });
      }
      throw new Error("예상치 못한 요청: " + url);
    };
    const src = createJumpitSource({ fetch: flakyFetch, delayMs: 0 });
    const jobs = await src.fetchListings({ limit: 3 });
    // 3건 중 222는 실패 → 2건만 정규화되어 반환
    expect(jobs).toHaveLength(2);
  });
});
