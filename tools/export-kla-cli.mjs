#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Aseprite CLI detection
const aseprite = process.env.ASEPRITE_PATH || 'aseprite';
function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${cmd} exited with code ${res.status}`);
}

// Root for Kla'ed assets
const ROOT = path.resolve('src/client/public/assets/Kla\'ed');
const OUT = path.join(ROOT, 'export');

const sources = [
  // Base ships
  { key: 'kla_scout', in: 'Base/Aseprite/Kla\'ed - Scout - Base.aseprite', out: 'kla_scout' },
  { key: 'kla_fighter', in: 'Base/Aseprite/Kla\'ed - Fighter - Base.aseprite', out: 'kla_fighter' },
  { key: 'kla_torpedo_ship', in: 'Base/Aseprite/Kla\'ed - Torpedo Ship - Base.aseprite', out: 'kla_torpedo_ship' },
  { key: 'kla_bomber', in: 'Base/Aseprite/Kla\'ed - Bomber - Base.aseprite', out: 'kla_bomber' },
  { key: 'kla_frigate', in: 'Base/Aseprite/Kla\'ed - Frigate - Base.aseprite', out: 'kla_frigate' },
  { key: 'kla_battlecruise', in: 'Base/Aseprite/Kla\'ed - Battlecruiser - Base.aseprite', out: 'kla_battlecruise' },
  // Engines (optional overlays)
  { key: 'kla_scout_engine', in: 'Engine/Aseprite/Kla\'ed - Scout - Engine.aseprite', out: 'kla_scout_engine' },
  { key: 'kla_fighter_engine', in: 'Engine/Aseprite/Kla\'ed - Fighter - Engine.aseprite', out: 'kla_fighter_engine' },
  { key: 'kla_torpedo_engine', in: 'Engine/Aseprite/Kla\'ed - Torpedo Ship - Engine.aseprite', out: 'kla_torpedo_engine' },
  { key: 'kla_bomber_engine', in: 'Engine/Aseprite/Kla\'ed - Bomber - Engine.aseprite', out: 'kla_bomber_engine' },
  { key: 'kla_frigate_engine', in: 'Engine/Aseprite/Kla\'ed - Frigate - Engine.aseprite', out: 'kla_frigate_engine' },
  { key: 'kla_battlecruise_engine', in: 'Engine/Aseprite/Kla\'ed - Battlecruiser - Engine.aseprite', out: 'kla_battlecruise_engine' },
  // Weapons overlays (optional)
  { key: 'kla_scout_weapons', in: 'Weapons/Aseprite/Kla\'ed - Scout - Weapons.aseprite', out: 'kla_scout_weapons' },
  { key: 'kla_fighter_weapons', in: 'Weapons/Aseprite/Kla\'ed - Fighter - Weapons.aseprite', out: 'kla_fighter_weapons' },
  { key: 'kla_torpedo_weapons', in: 'Weapons/Aseprite/Kla\'ed - Torpedo Ship - Weapons.aseprite', out: 'kla_torpedo_weapons' },
  { key: 'kla_frigate_weapons', in: 'Weapons/Aseprite/Kla\'ed - Frigate - Weapons.aseprite', out: 'kla_frigate_weapons' },
  { key: 'kla_battlecruise_weapons', in: 'Weapons/Aseprite/Kla\'ed - Battlecruiser - Weapons.aseprite', out: 'kla_battlecruise_weapons' },
  // Projectiles
  { key: 'kla_bullet', in: 'Projectiles/Aseprite/Kla\'ed - Bullet.aseprite', out: 'kla_bullet' },
  { key: 'kla_big_bullet', in: 'Projectiles/Aseprite/Kla\'ed - Big Bullet.aseprite', out: 'kla_big_bullet' },
  { key: 'kla_torpedo', in: 'Projectiles/Aseprite/Kla\'ed - Torpedo.aseprite', out: 'kla_torpedo' },
  { key: 'kla_ray', in: 'Projectiles/Aseprite/Kla\'ed - Ray.aseprite', out: 'kla_ray' },
  { key: 'kla_wave', in: 'Projectiles/Aseprite/Kla\'ed - Wave.aseprite', out: 'kla_wave' },
  // Destruction (death anims)
  { key: 'kla_scout_death', in: 'Destruction/Aseprite/Kla\'ed - Scout - Destruction.aseprite', out: 'kla_scout_death' },
  { key: 'kla_fighter_death', in: 'Destruction/Aseprite/Kla\'ed - Fighter - Destruction.aseprite', out: 'kla_fighter_death' },
  { key: 'kla_torpedo_death', in: 'Destruction/Aseprite/Kla\'ed - Torpedo Ship - Destruction.aseprite', out: 'kla_torpedo_death' },
  { key: 'kla_bomber_death', in: 'Destruction/Aseprite/Kla\'ed - Bomber - Destruction.aseprite', out: 'kla_bomber_death' },
  { key: 'kla_frigate_death', in: 'Destruction/Aseprite/Kla\'ed - Frigate - Destruction.aseprite', out: 'kla_frigate_death' },
  { key: 'kla_battlecruise_death', in: 'Destruction/Aseprite/Kla\'ed - Battlecruiser - Destruction.aseprite', out: 'kla_battlecruise_death' },
];

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
if (!existsSync(OUT)) {
  // Create export dir lazily (Windows-safe)
  try { run(process.platform === 'win32' ? 'cmd' : 'mkdir', process.platform === 'win32' ? ['/c','mkdir', OUT] : [OUT], ROOT); } catch {}
}

for (const s of sources) {
  if (only && s.key !== only) continue;
  const inPath = path.join(ROOT, s.in);
  if (!existsSync(inPath)) continue;
  const outPng = path.join(OUT, `${s.out}.png`);
  const outJson = path.join(OUT, `${s.out}.json`);
  const args = [
    '--batch', inPath,
    '--sheet', outPng,
    '--data', outJson,
    '--sheet-pack', '--list-tags', '--format', 'json-array'
  ];
  console.log(`[export-kla] Exporting ${s.key}`);
  run(aseprite, args, ROOT);
}

console.log('[export-kla] Done.');
