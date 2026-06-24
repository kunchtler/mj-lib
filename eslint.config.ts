import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import officialReact from "eslint-plugin-react-hooks";
import communityReact from "@eslint-react/eslint-plugin";
import communityReactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

// Use "pnpm eslint --inspect-config" to more easily see rules.

export default defineConfig([
    {
        files: ["src/**/*.{ts,tsx,js,jsx}", "browserTest/**/*.{ts,tsx,js,jsx}"],
        ignores: ["src/parser/**/output/*.ts"],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommendedTypeChecked,
            // See https://typescript-eslint.io/users/configs/#strict-type-checked
            tseslint.configs.strictTypeChecked,
            // See https://typescript-eslint.io/users/configs/#stylistic-type-checked
            // Not needed as we have prettier for styles.
            // tseslint.configs.stylisticTypeChecked,

            // From https://github.com/Rel1cx/eslint-react
            // See https://eslint-react.xyz/docs/presets
            communityReact.configs["recommended-type-checked"],
            // React for vite HMR
            communityReactRefresh.configs.vite,

            // Official React (Facebook) configs
            officialReact.configs.flat.recommended,

            // To make Prettier and ESLint compatible together
            eslintConfigPrettier
        ],
        languageOptions: {
            parserOptions: {
                project: true,
                //@ts-ignore
                tsconfigRootDir: import.meta.dirname
            },
            globals: globals.browser //TODO : Change when deving pure node lib.
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
            "@typescript-eslint/no-unnecessary-template-expression": "warn",
            "@typescript-eslint/no-empty-function": "warn",
            "@typescript-eslint/no-extraneous-class": "warn",
            "@typescript-eslint/no-unnecessary-condition": [
                "error",
                { allowConstantLoopConditions: "only-allowed-literals" }
            ]
            // "react-hooks/exhaustive-deps": ["warn", { additionalHooks: "(useLazyRef)" }]
        }
    }
]);
