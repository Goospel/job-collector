import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import type { MatchScore, NormalizedJob } from "@/types/job";
import type { Profile } from "@/lib/profile/schema";
import {
  MATCH_MODEL,
  buildSystemPrompt,
  buildUserMessage,
  matchScoreSchema,
} from "@/lib/matching/prompt";

/**
 * Claude 호출은 100% 서버측에서만.
 * 'server-only' import로 클라이언트 번들 유입을 컴파일 타임에 차단하고,
 * API 키는 서버 env(ANTHROPIC_API_KEY)로만 읽는다. NEXT_PUBLIC_ 접두사 금지.
 */

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 서버 환경변수로 넣어주세요.",
    );
  }
  if (!client) {
    // 호출이 무한정 매달려 라우트 maxDuration까지 요청 전체를 죽이지 않도록
    // 호출당 타임아웃(30초)과 재시도 상한(1)을 둔다. 초과 시 해당 공고만 실패로 격리된다.
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30_000,
      maxRetries: 1,
    });
  }
  return client;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * 공고 하나를 사용자 프로필 기준으로 스코어링한다.
 * - 프로필/규칙은 system(캐시 프리픽스), 공고 본문만 user 메시지에서 변한다.
 * - Haiku 4.5는 effort/thinking 파라미터 미지원이므로 넘기지 않는다.
 */
export async function scoreJob(profile: Profile, job: NormalizedJob): Promise<MatchScore> {
  const anthropic = getClient();

  const response = await anthropic.messages.parse({
    model: MATCH_MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(profile),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(job) }],
    output_config: { format: zodOutputFormat(matchScoreSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("모델이 안전상의 이유로 평가를 거부했습니다.");
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("매칭 결과를 구조화 형식으로 파싱하지 못했습니다.");
  }

  return {
    matchScore: clamp(parsed.matchScore),
    subScores: {
      certifications: clamp(parsed.subScores.certifications),
      techStack: clamp(parsed.subScores.techStack),
      portfolio: clamp(parsed.subScores.portfolio),
      experience: clamp(parsed.subScores.experience),
    },
    reasons: parsed.reasons,
    missingRequirements: parsed.missingRequirements,
    confidence: parsed.confidence,
  };
}
