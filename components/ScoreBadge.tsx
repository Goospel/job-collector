interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "lg";
}

function palette(score: number): { ring: string; text: string; label: string } {
  // 경계는 프롬프트가 모델에 지시한 밴드와 일치시킨다 (prompt.ts: 90+ 매우적합 / 70~89 적합 / 50~69 보통).
  if (score >= 90) return { ring: "ring-emerald-500", text: "text-emerald-600", label: "매우 적합" };
  if (score >= 70) return { ring: "ring-sky-500", text: "text-sky-600", label: "적합" };
  if (score >= 50) return { ring: "ring-amber-500", text: "text-amber-600", label: "보통" };
  return { ring: "ring-slate-400", text: "text-slate-500", label: "부적합" };
}

/** 종합 적합도 점수를 원형 배지로 표시 */
export function ScoreBadge({ score, size = "lg" }: ScoreBadgeProps) {
  const { ring, text, label } = palette(score);
  const dim = size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const num = size === "lg" ? "text-xl" : "text-base";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex ${dim} items-center justify-center rounded-full bg-white ring-2 ${ring}`}
      >
        <span className={`${num} font-bold ${text}`}>{score}</span>
      </div>
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  );
}
