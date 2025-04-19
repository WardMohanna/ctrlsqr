// jest.config.ts

import type { Config } from "@jest/types";
import nextJest from "next/jest";

/** Load Next.js configuration and .env files */
const createJestConfig = nextJest({
  dir: "./",
});

/** Custom Jest config */
const customJestConfig: Config.InitialOptions = {
  testEnvironment: "jest-environment-jsdom",

  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/tests/**/*.test.[jt]s?(x)"
  ],


  // Tells Jest: "These extensions are ESM"
  extensionsToTreatAsEsm: [".ts", ".tsx"],

  // Use SWC to transform TS & JS (including ESM from next-intl)
  transform: {
    "^.+\\.m?[tj]sx?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2019",
          parser: {
            syntax: "typescript",
            tsx: true
          },
          transform: {
            react: { runtime: "automatic" }
          }
        }
      }
    ]
  },

  // Must NOT ignore next-intl in node_modules because it's ESM
  transformIgnorePatterns: [
    "node_modules/(?!next-intl)"
  ],
  
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default createJestConfig(customJestConfig);
