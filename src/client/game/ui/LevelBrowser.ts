/**
 * LevelBrowser.ts
 * Component for browsing and managing user-created levels
 */

import * as Phaser from 'phaser';
import { LevelMetadata } from '../../../shared/types/buildMode';
import BuildModeService from '../services/BuildModeService';

/**
 * LevelBrowser component for the Build Mode
 * Provides UI for browsing, selecting, and managing saved levels
 */
export class LevelBrowser {
  private scene: Phaser.Scene;
  private service: BuildModeService;

  // UI elements
  private container!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private levels: LevelMetadata[] = [];
  private noLevelsText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, service: BuildModeService) {
    this.scene = scene;
    this.service = service;
  }

  /**
   * Activate the level browser
   */
  activate(): void {
    console.log('[LevelBrowser] Activating level browser');

    // Create UI
    this.createUI();

    // Load levels
    this.loadLevels();
  }

  /**
   * Deactivate the level browser
   */
  deactivate(): void {
    console.log('[LevelBrowser] Deactivating level browser');

    // Clean up UI
    if (this.container) {
      this.container.destroy();
    }
  }

  /**
   * Update function called by the scene
   * @param time Current time
   * @param delta Time since last update
   */
  update(_time: number, _delta: number): void {
    // Nothing to update in the browser view
  }

  /**
   * Create the UI for the level browser
   */
  private createUI(): void {
    // Main container
    this.container = this.scene.add.container(0, 60);

    // Background
    const bg = this.scene.add.rectangle(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height - 60,
      0x222222
    );
    bg.setOrigin(0, 0);
    this.container.add(bg);

    // Header
    const headerBg = this.scene.add.rectangle(0, 0, this.scene.scale.width, 60, 0x333333);
    headerBg.setOrigin(0, 0);

    const titleText = this.scene.add
      .text(20, 30, 'LEVEL BROWSER', {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.container.add([headerBg, titleText]);

    // Back button
    const backButton = this.scene.add
      .text(this.scene.scale.width - 20, 30, 'BACK TO MENU', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 0.5);
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => {
      this.scene.scene.start('MainMenu');
    });
    this.container.add(backButton);

    // Create new level button
    const newLevelButton = this.scene.add
      .text(this.scene.scale.width / 2, 30, 'CREATE NEW LEVEL', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 0.5);
    newLevelButton.setInteractive({ useHandCursor: true });
    newLevelButton.on('pointerdown', () => {
      this.scene.scene.start('BuildModeScene');
    });
    this.container.add(newLevelButton);

    // Create scroll container for levels
    this.scrollContainer = this.scene.add.container(0, 80);
    this.container.add(this.scrollContainer);

    // "No levels" message (shown if no levels exist)
    this.noLevelsText = this.scene.add
      .text(
        this.scene.scale.width / 2,
        200,
        'No levels created yet.\nClick "Create New Level" to get started!',
        {
          fontSize: '20px',
          color: '#aaaaaa',
          align: 'center',
        }
      )
      .setOrigin(0.5);
    this.scrollContainer.add(this.noLevelsText);
  }

  /**
   * Load the levels from storage
   */
  private loadLevels(): void {
    // Get levels from service
    this.levels = this.service.getLevelList();

    // Clear existing level UI
    this.scrollContainer.removeAll();

    // Show appropriate UI based on whether we have levels
    if (this.levels.length === 0) {
      // Show "no levels" message
      this.noLevelsText = this.scene.add
        .text(
          this.scene.scale.width / 2,
          200,
          'No levels created yet.\nClick "Create New Level" to get started!',
          {
            fontSize: '20px',
            color: '#aaaaaa',
            align: 'center',
          }
        )
        .setOrigin(0.5);
      this.scrollContainer.add(this.noLevelsText);
    } else {
      // Create level cards
      this.levels.forEach((level, index) => {
        const y = index * 110 + 20;
        this.createLevelCard(level, 20, y);
      });
    }
  }

  /**
   * Create a card for a level
   * @param level The level metadata
   * @param x X position
   * @param y Y position
   */
  private createLevelCard(level: LevelMetadata, x: number, y: number): void {
    // Create a container for the card
    const cardContainer = this.scene.add.container(x, y);

    // Card background
    const cardWidth = this.scene.scale.width - 40;
    const cardHeight = 100;
    const cardBg = this.scene.add.rectangle(0, 0, cardWidth, cardHeight, 0x333333);
    cardBg.setOrigin(0, 0);
    cardBg.setStrokeStyle(2, 0x555555);

    // Level name
    const nameText = this.scene.add.text(10, 10, level.name, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // Author and date
    const dateText = new Date(level.lastModified).toLocaleDateString();
    const authorText = this.scene.add.text(
      10,
      40,
      `By: ${level.author} • Last modified: ${dateText}`,
      {
        fontSize: '16px',
        color: '#aaaaaa',
      }
    );

    // Difficulty
    const difficultyText = this.scene.add.text(
      10,
      70,
      `Difficulty: ${this.getDifficultyText(level.difficulty)}`,
      {
        fontSize: '16px',
        color: this.getDifficultyColor(level.difficulty),
      }
    );

    // Add edit button
    const editButton = this.scene.add
      .text(cardWidth - 180, 50, 'EDIT', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0, 0.5);
    editButton.setInteractive({ useHandCursor: true });
    editButton.on('pointerdown', () => {
      this.scene.scene.start('BuildModeScene', { levelId: level.id });
    });

    // Add play button
    const playButton = this.scene.add
      .text(cardWidth - 90, 50, 'PLAY', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#00aa00',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0, 0.5);
    playButton.setInteractive({ useHandCursor: true });
    playButton.on('pointerdown', () => {
      // Start the game with this level using StarshipScene
      this.scene.scene.start('StarshipScene', {
        customLevel: level.id,
      });
    });

    // Add everything to the card container
    cardContainer.add([cardBg, nameText, authorText, difficultyText, editButton, playButton]);

    // Make the entire card clickable to edit (except the buttons)
    cardBg.setInteractive({ useHandCursor: true });
    cardBg.on('pointerdown', () => {
      this.scene.scene.start('BuildModeScene', { levelId: level.id });
    });

    // Add to scroll container
    this.scrollContainer.add(cardContainer);
  }

  /**
   * Get text representation of difficulty level
   * @param difficulty Numeric difficulty (1-5)
   * @returns Text representation
   */
  private getDifficultyText(difficulty: number): string {
    const levels: string[] = ['Easy', 'Normal', 'Challenging', 'Hard', 'Extreme'];
    const index = Math.min(Math.max(Math.floor(difficulty) - 1, 0), levels.length - 1);
    return levels[index]!;
  }

  /**
   * Get color for difficulty level
   * @param difficulty Numeric difficulty (1-5)
   * @returns Color in hex format
   */
  private getDifficultyColor(difficulty: number): string {
    const colors: string[] = ['#00cc00', '#88cc00', '#cccc00', '#cc6600', '#cc0000'];
    const index = Math.min(Math.max(Math.floor(difficulty) - 1, 0), colors.length - 1);
    return colors[index]!;
  }
}
