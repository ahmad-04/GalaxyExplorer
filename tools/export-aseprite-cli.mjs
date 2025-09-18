#!/usr/bin/env node
// Export PNG+JSON from .aseprite sources using Aseprite CLI.

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

// Detect aseprite executable from env or common paths
function detectAseprite() {
  const candidates = [
    process.env.ASEPRITE_PATH,
    'aseprite', // in PATH
    'C:/Program Files/Aseprite/aseprite.exe',
    'C:/Program Files (x86)/Aseprite/aseprite.exe',
  ].filter(Boolean);
  for (const exe of candidates) {
    try {
      const res = spawnSync(exe, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
      if (res.status === 0) return exe;
    } catch {
      // try next
    }
  }
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function exportAseprite(exe, srcPath, outPng, outJson) {
  ensureDir(path.dirname(outPng));
  ensureDir(path.dirname(outJson));
  const args = [
    '-b', // batch
    srcPath,
    '--sheet', outPng,
    '--data', outJson,
    '--sheet-type', 'packed',
    '--format', 'json-array',
    '--list-tags',
    '--ignore-empty',
    '--filename-format', '{title} {frame}',
  ];
  const res = spawnSync(exe, args, { stdio: 'pipe', encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(`[aseprite-cli] Export failed for ${srcPath}:`, res.stderr || res.stdout);
    return false;
  }
  console.log(`[aseprite-cli] Exported ${path.basename(srcPath)} -> ${outPng}, ${outJson}`);
  return true;
}

const asepriteExe = detectAseprite();
if (!asepriteExe) {
  console.error('[aseprite-cli] Could not find Aseprite CLI. Set ASEPRITE_PATH or add to PATH.');
  process.exit(1);
}

const tasks = [
  {
    name: 'autoCannon',
    src: path.join(
      root,
      'src/client/public/assets/Void_MainShip/Main Ship/Main Ship - Weapons/Aseprite/Main Ship - Weapons - Auto Cannon.aseprite'
    ),
    outPng: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon.png'),
    outJson: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon.json'),
  },
  {
    name: 'autoCannonProjectile',
    src: path.join(
      root,
      'src/client/public/assets/Void_MainShip/Main ship weapons/Aseprite/Main ship weapon - Projectile - Auto cannon bullet.aseprite'
    ),
    outPng: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon_projectile.png'),
    outJson: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon_projectile.json'),
  },
  {
    name: 'invincibilityShield',
    src: path.join(
      root,
      'src/client/public/assets/Void_MainShip/Main Ship/Main Ship - Shields/Aseprite/Main Ship - Shields - Invincibility Shield.aseprite'
    ),
    outPng: path.join(root, 'src/client/public/assets/Void_MainShip/export/invincibility_shield.png'),
    outJson: path.join(root, 'src/client/public/assets/Void_MainShip/export/invincibility_shield.json'),
  },
];

// Optional: filter tasks via --only=name
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1] : undefined;
const runTasks = only ? tasks.filter((t) => t.name === only) : tasks;

let ok = true;
for (const t of runTasks) {
  if (!fs.existsSync(t.src)) {
    console.warn(`[aseprite-cli] Source not found, skipping: ${t.src}`);
    ok = false;
    continue;
  }
  const res = exportAseprite(asepriteExe, t.src, t.outPng, t.outJson);
  ok = ok && res;
}

process.exit(ok ? 0 : 2);
