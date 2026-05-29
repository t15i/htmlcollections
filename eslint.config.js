import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

import prettier from "eslint-config-prettier";

import tsdoc from "eslint-plugin-tsdoc";

/**
 * @type {import('eslint/config').Config}[]
 * @see https://eslint.org/docs/latest/use/configure
 * @see https://typescript-eslint.io/users/configs
 * @see https://github.com/prettier/eslint-config-prettier
 * @see https://github.com/microsoft/tsdoc
 */
export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.ts"],
    plugins: { tsdoc },
    rules: {
      "tsdoc/syntax": "error",
    },
  },
];
