"use client";

import { useCallback, useEffect, useState } from "react";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile/schema";

const STORAGE_KEY = "job-collector:profile";

/**
 * 프로필을 localStorage에 영속화하는 클라이언트 훅.
 * 로그인 없음 — 기기 로컬에만 저장된다(기기 변경 시 소실).
 * 반환: [profile, setProfile, loaded]. loaded는 최초 localStorage 읽기 완료 여부.
 */
export function useProfile(): [Profile, (p: Profile) => void, boolean] {
  const [profile, setProfileState] = useState<Profile>(emptyProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = profileSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setProfileState(parsed.data);
      }
    } catch (err) {
      console.error("[useProfile] 로컬 프로필 로드 실패:", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (err) {
      console.error("[useProfile] 로컬 프로필 저장 실패:", err);
    }
  }, []);

  return [profile, setProfile, loaded];
}
