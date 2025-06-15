import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const targets = [
  'opsctrl-linux-x64',
  'opsctrl-macos-x64',
  'opsctrl-macos-arm64',
  'opsctrl-win-x64.exe',
];

const distDir = 'dist';

for (const file of targets) {
  const zipName = `${file}.zip`;
  const zipPath = path.join(distDir, zipName);
  const binaryPath = path.join(distDir, file);

  if (!fs.existsSync(binaryPath)) {
    console.warn(`⚠️ Missing: ${binaryPath}`);
    continue;
  }

  console.log(`📦 Zipping ${binaryPath} → ${zipName}`);
  execSync(`zip -j ${zipPath} ${binaryPath}`);
}
