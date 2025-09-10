import * as Phaser from 'phaser';

/**
 * Creates placeholder graphics for different enemy types
 * to distinguish them visually during development
 */
export class EnemyPlaceholders {
  /**
   * Generate placeholder graphics for all enemy types
   * @param scene - The scene to add the textures to
   */
  static createPlaceholders(scene: Phaser.Scene): void {
    console.log('[EnemyPlaceholders] Creating placeholder textures for enemy types');

    // Create a placeholder for each enemy type
    this.createFighterGraphics(scene);
    this.createScoutGraphics(scene);
    this.createCruiserGraphics(scene);
    this.createSeekerGraphics(scene);
    this.createGunshipGraphics(scene);

    // Create placeholder for enemy bullets
    this.createEnemyBulletGraphics(scene);
  }

  /**
   * Create a basic fighter placeholder (standard enemy)
   * @param scene - The scene to add the texture to
   */
  private static createFighterGraphics(scene: Phaser.Scene): void {
    if (scene.textures.exists('enemy_fighter')) return;

    const graphics = scene.add.graphics();

    // Red triangle (basic enemy)
    graphics.fillStyle(0xff3333, 1);
    graphics.beginPath();
    graphics.moveTo(16, 0);
    graphics.lineTo(32, 32);
    graphics.lineTo(0, 32);
    graphics.closePath();
    graphics.fillPath();

    // Create the texture
    graphics.generateTexture('enemy_fighter', 32, 32);
    graphics.destroy();

    console.log('[EnemyPlaceholders] Created fighter placeholder texture');
  }

  /**
   * Create a scout placeholder (fast, agile enemy)
   * @param scene - The scene to add the texture to
   */
  private static createScoutGraphics(scene: Phaser.Scene): void {
    if (scene.textures.exists('enemy_scout')) return;

    const graphics = scene.add.graphics();

    // Cyan diamond shape (scout)
    graphics.fillStyle(0x00ffff, 1);
    graphics.beginPath();
    graphics.moveTo(16, 0);
    graphics.lineTo(28, 16);
    graphics.lineTo(16, 32);
    graphics.lineTo(4, 16);
    graphics.closePath();
    graphics.fillPath();

    // Add "thruster" details
    graphics.fillStyle(0xffff00, 1);
    graphics.fillRect(14, 28, 4, 8);

    // Create the texture
    graphics.generateTexture('enemy_scout', 32, 36);
    graphics.destroy();

    console.log('[EnemyPlaceholders] Created scout placeholder texture');
  }

  /**
   * Create a cruiser placeholder (tanky enemy)
   * @param scene - The scene to add the texture to
   */
  private static createCruiserGraphics(scene: Phaser.Scene): void {
    if (scene.textures.exists('enemy_cruiser')) return;

    const graphics = scene.add.graphics();

    // Orange rectangle with armor details (cruiser)
    graphics.fillStyle(0xff6600, 1);
    graphics.fillRect(5, 5, 30, 30);

    // Add armor details
    graphics.lineStyle(3, 0xaa4400);
    graphics.moveTo(10, 10);
    graphics.lineTo(30, 10);
    graphics.moveTo(10, 30);
    graphics.lineTo(30, 30);

    // Create the texture
    graphics.generateTexture('enemy_cruiser', 40, 40);
    graphics.destroy();

    console.log('[EnemyPlaceholders] Created cruiser placeholder texture');
  }

  /**
   * Create a seeker placeholder (tracking enemy)
   * @param scene - The scene to add the texture to
   */
  private static createSeekerGraphics(scene: Phaser.Scene): void {
    if (scene.textures.exists('enemy_seeker')) return;

    const graphics = scene.add.graphics();

    // Red circle with "targeting" elements
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(16, 16, 12);

    // Targeting crosshairs
    graphics.lineStyle(2, 0xffffff);
    graphics.strokeCircle(16, 16, 12);
    graphics.moveTo(16, 6);
    graphics.lineTo(16, 26);
    graphics.moveTo(6, 16);
    graphics.lineTo(26, 16);

    // Create the texture
    graphics.generateTexture('enemy_seeker', 32, 32);
    graphics.destroy();

    console.log('[EnemyPlaceholders] Created seeker placeholder texture');
  }

  /**
   * Create a gunship placeholder (shooting enemy)
   * @param scene - The scene to add the texture to
   */
  private static createGunshipGraphics(scene: Phaser.Scene): void {
    if (scene.textures.exists('enemy_gunship')) return;

    const graphics = scene.add.graphics();

    // Purple square (gunship base)
    graphics.fillStyle(0x8800ff, 1);
    graphics.fillRect(5, 5, 30, 30);

    // Add "gun" details
    graphics.fillStyle(0x444444, 1);
    graphics.fillRect(15, 0, 2, 12); // Left gun
    graphics.fillRect(23, 0, 2, 12); // Right gun

    // Create the texture
    graphics.generateTexture('enemy_gunship', 40, 40);
    graphics.destroy();

    console.log('[EnemyPlaceholders] Created gunship placeholder texture');
  }

  /**
   * Create a placeholder for enemy bullets
   * @param scene - The scene to add the texture to
   */
  private static createEnemyBulletGraphics(scene: Phaser.Scene): void {
    if (scene.textures.exists('enemy_bullet')) return;

    const graphics = scene.add.graphics();

    // Red bullet
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(4, 4, 4);

    // Create the texture
    graphics.generateTexture('enemy_bullet', 8, 8);
    graphics.destroy();

    console.log('[EnemyPlaceholders] Created enemy bullet placeholder texture');
  }
}
