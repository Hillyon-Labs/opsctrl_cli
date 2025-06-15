// bundle-cli.ts
import { build } from 'esbuild';
import dotenv from 'dotenv';
dotenv.config();

const defineEnv = Object.entries(process.env).reduce((acc, [key, val]) => {
  acc[`process.env.${key}`] = JSON.stringify(val);
  return acc;
}, {} as Record<string, string>);
async function bundle() {
  await build({
    entryPoints: ['src/index.ts'], // or 'src/bin.ts' if that's your real CLI entry
    outfile: 'dist/opsctrl.cjs',
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['fsevents'],
    define: defineEnv,
  });

  console.log('✅ Bundled CLI to dist/opsctrl.cjs');
}

bundle();
