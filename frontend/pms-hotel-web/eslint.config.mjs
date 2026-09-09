import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";

const moduleDeepImportRule = [
  "error",
  {
    patterns: [
      {
        group: ["@/modules/*/*"],
        message: "Import a module only through its public API: @/modules/<module>.",
      },
    ],
  },
];

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "coverage/**", "node_modules/**", "public/mockServiceWorker.js"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app", mode: "folder" },
        { type: "module", pattern: "src/modules/*", mode: "folder", capture: ["module"] },
        { type: "shared", pattern: "src/shared", mode: "folder" },
        { type: "lib", pattern: "src/lib", mode: "folder" },
        { type: "data", pattern: "src/data", mode: "folder" },
      ],
    },
    rules: {
      "boundaries/element-types": ["error", {
        default: "allow",
        rules: [{ from: ["shared", "lib"], disallow: ["module"] }],
      }],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": moduleDeepImportRule },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/modules/*", "@/modules/*/*"], message: "shared and lib cannot depend on modules." },
        ],
      }],
    },
  },
]);
