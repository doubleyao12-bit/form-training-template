import tsParser from '@typescript-eslint/parser';
// Small correctness baseline for the existing codebase; TypeScript handles type checking.
// No formatting mandate, no bulk rewrites and no suppressed diagnostics baseline.
export default [
  { ignores: ['node_modules/**', 'dist/**', '.validation/**', 'api/mcp.js', 'api/mcp.js.map'] },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    rules: {
      'constructor-super': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-func-assign': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'valid-typeof': 'error',
    },
  },
];
