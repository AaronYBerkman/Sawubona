// Build the folder to hand over: only what the app loads, nothing it was built from.
//
// The working tree holds about two gigabytes of extraction output, checkpoints
// and training data; the app needs about 330 MB of it (224 MB zipped). Everything here is
// copied by name, so a new runtime file has to be added to FILES on purpose.
//
//   node scripts/package.mjs        # -> dist/Sawubona/ and dist/Sawubona.zip

import { cpSync, mkdirSync, rmSync, writeFileSync, chmodSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'Sawubona');

import { RUNTIME_FILES } from './runtime-files.mjs';

const FILES = [...RUNTIME_FILES, 'package.json', 'README.md', 'scripts/serve.mjs'];

rmSync(OUT, { recursive: true, force: true });
for (const f of FILES) {
  const from = join(ROOT, f);
  if (!existsSync(from)) throw new Error(`missing runtime file: ${f}`);
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  cpSync(from, join(OUT, f));
}

// Double-click launchers. Both need Node.js; both say so plainly if it is missing.
const mac = `#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Sawubona needs Node.js. Install it from https://nodejs.org (the LTS version), then open this again."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi
(sleep 1 && open "http://localhost:5173") &
echo "Sawubona is running. Keep this window open while you practise; close it to stop."
node scripts/serve.mjs
`;
const win = `@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Sawubona needs Node.js. Install it from https://nodejs.org ^(the LTS version^), then open this again.
  pause
  exit /b 1
)
start "" "http://localhost:5173"
echo Sawubona is running. Keep this window open while you practise; close it to stop.
node scripts\\serve.mjs
`;
writeFileSync(join(OUT, 'Start Sawubona.command'), mac);
chmodSync(join(OUT, 'Start Sawubona.command'), 0o755);
writeFileSync(join(OUT, 'Start Sawubona.bat'), win.replace(/\n/g, '\r\n'));

writeFileSync(join(OUT, 'HOW TO START.txt'), `Sawubona - South African Sign Language practice

1. Install Node.js from https://nodejs.org (the LTS version) if you do not have it.
2. Mac: double-click "Start Sawubona.command". The first time, macOS may refuse
   because it was downloaded - right-click it, choose Open, then Open again.
   Windows: double-click "Start Sawubona.bat".
3. Your browser opens the app. Press "Start camera" and allow the camera.

The first start needs an internet connection (the tracking and model runtimes come
from public servers); after that the browser keeps them.
Nothing you record leaves your computer.
`);

execFileSync('zip', ['-qr', 'Sawubona.zip', 'Sawubona'], { cwd: join(ROOT, 'dist') });
console.log(`dist/Sawubona/ and dist/Sawubona.zip written (${FILES.length} app files + launchers)`);
