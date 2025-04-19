// jest.integration.config.ts
import type { Config } from "@jest/types";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig: Config.InitialOptions = {
  testEnvironment: "jest-environment-jsdom",

  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/tests/**/*.test.[jt]s?(x)",
  ],

  moduleNameMapper: {
    // Map "next-intl" to our mock
    "^next-intl$": "<rootDir>/tests/__mocks__/next-intl.ts",
    // If you mock "next/navigation", do so here
    "^next/navigation$": "<rootDir>/tests/__mocks__/next/navigation.ts"
  },

  // If you’re still using SWC, that’s fine, or remove if you prefer:
  extensionsToTreatAsEsm: [".ts", ".tsx"],
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
  transformIgnorePatterns: [
    "node_modules/(?!next-intl)"
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default createJestConfig(customJestConfig);
