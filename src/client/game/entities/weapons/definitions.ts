import * as Phaser from 'phaser';

export type MuzzleOffset = { x: number; y: number };

export interface WeaponDefinition {
  id: string;
  displayName: string;
  /** Optional sprite key for a weapon overlay mounted to the ship (Aseprite key). */
  weaponSpriteKey?: string;
  /** Projectile texture key (Aseprite key preferred). */
  projectileKey: string;
  fireRateMs: number;
  projectileSpeed: number;
  projectileLifetimeMs: number;
  muzzleOffsets: MuzzleOffset[];
  projectileScale?: number;
  projectileTint?: number;
  sfxKey?: string;
}

export const AUTO_CANNON: WeaponDefinition = {
  id: 'AUTO_CANNON',
  displayName: 'Auto Cannon',
  // Expect aseprite-exported spritesheets at /assets/Void_MainShip/export/*
  // If missing, code will gracefully fall back to existing bullet texture.
  weaponSpriteKey: 'autoCannon',
  projectileKey: 'autoCannonProjectile',
  fireRateMs: 220,
  projectileSpeed: 750,
  projectileLifetimeMs: 1400,
  // Two barrel positions (left/right). Tune to your sprite art; these assume a 48x48 base scaled to 128x.
  muzzleOffsets: [
    { x: -8, y: -22 },
    { x: 8, y: -22 },
  ],
  projectileScale: 1.0,
};

// Utility: resolve a texture key safely, preferring aseprite keys and falling back to a default
export function resolveTexture(scene: Phaser.Scene, preferredKey: string, fallbackKey: string) {
  try {
    if (scene.textures.exists(preferredKey)) return preferredKey;
  } catch {
    // ignore
  }
  return fallbackKey;
}
