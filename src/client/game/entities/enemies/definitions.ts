export type AnimKeys = Partial<{ idle: string; move: string; shoot: string; hit: string; death: string }>;

export type MovementPattern =
  | { type: 'straight'; speed: number }
  | { type: 'sine'; speed: number; amplitude: number; frequency: number }
  | { type: 'hover'; speed: number }
  | { type: 'dive'; speed: number; angleDeg?: number };

export type FirePattern =
  | { type: 'none' }
  | { type: 'interval'; intervalMs: number; burst?: number; spreadDeg?: number; aimed?: boolean }
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
  anim: AnimKeys;
  muzzleOffsets?: Array<{ x: number; y: number }>;
  movement: MovementPattern;
  fire: FirePattern;
  projectile?: ProjectileRef;
};

export const ENEMIES: Record<string, EnemyDefinition> = {
  scout: {
    key: 'kla_scout',
    hp: 1,
    speed: 120,
    score: 20,
    bodyRadius: 14,
    anim: { move: 'kla_scout_Move', idle: 'kla_scout_Idle', shoot: 'kla_scout_Shoot', death: 'kla_scout_death_Death' },
    movement: { type: 'sine', speed: 120, amplitude: 18, frequency: 2.2 },
    fire: { type: 'none' },
    // No projectile for scout (non-firing unit)
  },
  fighter: {
    key: 'kla_fighter',
    hp: 1,
    speed: 110,
    score: 35,
    bodyRadius: 18,
    anim: { move: 'kla_fighter_Move', idle: 'kla_fighter_Idle', shoot: 'kla_fighter_Shoot', death: 'kla_fighter_death_Death' },
    muzzleOffsets: [{ x: -10, y: 12 }, { x: 10, y: 12 }],
    movement: { type: 'straight', speed: 110 },
    fire: { type: 'none' },
    // No projectile while disabled
  },
  torpedo: {
    key: 'kla_torpedo_ship',
    hp: 28,
    speed: 80,
    score: 60,
    bodyRadius: 22,
    anim: { move: 'kla_torpedo_ship_Move', idle: 'kla_torpedo_ship_Idle', shoot: 'kla_torpedo_ship_Shoot', death: 'kla_torpedo_death_Death' },
    movement: { type: 'hover', speed: 60 },
    fire: { type: 'torpedo', intervalMs: 2600, homing: { turnRate: 0.05, accel: 12 } },
    projectile: { key: 'kla_torpedo', speed: 160, lifetimeMs: 5000, behavior: 'homing', damage: 3 },
  },
  bomber: {
    key: 'kla_bomber',
    hp: 40,
    speed: 70,
    score: 80,
    bodyRadius: 26,
    anim: { move: 'kla_bomber_Move', idle: 'kla_bomber_Idle', shoot: 'kla_bomber_Shoot', death: 'kla_bomber_death_Death' },
    movement: { type: 'straight', speed: 70 },
    fire: { type: 'bomb', intervalMs: 1800, gravity: 300 },
    projectile: { key: 'kla_bomb', speed: 60, lifetimeMs: 4000, behavior: 'bomb', damage: 2 },
  },
  frigate: {
    key: 'kla_frigate',
    hp: 120,
    speed: 60,
    score: 200,
    bodyRadius: 32,
    anim: { move: 'kla_frigate_Move', idle: 'kla_frigate_Idle', shoot: 'kla_frigate_Shoot', death: 'kla_frigate_death_Death' },
    muzzleOffsets: [{ x: -18, y: 20 }, { x: 18, y: 20 }, { x: 0, y: 26 }],
    movement: { type: 'hover', speed: 50 },
    fire: { type: 'interval', intervalMs: 900, burst: 2, spreadDeg: 12, aimed: true },
    projectile: { key: 'kla_big_bullet', speed: 280, lifetimeMs: 2500, behavior: 'aimed', damage: 2 },
  },
  battlecruise: {
    key: 'kla_battlecruise',
    hp: 500,
    speed: 35,
    score: 1000,
    bodyRadius: 40,
    anim: { move: 'kla_battlecruise_Move', idle: 'kla_battlecruise_Idle', shoot: 'kla_battlecruise_Shoot', death: 'kla_battlecruise_death_Death' },
    muzzleOffsets: [{ x: -26, y: 28 }, { x: 26, y: 28 }, { x: -14, y: 36 }, { x: 14, y: 36 }],
    movement: { type: 'hover', speed: 30 },
    fire: { type: 'interval', intervalMs: 700, burst: 4, spreadDeg: 24 },
    projectile: { key: 'kla_big_bullet', speed: 300, lifetimeMs: 3000, behavior: 'spread', damage: 2 },
  },
};
