export type AnimKeys = Partial<{
  idle: string;
  move: string;
  shoot: string;
  hit: string;
  death: string;
}>;

export type MovementPattern =
  | { type: 'straight'; speed: number }
  | { type: 'sine'; speed: number; amplitude: number; frequency: number }
  // Optional topY: y-coordinate where the unit should stop descending and hover
  | { type: 'hover'; speed: number; topY?: number }
  | { type: 'dive'; speed: number; angleDeg?: number };

export type FirePattern =
  | { type: 'none' }
  | {
      type: 'interval';
      intervalMs: number;
      burst?: number;
      spreadDeg?: number;
      aimed?: boolean;
      totalShots?: number;
      startDelayMs?: number;
    }
  | { type: 'torpedo'; intervalMs: number; homing: { turnRate: number; accel: number } }
  | { type: 'bomb'; intervalMs: number; gravity: number };

export type ProjectileRef = {
  key: string;
  speed: number;
  lifetimeMs: number;
  scale?: number;
  tint?: number;
  damage?: number;
  behavior?: 'straight' | 'aimed' | 'spread' | 'homing' | 'bomb';
};

export type EnemyDefinition = {
  key: string; // texture key for base sprite
  hp: number;
  speed: number;
  score: number;
  bodyRadius?: number;
  scale?: number; // optional scale factor for sprite size
  angleDeg?: number; // optional initial rotation in degrees
  anim: AnimKeys;
  muzzleOffsets?: Array<{ x: number; y: number }>;
  movement: MovementPattern;
  fire: FirePattern;
  projectile?: ProjectileRef;
  // Optional light-weight script for special behaviors (e.g., torpedo burst at top)
  script?: {
    type: 'burstAtTop';
    topY: number;
    shots: number;
    intervalMs: number;
    afterSpeed: number;
  };
  // Optional: after finishing interval shots, retreat upward off-screen
  retreatAfterShots?: { speed: number; delayMs?: number };
};

