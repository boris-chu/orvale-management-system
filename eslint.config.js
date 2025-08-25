const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [{
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}, ...compat.extends('next/core-web-vitals', 'next/typescript'), {
  ignores: [
    '.next/**',
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '*.config.js',
    '*.config.ts',
    'tsconfig.tsbuildinfo',
  ],
}];