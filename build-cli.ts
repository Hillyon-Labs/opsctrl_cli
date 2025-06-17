import { build } from 'esbuild';
import dotenv from 'dotenv';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { $ } from 'execa';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

dotenv.config();

// Fallback detection based on host
function detectTarget() {
  const platformMap: Record<string, string> = {
    darwin: 'macos',
    linux: 'linux',
  };

  const archMap: Record<string, string> = {
    x64: 'x64',
    arm64: 'arm64',
  };

  const nodeVersion = process.version; // e.g. 'v20.14.0'
  const platform = platformMap[process.platform];
  const arch = archMap[process.arch];

  if (!platform || !arch) {
    throw new Error(`Unsupported platform or arch: ${process.platform} ${process.arch}`);
  }

  return {
    platform,
    arch,
    node: `node${nodeVersion}`,
  };
}

// Parse provided TARGET (e.g. macos-x64-node20.14.0)
function parseTarget(str?: string) {
  if (!str) return detectTarget();
  const [platform, arch, node] = str.split('-');
  if (!platform || !arch || !node) throw new Error(`Invalid TARGET format: ${str}`);
  return { platform, arch, node };
}

const defineEnv = Object.entries(process.env).reduce((acc, [key, val]) => {
  acc[`process.env.${key}`] = JSON.stringify(val);
  return acc;
}, {} as Record<string, string>);

const CMD_NAME = 'opsctrl';
const DIST_DIR = 'release_dist';
const OUTFILE = 'dist/opsctrl.cjs';

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

async function main() {
  const target = parseTarget(process.env.TARGET);
  const tagSuffix = process.env.TAG_SUFFIX || `${target.platform}-${target.arch}`;
  const nexeTarget = `${target.platform}-${target.arch}-${target.node}`;
  const binaryName = `${CMD_NAME}-${tagSuffix}`;
  const binaryPath = join(DIST_DIR, binaryName);
  const zipPath = join(DIST_DIR, `${binaryName}.zip`);

  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });

  await rm('dist', { recursive: true, force: true });
  await mkdir('dist', { recursive: true });

  console.log(`📦 Bundling with esbuild...`);
  await build({
    entryPoints: ['src/index.ts'],
    outfile: OUTFILE,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['fsevents'],
    define: defineEnv,
  });

  console.log(`🔧 Compiling ${nexeTarget}...`);
  try {
    await $`npx nexe ${OUTFILE} --target ${nexeTarget} --build --output ${binaryPath}`;
  } catch (err) {
    console.error(`❌ Failed to compile for ${nexeTarget}`);
    throw err;
  }

  console.log(`📦 Zipping ${binaryName}.zip...`);
  await zipBinary(binaryPath, zipPath);
  await rm(binaryPath);

  console.log(`✅ Done. Zipped binary in ${DIST_DIR}`);
}

main();