export const ENEMIES: Record<string, EnemyDefinition> = {
  scout: {
    key: 'kla_scout',
    hp: 1,
    speed: 90,
    score: 20,
    bodyRadius: 10, // Smaller hitbox for easier dodging
    scale: 1.25,
    // Face downward like other Kla'ed fighters
    angleDeg: 180,
    anim: {
      move: 'kla_scout_Move',
      idle: 'kla_scout_Idle',
      shoot: 'kla_scout_Shoot',
      death: 'kla_scout_death_Death',
    },
    // Stronger curved path: wider zig-zag and a touch faster oscillation
    movement: { type: 'sine', speed: 90, amplitude: 34, frequency: 0.9 },
    fire: { type: 'none' },
    // No projectile for scout (non-firing unit)
  },
  fighter: {
    key: 'kla_fighter',
    hp: 1,
    speed: 110,
    score: 35,
    bodyRadius: 14, // Smaller hitbox
    scale: 2,
    angleDeg: 180,
    anim: {
      move: 'kla_fighter_Move',
      idle: 'kla_fighter_Idle',
      shoot: 'kla_fighter_Shoot',
      death: 'kla_fighter_death_Death',
    },
    muzzleOffsets: [
      { x: -10, y: 12 },
      { x: 10, y: 12 },
    ],
    movement: { type: 'straight', speed: 110 },
    // Fire exactly 3 shots straight down (no aiming), using kla_bullet animation
    fire: { type: 'interval', intervalMs: 700, burst: 1, aimed: false, totalShots: 3 },
    projectile: {
      key: 'kla_bullet',
      speed: 300,
      lifetimeMs: 2500,
      behavior: 'straight',
      damage: 1,
      scale: 2,
      tint: 0xffff00,
    },
  },
  torpedo: {
    key: 'kla_torpedo_ship',
    hp: 2,
    speed: 80,
    score: 60,
    bodyRadius: 15, // Smaller hitbox
    scale: 1.5,
    angleDeg: 180,
    anim: {
      move: 'kla_torpedo_ship_Move',
      idle: 'kla_torpedo_ship_Idle',
      shoot: 'kla_torpedo_ship_Shoot',
      death: 'kla_torpedo_death_Death',
    },
    muzzleOffsets: [{ x: 0, y: 16 }],
    movement: { type: 'hover', speed: 60 },
    // Scripted: move to top, fire 3 aimed torpedoes, then exit straight down
    // Fire type 'interval' is placeholder to enable weapon overlay; actual firing is script-controlled
    fire: { type: 'interval', intervalMs: 999999, burst: 1, aimed: true },
    projectile: {
      key: 'kla_torpedo',
      speed: 160,
      lifetimeMs: 8000,
      behavior: 'aimed',
      damage: 3,
      scale: 1.5,
    },
    script: { type: 'burstAtTop', topY: 72, shots: 6, intervalMs: 1000, afterSpeed: 160 },
  },
  bomber: {
    key: 'kla_bomber',
    hp: 3,
    speed: 70,
    score: 80,
    bodyRadius: 18, // Smaller hitbox
    scale: 2,
    angleDeg: 180,
    anim: {
      move: 'kla_bomber_Move',
      idle: 'kla_bomber_Idle',
      shoot: 'kla_bomber_Shoot',
      death: 'kla_bomber_death_Death',
    },
    muzzleOffsets: [{ x: 0, y: 16 }],
    movement: { type: 'straight', speed: 70 },
    // Fire exactly 3 big bullets straight down, with a short pre-shot delay, then retreat upward
    fire: {
      type: 'interval',
      intervalMs: 800,
      burst: 1,
      aimed: false,
      totalShots: 3,
    },
    projectile: {
      key: 'kla_big_bullet',
      speed: 260,
      lifetimeMs: 3000,
      behavior: 'straight',
      damage: 2,
      scale: 1.5,
    },
    // Add a longer hold after the last shot before retreat starts
    retreatAfterShots: { speed: 140, delayMs: 1200 },
  },
  frigate: {
    key: 'kla_frigate',
    hp: 10,
    speed: 60,
    score: 200,
    bodyRadius: 28, // Smaller hitbox for large ship
    scale: 3,
    angleDeg: 180,
    anim: {
      move: 'kla_frigate_Move',
      idle: 'kla_frigate_Idle',
      shoot: 'kla_frigate_Shoot',
      death: 'kla_frigate_death_Death',
    },
    // Frame-synced muzzle offsets:
    // Original sprite is 64x64, center at 32,32
    // Frame 2: outer guns at pixels 16.5,28 and 46.5,28
    // Frame 4: center guns should be symmetric around center
    // With 180° rotation and 3x scale, we need to flip Y and scale offsets
    muzzleOffsets: [
      { x: -46.5, y: 12 }, // Outer gun left: (16.5-32)*3 = -46.5, (32-28)*3 = 12
      { x: 43.5, y: 12 }, // Outer gun right: (46.5-32)*3 = 43.5, (32-28)*3 = 12
      { x: -7.5, y: 27 }, // Center gun left: slightly left of center, y=27
      { x: 7.5, y: 27 }, // Center gun right: slightly right of center, y=27
    ],
    // Scripted: descend from above to Y=90 and hover there, firing continuously
    movement: { type: 'hover', speed: 60 },
    // Slower firing: 3 second intervals with 1.5 second start delay
    // Fire type 'interval' is placeholder to enable weapon overlay; actual firing is script-controlled
    fire: {
      type: 'interval',
      intervalMs: 3000,
      burst: 1,
      aimed: false,
      startDelayMs: 1500,
    },
    projectile: {
      key: 'kla_big_bullet',
      speed: 200,
      lifetimeMs: 3000,
      behavior: 'straight',
      damage: 2,
      scale: 1.5,
    },
    // Descend to Y=90, hover there permanently and fire indefinitely (no self-destruct)
    script: { type: 'burstAtTop', topY: 90, shots: 999, intervalMs: 3000, afterSpeed: 0 },
  },
  // battlecruise removed
};
