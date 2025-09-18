#!/usr/bin/env node
// Generate minimal Aseprite JSON (single-frame) from existing PNGs.
// This avoids needing the Aseprite app installed when we only need static frames.

import fs from 'fs';
import path from 'path';

function getPngSize(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(32);
    fs.readSync(fd, buf, 0, 32, 0);
    // PNG signature (8 bytes)
    const sig = buf.slice(0, 8);
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!sig.equals(pngSig)) throw new Error('Not a PNG file');
    // Next 4 bytes: IHDR length (big-endian), next 4: chunk type
    const ihdrType = buf.slice(12, 16).toString('ascii');
    if (ihdrType !== 'IHDR') throw new Error('IHDR not found where expected');
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } finally {
    fs.closeSync(fd);
  }
}

function makeAsepriteJson(imageBasename, w, h) {
  return {
    frames: [
      {
        filename: imageBasename.replace(/\.png$/i, '.aseprite'),
        frame: { x: 0, y: 0, w, h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w, h },
        sourceSize: { w, h },
        duration: 100,
      },
    ],
    meta: {
      app: 'https://www.aseprite.org/',
      version: 'generated-by-export-aseprite-from-png',
      image: imageBasename,
      format: 'RGBA8888',
      size: { w, h },
      scale: '1',
    },
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(outPath, data) {
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`[export-aseprite] Wrote ${outPath}`);
}

// Config entries: use workspace-relative paths
const root = process.cwd();
const entries = [
  {
    name: 'autoCannon',
    png: path.join(
      root,
      'src/client/public/assets/Void_MainShip/Main Ship/Main Ship - Weapons/PNGs/Main Ship - Weapons - Auto Cannon.png'
    ),
    outPng: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon.png'),
    outJson: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon.json'),
  },
  {
    name: 'autoCannonProjectile',
    png: path.join(
      root,
      'src/client/public/assets/Void_MainShip/Main ship weapons/PNGs/Main ship weapon - Projectile - Auto cannon bullet.png'
    ),
    outPng: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon_projectile.png'),
    outJson: path.join(root, 'src/client/public/assets/Void_MainShip/export/auto_cannon_projectile.json'),
  },
];

let failures = 0;
for (const e of entries) {
  try {
    if (!fs.existsSync(e.png)) {
      console.warn(`[export-aseprite] PNG not found: ${e.png} (skipping)`);
      failures++;
      continue;
    }
    const { width, height } = getPngSize(e.png);
    // Ensure export PNG exists with normalized name expected by LoadingScene
    ensureDir(path.dirname(e.outPng));
    fs.copyFileSync(e.png, e.outPng);
    console.log(`[export-aseprite] Copied ${e.png} -> ${e.outPng}`);
    // JSON should reference the exported PNG basename
    const json = makeAsepriteJson(path.basename(e.outPng), width, height);
    writeJson(e.outJson, json);
  } catch (err) {
    console.error(`[export-aseprite] Failed for ${e.name}:`, err);
    failures++;
  }
}

if (failures > 0) {
  console.warn(`[export-aseprite] Completed with ${failures} issue(s).`);
  process.exit(0);
} else {
  console.log('[export-aseprite] All done.');
}
