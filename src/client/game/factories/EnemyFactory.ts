import * as Phaser from 'phaser';
import { Enemy, EnemyType } from '../entities/Enemy';
import { Fighter } from '../entities/enemies/Fighter';
import { ScoutInterceptor } from '../entities/enemies/ScoutInterceptor';
import { ArmoredCruiser } from '../entities/enemies/ArmoredCruiser';
import { SeekerDrone } from '../entities/enemies/SeekerDrone';
import { EliteGunship } from '../entities/enemies/EliteGunship';

/**
 * Factory class for creating different enemy types
 */
export class EnemyFactory {
  /**
   * Create a new enemy of specified type
   * @param scene - The scene to add the enemy to
   * @param type - The type of enemy to create
   * @param x - X position
   * @param y - Y position
   * @returns The created enemy
   */
  static createEnemy(scene: Phaser.Scene, type: EnemyType, x: number, y: number): Enemy {
    console.log(`[EnemyFactory] Creating enemy of type ${EnemyType[type]} at (${x}, ${y})`);

    switch (type) {
      case EnemyType.SCOUT:
        return new ScoutInterceptor(scene, x, y);

      case EnemyType.CRUISER:
        return new ArmoredCruiser(scene, x, y);

      case EnemyType.SEEKER:
        return new SeekerDrone(scene, x, y);

      case EnemyType.GUNSHIP:
        return new EliteGunship(scene, x, y);

      case EnemyType.FIGHTER:
      default:
        return new Fighter(scene, x, y);
    }
  }

  /**
   * Determine enemy type based on difficulty level and random chance
   * @param difficulty - Current difficulty level (1-10)
   * @returns The selected enemy type
   */
  static determineEnemyType(difficulty: number): EnemyType {
    // Generate a random number between 1 and 100
    const roll = Phaser.Math.Between(1, 100);

    // Higher difficulties introduce more enemy types
    // Each type has a chance of appearing based on difficulty

    // Elite Gunship (appears at difficulty 5+)
    if (difficulty >= 5 && roll > 85) {
      return EnemyType.GUNSHIP;
    }

    // Seeker Drone (appears at difficulty 4+)
    if (difficulty >= 4 && roll > 70) {
      return EnemyType.SEEKER;
    }

    // Armored Cruiser (appears at difficulty 3+)
    if (difficulty >= 3 && roll > 60) {
      return EnemyType.CRUISER;
    }

    // Scout Interceptor (appears at difficulty 2+)
    if (difficulty >= 2 && roll > 40) {
      return EnemyType.SCOUT;
    }

    // Default to basic fighter
    return EnemyType.FIGHTER;
  }
}
