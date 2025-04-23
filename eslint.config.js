import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import react from "@eslint-react/eslint-plugin";
import reactHooksExtra from "eslint-plugin-react-hooks-extra";
import reactNamingConvention from "eslint-plugin-react-naming-convention";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactCompiler from "eslint-plugin-react-compiler";
import globals from "globals";

// Use "pnpm eslint --inspect-config" to more easily see rules.

export default tseslint.config({
    files: ["src/**/*.{ts,tsx,js,jsx}, browserTest/**/*.{ts,tsx,js,jsx}"],
    ignores: ["src/parser/**/output/*.ts"],
    extends: [
        js.configs.recommended,
        // See https://typescript-eslint.io/users/configs/#strict-type-checked
        tseslint.configs.strictTypeChecked,
        // See https://typescript-eslint.io/users/configs/#stylistic-type-checked
        tseslint.configs.stylisticTypeChecked,

        // From https://github.com/Rel1cx/eslint-react
        // See https://eslint-react.xyz/docs/presets
        react.configs["recommended-type-checked"],
        reactHooksExtra.configs.recommended,
        reactNamingConvention.configs.recommended,

        // Official React (Facebook) configs
        reactHooks.configs["recommended-latest"],
        reactCompiler.configs.recommended,

        // React for vite HMR
        reactRefresh.configs.vite,

        // To make Prettier and ESLint compatible together
        eslintConfigPrettier
    ],
    languageOptions: {
        parserOptions: {
            project: true,
            tsconfigRootDir: import.meta.dirname
        },
        globals: globals.browser
    },
    rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/no-unnecessary-type-assertion": "off",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-misused-promises": [
            "error",
            {
                checksVoidReturn: {
                    arguments: false
                }
            }
        ],
        "@typescript-eslint/no-unnecessary-template-expression": "warn"
    }
});
