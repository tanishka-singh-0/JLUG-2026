import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Two projects in one config:
 *
 * - `engine` runs in plain Node with no jsdom. That absence is the guard for the
 *   DOM-free requirement: any accidental `window`/`document` reference in the
 *   engine, the registry or the pipeline fails the suite instead of silently
 *   passing against a simulated browser.
 * - `ui` runs in jsdom for the hooks and components.
 *
 * `@/*` resolves through `vite-tsconfig-paths`, reading the paths already
 * declared in tsconfig.json rather than duplicating them here.
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: "engine",
          environment: "node",
          include: [
            "src/features/mascot/{engine,data}/**/*.test.ts",
            "scripts/mascot-clips/**/*.test.ts",
          ],
        },
      },
      {
        plugins: [tsconfigPaths(), react()],
        test: {
          name: "ui",
          environment: "jsdom",
          include: [
            "src/features/mascot/{hooks,components}/**/*.test.tsx",
            "src/components/**/*.test.tsx",
          ],
        },
      },
    ],
  },
});
