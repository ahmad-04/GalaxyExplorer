import * as Phaser from 'phaser';
import { EnemyType } from '../entities/Enemy';
import { EnemyFactory } from '../factories/EnemyFactory';
import { EnemyPlaceholders } from '../factories/EnemyPlaceholders';

/**
 * EnemyTest - A simple test scene to verify enemy types are working correctly
 * This is a standalone scene for testing our enemy classes
 */
export class EnemyTest extends Phaser.Scene {
  private enemies!: Phaser.Physics.Arcade.Group;
  private infoText!: Phaser.GameObjects.Text;
  private difficultyLevel: number = 1;
  private difficultyText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'EnemyTest' });
  }

  preload(): void {
    // Any needed assets will load from placeholder graphics
  }

  create(): void {
    // Background color
    this.cameras.main.setBackgroundColor(0x000033);

    // Create placeholder graphics for enemy types
    EnemyPlaceholders.createPlaceholders(this);

    // Create enemy bullet texture if it doesn't exist
    if (!this.textures.exists('enemy_bullet')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xff0000, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('enemy_bullet', 8, 8);
      graphics.destroy();
    }

    // Enemies group
    this.enemies = this.physics.add.group();

    // Title
    this.add
      .text(this.scale.width / 2, 20, 'ENEMY TYPE TEST', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);

    // Info text
    this.infoText = this.add.text(
      10,
      50,
      'Click buttons to spawn different enemy types.\nTest their behavior and appearance.',
      { fontSize: '16px', color: '#cccccc' }
    );

    // Difficulty controls
    this.difficultyText = this.add.text(
      10,
      this.scale.height - 40,
      `Difficulty: ${this.difficultyLevel}`,
      { fontSize: '16px', color: '#ffffff' }
    );

    // Difficulty buttons
    const decreaseDifficulty = this.add
      .text(160, this.scale.height - 40, '[-]', { fontSize: '16px', color: '#ffffff' })
      .setInteractive();

    const increaseDifficulty = this.add
      .text(190, this.scale.height - 40, '[+]', { fontSize: '16px', color: '#ffffff' })
      .setInteractive();

    // Event handlers for difficulty buttons
    decreaseDifficulty.on('pointerdown', () => {
      if (this.difficultyLevel > 1) {
        this.difficultyLevel--;
        this.updateDifficultyText();
      }
    });

    increaseDifficulty.on('pointerdown', () => {
      if (this.difficultyLevel < 10) {
        this.difficultyLevel++;
        this.updateDifficultyText();
      }
    });

    // Create buttons for each enemy type
    this.createEnemyButton(EnemyType.FIGHTER, 'Fighter', 100);
    this.createEnemyButton(EnemyType.SCOUT, 'Scout', 140);
    this.createEnemyButton(EnemyType.CRUISER, 'Cruiser', 180);
    this.createEnemyButton(EnemyType.SEEKER, 'Seeker', 220);
    this.createEnemyButton(EnemyType.GUNSHIP, 'Gunship', 260);

    // Create a random spawn button
    this.createRandomButton(300);

    // Create a clear button
    const clearButton = this.add
      .text(this.scale.width - 60, this.scale.height - 40, 'CLEAR', {
        fontSize: '16px',
        color: '#ff5555',
      })
      .setInteractive();

    clearButton.on('pointerdown', () => {
      this.enemies.clear(true, true);
      this.infoText.setText('Cleared all enemies.');
    });
  }

  /**
   * Create a button to spawn a specific enemy type
   */
  private createEnemyButton(type: EnemyType, label: string, y: number): void {
    const button = this.add
      .text(this.scale.width - 100, y, `Spawn ${label}`, { fontSize: '16px', color: '#00ff00' })
      .setInteractive();

    button.on('pointerdown', () => {
      const x = Phaser.Math.Between(100, this.scale.width - 100);
      const y = 100;

      // Create the enemy
      const enemy = EnemyFactory.createEnemy(this, type, x, y);

      // Add to group
      this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);

      // Call appropriate setup method based on type
      if ('setupMovement' in enemy) {
        const speedMultiplier = 1;
        (enemy as unknown as { setupMovement: (sm: number, d: number) => void }).setupMovement(
          speedMultiplier,
          this.difficultyLevel
        );
      }

      // Update info text
      this.infoText.setText(`Spawned ${EnemyType[type]} at (${x}, ${y})`);
    });
  }

  /**
   * Create a button to spawn a random enemy based on current difficulty
   */
  private createRandomButton(y: number): void {
    const button = this.add
      .text(this.scale.width - 100, y, 'Random Enemy', { fontSize: '16px', color: '#ffff00' })
      .setInteractive();

    button.on('pointerdown', () => {
      const x = Phaser.Math.Between(100, this.scale.width - 100);
      const y = 100;

      // Determine enemy type based on difficulty
      const type = EnemyFactory.determineEnemyType(this.difficultyLevel);

      // Create the enemy
      const enemy = EnemyFactory.createEnemy(this, type, x, y);

      // Add to group
      this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);

      // Call appropriate setup method based on type
      if ('setupMovement' in enemy) {
        const speedMultiplier = 1;
        (enemy as unknown as { setupMovement: (sm: number, d: number) => void }).setupMovement(
          speedMultiplier,
          this.difficultyLevel
        );
      }

      // Update info text
      this.infoText.setText(`Spawned random enemy: ${EnemyType[type]} at (${x}, ${y})`);
    });
  }

  /**
   * Update the difficulty text display
   */
  private updateDifficultyText(): void {
    this.difficultyText.setText(`Difficulty: ${this.difficultyLevel}`);
  }

  override update(time: number, delta: number): void {
    // Update all enemies
    this.enemies.getChildren().forEach((enemySprite) => {
      // Call the enemy's update method if it exists
      const updateMethod = (enemySprite as unknown as { update?: (t: number, d: number) => void })
        .update;
      if (updateMethod) {
        updateMethod.call(enemySprite, time, delta);
      }
    });
  }
}
