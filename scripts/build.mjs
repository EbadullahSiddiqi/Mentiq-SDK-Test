import { build } from 'esbuild';
import { rmSync, mkdirSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

const common = {
  bundle: true,
  sourcemap: true,
  target: 'es2020',
  platform: 'browser',
  logLevel: 'info',
  external: ['react', 'react-dom'],
};

await build({
  ...common,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.mjs',
  format: 'esm',
});

await build({
  ...common,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.cjs',
  format: 'cjs',
});

await build({
  ...common,
  entryPoints: ['src/react/index.tsx'],
  outfile: 'dist/react/index.mjs',
  format: 'esm',
});

await build({
  ...common,
  entryPoints: ['src/react/index.tsx'],
  outfile: 'dist/react/index.cjs',
  format: 'cjs',
});

console.log('Build completed.');

