"use client";

import type { Profile } from "@/lib/profile/schema";
import { TagInput } from "@/components/TagInput";

interface ProfileFormProps {
  profile: Profile;
  onChange: (next: Profile) => void;
}

/** 사용자 능력 프로필 입력 폼. 값은 상위(page)에서 localStorage로 영속화한다. */
export function ProfileForm({ profile, onChange }: ProfileFormProps) {
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">한 줄 소개</label>
        <input
          value={profile.headline}
          onChange={(e) => update("headline", e.target.value)}
          placeholder="예: 3년차 백엔드 개발자"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">총 경력 (년)</label>
        <input
          type="number"
          min={0}
          max={50}
          value={profile.careerYears}
          onChange={(e) => update("careerYears", Number(e.target.value) || 0)}
          className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <TagInput
        label="기술스택"
        value={profile.techStacks}
        onChange={(v) => update("techStacks", v)}
        placeholder="예: React, TypeScript (Enter 또는 쉼표로 추가)"
      />

      <TagInput
        label="자격증"
        value={profile.certifications}
        onChange={(v) => update("certifications", v)}
        placeholder="예: 정보처리기사, SQLD"
      />

      <TagInput
        label="희망 직무"
        value={profile.desiredRoles}
        onChange={(v) => update("desiredRoles", v)}
        placeholder="예: 백엔드, 데이터 엔지니어"
      />

      <TagInput
        label="선호 근무지"
        value={profile.preferredLocations}
        onChange={(v) => update("preferredLocations", v)}
        placeholder="예: 서울, 판교"
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          포트폴리오 / 프로젝트
        </label>
        <textarea
          value={profile.portfolioSummary}
          onChange={(e) => update("portfolioSummary", e.target.value)}
          rows={5}
          placeholder="주요 프로젝트와 역할, 사용 기술, 성과를 자유롭게 적어주세요."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">기타 참고사항</label>
        <textarea
          value={profile.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          placeholder="희망 연봉대, 우선순위 등"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
