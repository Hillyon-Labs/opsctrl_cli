// bundle-cli.ts
import { build } from 'esbuild';

async function bundle() {
  await build({
    entryPoints: ['src/index.ts'], // or 'src/bin.ts' if that's your real CLI entry
    outfile: 'dist/opsctrl.cjs',
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['fsevents'],
  });

  console.log('✅ Bundled CLI to dist/opsctrl.cjs');
}

bundle();
