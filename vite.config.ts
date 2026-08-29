import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

// GitHub Pages はプロジェクトサイトとして `/<repo>/` 配下に配信されるため、
// ローカル開発（"/"）とは別にベースパスを切り替える必要がある。
// CI（.github/workflows/deploy.yml）がビルド時に VITE_BASE_PATH を設定する。
const basePath = process.env.VITE_BASE_PATH || "/";

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    overrides: [
      {
        // TanStack Router のファイルベースルーティング規約上、ルートファイルは
        // 常に `Route` とコンポーネントの両方を export する。Fast Refresh 向けの
        // このルールとは構造的に相容れないため、routes/ 配下だけ無効化する。
        files: ["src/routes/**"],
        rules: {
          "react/only-export-components": "off",
        },
      },
      {
        // shadcn/ui の生成コードはコンポーネントと variants 関数を同じファイルから
        // export する規約になっており、このルールとは構造的に相容れない。
        files: ["src/components/ui/**"],
        rules: {
          "react/only-export-components": "off",
        },
      },
    ],
  },
  plugins: lazyPlugins(() => [
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: "index.html",
        },
      },
    }),
    react(),
    tailwindcss(),
  ]),
});
