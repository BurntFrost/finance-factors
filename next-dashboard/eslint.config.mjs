import nextConfig from "eslint-config-next";
import tseslint from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "app/generated/**/*",
      "prisma/generated/**/*",
      "node_modules/**/*",
      ".next/**/*",
      ".vercel/**/*",
      "out/**/*"
    ]
  },
  {
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "off"
    }
  }
];

export default eslintConfig;
