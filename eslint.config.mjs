import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Security: Prevent admin client from being imported in client-side code
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message:
                "Admin client bypasses RLS and must NEVER be used in client components. Use client.ts or server.ts instead.",
            },
          ],
          patterns: [
            {
              group: ["**/supabase/admin*"],
              message:
                "Admin client bypasses RLS and must NEVER be used in client components.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
