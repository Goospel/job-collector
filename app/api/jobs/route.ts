import { NextResponse } from "next/server";
import { fetchAllJobs } from "@/lib/sources";

/**
 * GET /api/jobs — 등록된 모든 소스(현재 더미)에서 공고 목록을 반환.
 * 매칭 없이 원본 공고만 보여줄 때 사용.
 */
export async function GET() {
  try {
    const jobs = await fetchAllJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "공고를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
