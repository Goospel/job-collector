import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/profile/schema";
import { fetchAllJobs } from "@/lib/sources";
import { scoreJobs } from "@/lib/matching/score";

// 매칭은 Claude 다건 호출로 시간이 걸릴 수 있어 여유 있게 설정 (Hobby 최대 300초).
export const maxDuration = 120;

// --- 간이 레이트리밋 (1차 방어) ---
// 결제형 외부 API(Claude)를 감싸는 무인증 엔드포인트라, 대량 호출로 비용이
// 폭증하는 것을 막기 위한 최소 방어. ⚠️ 인메모리라 서버리스 다중 인스턴스에서는
// 인스턴스별로만 적용된다(best-effort). 배포 시 Vercel KV 등 공유 저장소 기반으로
// 교체해야 한다 (plan.md Phase 4).
const RATE_LIMIT = 20; // 창당 허용 요청 수
const RATE_WINDOW_MS = 60_000; // 창 길이(1분)
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * POST /api/match
 * body: { profile: Profile }
 * → 공고를 사용자 프로필 기준으로 스코어링해 적합도 내림차순 ScoredJob[] 반환.
 *
 * Claude 호출은 이 서버 라우트 안에서만 일어난다(API 키 보호).
 */
export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 본문입니다." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse((body as { profile?: unknown })?.profile);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "프로필 형식이 올바르지 않습니다.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // 설정 오류(키 미설정)는 공고별 실패로 격리하지 않고 선제적으로 명확히 실패시킨다.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 서버 환경변수로 넣어주세요." },
      { status: 503 },
    );
  }

  try {
    const jobs = await fetchAllJobs();
    const results = await scoreJobs(parsed.data, jobs);

    // 전면 실패(모든 공고 평가 실패)를 HTTP 200으로 위장하지 않는다 — 에러로 알려
    // 클라이언트가 에러 배너를 띄우도록 한다.
    const okCount = results.filter((r) => r.score !== null).length;
    if (results.length > 0 && okCount === 0) {
      return NextResponse.json(
        { error: "매칭 평가가 모두 실패했습니다. 잠시 후 다시 시도해주세요." },
        { status: 502 },
      );
    }

    return NextResponse.json({ results });
  } catch (err) {
    // 원시 내부 에러 메시지를 클라이언트로 흘리지 않는다 — 상세는 서버 로그에만.
    console.error("[api/match] 처리 실패:", err);
    return NextResponse.json(
      { error: "매칭 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
