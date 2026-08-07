import dts from "vite-plugin-dts";
import babel from "vite-plugin-babel";

import { playwright } from "@vitest/browser-playwright";

/**
 * @type {import('vite').UserConfig}
 *
 * @see https://vite.dev/config/
 * @see https://vitest.dev/config/
 * @see https://github.com/qmhc/unplugin-dts
 */
export default {
  plugins: [
    babel({
      enforce: "pre",
      include: /\.tsx?$/,
      babelConfig: {
        plugins: [
          [
            "@babel/plugin-transform-typescript",
            { onlyRemoveTypeImports: true, allowDeclareFields: true },
          ],
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ],
      },
    }),
    dts({
      tsconfigPath: "./lib/tsconfig.json",
      outDirs: "./dist/types",
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    dir: "test",
    passWithNoTests: true,
    setupFiles: "test/setup.ts",
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }, { browser: "firefox" }],
    },
    coverage: {
      enabled: true,
      provider: "istanbul",
      include: ["lib/**/*.ts"],
      exclude: ["lib/BlinklikeHTMLCollection.ts"],
      thresholds: {
        90: true,
      },
      reporter: "text",
    },
  },
  build: {
    outDir: "dist",
    lib: {
      entry: "./lib/index.ts",
    },
    rolldownOptions: {
      external: [/^@t15i\/(webidl-decorators|webidl-types|webspecs)(\/.*)?$/],
      output: [
        {
          name: "htmlcollections",
          format: "es",
          dir: "dist/lib",
          entryFileNames: "[name].js",
          preserveModules: true,
          minify: false,
        },
      ],
    },
  },
};
