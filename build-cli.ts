// bundle-cli.ts
import { build } from 'esbuild';
import dotenv from 'dotenv';
import { $ } from 'execa';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

dotenv.config();

const defineEnv = Object.entries(process.env).reduce((acc, [key, val]) => {
  acc[`process.env.${key}`] = JSON.stringify(val);
  return acc;
}, {} as Record<string, string>);

const CMD_NAME = 'opsctrl';
const DIST_DIR = 'release_dist';
const BUNDLE_PATH = 'dist/opsctrl.cjs';
const VERSION = require('./package.json').version;

const targets = [
  { platform: 'linux', arch: 'x64', node: 'node18', ext: '' },
  { platform: 'macos', arch: 'x64', node: 'node18', ext: '' },
  { platform: 'macos', arch: 'arm64', node: 'node18', ext: '' },
  { platform: 'win', arch: 'x64', node: 'node18', ext: '.exe' },
];

async function bundle() {
  await build({
    entryPoints: ['src/index.ts'],
    outfile: BUNDLE_PATH,
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['fsevents'],
    define: defineEnv,
  });
  console.log('✅ Bundled CLI to', BUNDLE_PATH);
}

async function zipBinary(binaryPath: string, outputZip: string) {
  return new Promise<void>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = createWriteStream(outputZip);
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.file(binaryPath, { name: binaryPath.split('/').pop()! });
    archive.finalize();
  });
}

async function buildBinaries() {
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });

  for (const target of targets) {
    const binaryName = `${CMD_NAME}-${target.platform}-${target.arch}${target.ext}`;
    const binaryPath = join(DIST_DIR, binaryName);
    const zipPath = join(DIST_DIR, `${CMD_NAME}-${target.platform}-${target.arch}.zip`);

    console.log(`🔧 Building binary: ${binaryName}`);
    await $`pkg ${BUNDLE_PATH} --targets ${target.node}-${target.platform}-${target.arch} --output ${binaryPath}`;

    console.log(`📦 Zipping to ${zipPath}`);
    await zipBinary(binaryPath, zipPath);
  }
}

(async () => {
  console.log(`🚀 Releasing OpsCtrl v${VERSION}`);
  await bundle();
  await buildBinaries();
  console.log(`\n✅ All done! Binaries and zip files are in ${DIST_DIR}`);
})();
