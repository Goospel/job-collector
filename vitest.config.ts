import { defineConfig } from "vitest/config";

// tsconfig의 `@/*` 별칭을 vite 네이티브 해석으로 처리(별도 플러그인 불필요).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
