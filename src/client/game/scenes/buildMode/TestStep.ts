/**
 * TestStep.ts
 * Third step in the Build Mode workflow
 * Allows the user to playtest the level they've created
 */

import * as Phaser from 'phaser';
import { BuildModeManager } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { LevelData } from '../../../../shared/types/buildMode';

// Define interface for test statistics
interface TestStatistics {
  timePlayed: number;
  enemiesDefeated: number;
  playerDeaths: number;
  powerupsCollected: number;
  score: number;
}

/**
 * Test step in the Build Mode workflow
 * Provides UI for testing the level and evaluating gameplay
 */
export class TestStep {
  private scene: Phaser.Scene;
  private manager: BuildModeManager;
  private service: BuildModeService;

  // UI elements
  private container!: Phaser.GameObjects.Container;
  private controlsContainer!: Phaser.GameObjects.Container;
  private feedbackContainer!: Phaser.GameObjects.Container;
  // Floating stop button shown while testing (overlay hidden)
  private floatingStopButton: Phaser.GameObjects.Container | undefined;

  // Test state
  private isPlaying: boolean = false;
  private testStartTime: number = 0;
  private testStats: TestStatistics = {
    timePlayed: 0,
    enemiesDefeated: 0,
    playerDeaths: 0,
    powerupsCollected: 0,
    score: 0,
  };

  // Level ID
  private levelId?: string | undefined;

  constructor(scene: Phaser.Scene, manager: BuildModeManager, service: BuildModeService) {
    this.scene = scene;
    this.manager = manager;
    this.service = service;
  }

  /**
   * Activate this step
   * @param levelId Optional level ID to load
   */
  activate(levelId?: string): void {
    console.log(`[TestStep] Activating with levelId: ${levelId || 'none'}`);

    // Store the provided level ID or get it from the manager
    this.levelId = levelId || this.manager.getCurrentLevelId();

    // Log all available levels for debugging
    const allLevels = this.service.getLevelList();
    console.log(
      '[TestStep] Available levels at activation:',
      allLevels.map((level) => ({
        id: level.id,
        name: level.name,
        lastModified: new Date(level.lastModified).toISOString(),
      }))
    );

    // Log the actual level ID we're using
    console.log(`[TestStep] Using levelId: ${this.levelId || 'none'}`);

    // Verify this ID exists in the service
    if (this.levelId) {
      const level = this.service.getLevelMetadata(this.levelId);
      if (level) {
        console.log(`[TestStep] Level verified: ${level.name} (${level.id})`);
      } else {
        console.warn(`[TestStep] Warning: Level ID ${this.levelId} not found in service metadata`);
      }
    }

    // Create the UI
    this.createUI();

    // Set up test environment
    this.setupTestEnvironment();
  }

  /**
   * Deactivate this step
   */
  deactivate(): void {
    console.log('[TestStep] Deactivating');

    // Stop testing if active
    if (this.isPlaying) {
      this.stopTest();
    }

    // Clean up UI
    if (this.container) {
      this.container.destroy();
    }
  }

  /**
   * Create the UI for this step
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

    // Create controls panel
    this.createControlsPanel();

    // Create feedback panel (hidden initially)
    this.createFeedbackPanel();

    // Add step navigation buttons
    this.createStepNavigation();
  }

  /**
   * Create the controls panel with enhanced visual design
   */
  private createControlsPanel(): void {
    // Controls container
    this.controlsContainer = this.scene.add.container(this.scene.scale.width / 2, 100);
    this.container.add(this.controlsContainer);

    // Create panel with gradient background for better depth
    const panelBg = this.scene.add.rectangle(0, 0, 400, 140, 0x222222);
    panelBg.setOrigin(0.5);
    panelBg.setStrokeStyle(2, 0x444444);

    // Add highlight line at the top for visual interest
    const highlightLine = this.scene.add.rectangle(0, -60, 400, 6, 0x0099ff);
    highlightLine.setOrigin(0.5);

    // Create a subtle inner border for depth
    const innerBorder = this.scene.add.rectangle(0, 0, 392, 132, 0x222222, 0);
    innerBorder.setOrigin(0.5);
    innerBorder.setStrokeStyle(1, 0x555555);

    // Title with enhanced typography
    const title = this.scene.add
      .text(0, -40, 'TEST YOUR LEVEL', {
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    // Add a subtitle with instructions
    const subtitle = this.scene.add
      .text(0, -15, 'Play through your level to evaluate its difficulty', {
        fontSize: '14px',
        color: '#aaaaaa',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // Create enhanced start button with visual feedback
    const startBg = this.scene.add.rectangle(-80, 20, 140, 45, 0x009900);
    startBg.setOrigin(0.5);
    startBg.setStrokeStyle(2, 0x00cc00);
    startBg.setInteractive({ useHandCursor: true });

    const startText = this.scene.add
      .text(-80, 20, 'START TEST', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Create icon for the start button
    const startIcon = this.scene.add
      .text(-115, 20, '▶', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Group start button elements
    const startButton = this.scene.add.container(-80, 20, [startBg, startText, startIcon]);
    startButton.setSize(140, 45);

    // Create enhanced stop button with visual feedback
    const stopBg = this.scene.add.rectangle(80, 20, 140, 45, 0x990000);
    stopBg.setOrigin(0.5);
    stopBg.setStrokeStyle(2, 0xcc0000);
    stopBg.setInteractive({ useHandCursor: true });

    const stopText = this.scene.add
      .text(80, 20, 'STOP TEST', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Create icon for the stop button
    const stopIcon = this.scene.add
      .text(45, 20, '■', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Group stop button elements
    const stopButton = this.scene.add.container(80, 20, [stopBg, stopText, stopIcon]);
    stopButton.setSize(140, 45);

    // Add hover effects to start button
    startBg.on('pointerover', () => {
      startBg.setFillStyle(0x00bb00);
      startBg.setStrokeStyle(2, 0x00ff00);
      this.scene.tweens.add({
        targets: startButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    startBg.on('pointerout', () => {
      startBg.setFillStyle(0x009900);
      startBg.setStrokeStyle(2, 0x00cc00);
      this.scene.tweens.add({
        targets: startButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    // Add hover effects to stop button
    stopBg.on('pointerover', () => {
      stopBg.setFillStyle(0xbb0000);
      stopBg.setStrokeStyle(2, 0xff0000);
      this.scene.tweens.add({
        targets: stopButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    stopBg.on('pointerout', () => {
      stopBg.setFillStyle(0x990000);
      stopBg.setStrokeStyle(2, 0xcc0000);
      this.scene.tweens.add({
        targets: stopButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    // Add click handlers
    startBg.on('pointerdown', () => {
      this.startTest();
    });

    stopBg.on('pointerdown', () => {
      this.stopTest();
    });

    // Add all elements to the panel
    this.controlsContainer.add([
      panelBg,
      highlightLine,
      innerBorder,
      title,
      subtitle,
      startButton,
      stopButton,
    ]);

    // Initially hide the stop button
    stopButton.setVisible(false);

    // Store references to buttons for later use
    this.controlsContainer.setData('startButton', startButton);
    this.controlsContainer.setData('stopButton', stopButton);
  }

  /**
   * Create the feedback panel with enhanced visual design
   */
  private createFeedbackPanel(): void {
    // Feedback container
    this.feedbackContainer = this.scene.add.container(this.scene.scale.width / 2, 300);
    this.container.add(this.feedbackContainer);

    // Panel background with improved styling
    const panelBg = this.scene.add.rectangle(0, 0, 550, 360, 0x222222);
    panelBg.setOrigin(0.5);
    panelBg.setStrokeStyle(2, 0x444444);
    this.feedbackContainer.add(panelBg);

    // Add highlight accent at the top
    const highlightBar = this.scene.add.rectangle(0, -170, 550, 8, 0xffcc00);
    highlightBar.setOrigin(0.5);
    this.feedbackContainer.add(highlightBar);

    // Add inner panel for depth
    const innerPanel = this.scene.add.rectangle(0, 0, 530, 340, 0x333333);
    innerPanel.setOrigin(0.5);
    innerPanel.setStrokeStyle(1, 0x555555);
    this.feedbackContainer.add(innerPanel);

    // Title with enhanced styling
    const titleBg = this.scene.add.rectangle(0, -140, 300, 40, 0x444444);
    titleBg.setOrigin(0.5);

    const title = this.scene.add
      .text(0, -140, 'TEST RESULTS', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    this.feedbackContainer.add([titleBg, title]);

    // Section for gameplay stats
    const statsSection = this.scene.add.container(0, -60);
    const statsSectionBg = this.scene.add.rectangle(0, 0, 500, 160, 0x272727, 0.7);
    statsSectionBg.setOrigin(0.5);
    statsSectionBg.setStrokeStyle(1, 0x3a3a3a);

    const statsTitle = this.scene.add
      .text(0, -70, 'GAMEPLAY STATISTICS', {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    statsSection.add([statsSectionBg, statsTitle]);
    this.feedbackContainer.add(statsSection);

    // Create enhanced stat cards
    const createStatCard = (
      icon: string,
      label: string,
      value: string,
      color: number,
      x: number,
      y: number
    ) => {
      const card = this.scene.add.container(x, y);

      // Card background
      const cardBg = this.scene.add.rectangle(0, 0, 220, 60, 0x333333);
      cardBg.setOrigin(0.5);
      cardBg.setStrokeStyle(2, color, 0.7);

      // Icon background
      const iconBg = this.scene.add.circle(-85, 0, 20, color, 0.3);

      // Icon
      const iconText = this.scene.add
        .text(-85, 0, icon, {
          fontSize: '18px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      // Label
      const labelText = this.scene.add
        .text(-60, -10, label, {
          fontSize: '14px',
          color: '#aaaaaa',
        })
        .setOrigin(0, 0.5);

      // Value with larger font
      const valueText = this.scene.add
        .text(-60, 10, value, {
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);

      // Add all elements to the card
      card.add([cardBg, iconBg, iconText, labelText, valueText]);

      // Store reference to value text for updating
      card.setData('valueText', valueText);

      return card;
    };

    // Create stat cards with icons and color coding
    const timeCard = createStatCard('⏱️', 'Time Played', '0:00', 0x3399ff, -125, -35);
    const enemiesCard = createStatCard('👾', 'Enemies Defeated', '0', 0xff5555, 125, -35);
    const deathsCard = createStatCard('💀', 'Player Deaths', '0', 0xff9900, -125, 35);
    const scoreCard = createStatCard('🏆', 'Score', '0', 0x55ff55, 125, 35);

    // Add stat cards to stats section
    statsSection.add([timeCard, enemiesCard, deathsCard, scoreCard]);

    // Difficulty assessment section
    const diffSection = this.scene.add.container(0, 100);
    const diffSectionBg = this.scene.add.rectangle(0, 0, 500, 100, 0x272727, 0.7);
    diffSectionBg.setOrigin(0.5);
    diffSectionBg.setStrokeStyle(1, 0x3a3a3a);

    const diffTitle = this.scene.add
      .text(0, -30, 'DIFFICULTY ASSESSMENT', {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Difficulty indicator with a visual meter
    const diffBg = this.scene.add.rectangle(0, 5, 300, 30, 0x333333);
    diffBg.setOrigin(0.5);
    diffBg.setStrokeStyle(1, 0x555555);

    // Create difficulty meter segments
    const diffSegment1 = this.scene.add.rectangle(-120, 5, 60, 20, 0x55aaff);
    diffSegment1.setOrigin(0.5);
    diffSegment1.setAlpha(0.3);

    const diffSegment2 = this.scene.add.rectangle(-60, 5, 60, 20, 0x55ff55);
    diffSegment2.setOrigin(0.5);
    diffSegment2.setAlpha(0.3);

    const diffSegment3 = this.scene.add.rectangle(0, 5, 60, 20, 0xffcc00);
    diffSegment3.setOrigin(0.5);
    diffSegment3.setAlpha(0.3);

    const diffSegment4 = this.scene.add.rectangle(60, 5, 60, 20, 0xff9900);
    diffSegment4.setOrigin(0.5);
    diffSegment4.setAlpha(0.3);

    const diffSegment5 = this.scene.add.rectangle(120, 5, 60, 20, 0xff5555);
    diffSegment5.setOrigin(0.5);
    diffSegment5.setAlpha(0.3);

    // Difficulty indicator label
    const diffText = this.scene.add
      .text(0, 35, 'Not yet evaluated', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add all difficulty elements
    diffSection.add([
      diffSectionBg,
      diffTitle,
      diffBg,
      diffSegment1,
      diffSegment2,
      diffSegment3,
      diffSegment4,
      diffSegment5,
      diffText,
    ]);

    // Add difficulty section to main container
    this.feedbackContainer.add(diffSection);

    // Store references for updating
    this.feedbackContainer.setData('timeCard', timeCard);
    this.feedbackContainer.setData('enemiesCard', enemiesCard);
    this.feedbackContainer.setData('deathsCard', deathsCard);
    this.feedbackContainer.setData('scoreCard', scoreCard);
    this.feedbackContainer.setData('diffText', diffText);
    this.feedbackContainer.setData('diffSegments', [
      diffSegment1,
      diffSegment2,
      diffSegment3,
      diffSegment4,
      diffSegment5,
    ]);

    // Initially hide the feedback panel
    this.feedbackContainer.setVisible(false);
  }

  /**
   * Create navigation buttons between steps with enhanced styling
   */
  private createStepNavigation(): void {
    // Create a navigation container at the bottom
    const navContainer = this.scene.add.container(
      this.scene.scale.width - 200,
      this.scene.scale.height - 40
    );
    this.container.add(navContainer);

    // Back button (to Design step) with enhanced styling
    const backBg = this.scene.add.rectangle(-60, 0, 160, 46, 0x444444);
    backBg.setOrigin(0.5);
    backBg.setStrokeStyle(2, 0x666666);

    // Back button icon
    const backIcon = this.scene.add
      .text(-120, 0, '◀', {
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Back button text
    const backText = this.scene.add
      .text(-85, 0, 'BACK TO DESIGN', {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Group back button elements
    const backButton = this.scene.add.container(-60, 0, [backBg, backIcon, backText]);
    backButton.setSize(160, 46);
    backButton.setInteractive({ useHandCursor: true });

    // Add hover effects to back button
    backButton.on('pointerover', () => {
      backBg.setFillStyle(0x555555);
      backBg.setStrokeStyle(2, 0x888888);
      backIcon.setColor('#ffffff');
      this.scene.tweens.add({
        targets: backButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    backButton.on('pointerout', () => {
      backBg.setFillStyle(0x444444);
      backBg.setStrokeStyle(2, 0x666666);
      backIcon.setColor('#aaaaaa');
      this.scene.tweens.add({
        targets: backButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    // Navigate to Design step
    backButton.on('pointerdown', () => {
      // Visual feedback when clicked
      this.scene.tweens.add({
        targets: backButton,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          // Change to Design step
          this.scene.events.emit('step:change', 'design', this.levelId);
        },
      });
    });

    // Next button (to Publish step) with enhanced styling
    const nextBg = this.scene.add.rectangle(80, 0, 160, 46, 0x0066aa);
    nextBg.setOrigin(0.5);
    nextBg.setStrokeStyle(2, 0x0088cc);

    // Next button icon
    const nextIcon = this.scene.add
      .text(140, 0, '▶', {
        fontSize: '16px',
        color: '#88ddff',
      })
      .setOrigin(0.5);

    // Next button text
    const nextText = this.scene.add
      .text(45, 0, 'PUBLISH LEVEL', {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Group next button elements
    const nextButton = this.scene.add.container(80, 0, [nextBg, nextIcon, nextText]);
    nextButton.setSize(160, 46);
    nextButton.setInteractive({ useHandCursor: true });

    // Add hover effects to next button
    nextButton.on('pointerover', () => {
      nextBg.setFillStyle(0x0088cc);
      nextBg.setStrokeStyle(2, 0x00aaff);
      nextIcon.setColor('#ffffff');
      this.scene.tweens.add({
        targets: nextButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    nextButton.on('pointerout', () => {
      nextBg.setFillStyle(0x0066aa);
      nextBg.setStrokeStyle(2, 0x0088cc);
      nextIcon.setColor('#88ddff');
      this.scene.tweens.add({
        targets: nextButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    // Navigate to Publish step
    nextButton.on('pointerdown', () => {
      // Visual feedback when clicked
      this.scene.tweens.add({
        targets: nextButton,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          // Change to Publish step
          this.scene.events.emit('step:change', 'publish', this.levelId);
        },
      });
    });

    // Add shadow effect to make buttons stand out
    const navShadow = this.scene.add.rectangle(10, 5, 340, 46, 0x000000, 0.3);
    navShadow.setOrigin(0.5);

    // Add everything to the container in the right order
    navContainer.add([navShadow, backButton, nextButton]);
  }

  /**
   * Set up the test environment
   */
  private setupTestEnvironment(): void {
    console.log('[TestStep] Setting up test environment');
    console.log('[TestStep] this.levelId:', this.levelId);
    console.log('[TestStep] manager.getCurrentLevelId():', this.manager.getCurrentLevelId());

    // Get level ID from class or from the manager if not provided
    const levelIdToUse = this.levelId || this.manager.getCurrentLevelId();

    if (!levelIdToUse) {
      console.warn('[TestStep] No level ID provided, nothing to set up');
      return;
    }

    console.log(`[TestStep] Using levelId: ${levelIdToUse} for test environment`);

    // Log all available levels to debug the issue
    const allLevels = this.service.getLevelList();
    console.log(
      '[TestStep] Available levels:',
      allLevels.map((level) => ({
        id: level.id,
        name: level.name,
        lastModified: new Date(level.lastModified).toISOString(),
      }))
    );

    // Critical check: make sure the level ID format matches our expected pattern
    // The ID format could be either 'mficgcyto5bjtg89j9' (manager format)
    // or 'level_mficgcyt_d78mv' (service format)
    let effectiveLevelId = levelIdToUse;

    // First try direct lookup
    let levelData = this.service.loadLevel(levelIdToUse);
    if (levelData) {
      console.log(`[TestStep] Successfully loaded level with direct ID: ${levelIdToUse}`);
    } else {
      // Try more aggressive matching if direct lookup fails
      console.log('[TestStep] Direct ID lookup failed, trying to match IDs');

      // First, look for levels with matching prefixes (first 8 characters should be enough)
      const matchingLevels = allLevels.filter((level) => {
        if (!levelIdToUse || !level.id) return false;

        // Extract the unique ID part from both formats
        const serviceIdPart = level.id.startsWith('level_')
          ? level.id.split('_')[1] // Extract 'mficptqo' from 'level_mficptqo_bt5jg'
          : level.id.substring(0, 8); // Or just take first 8 chars

        const managerIdPart = levelIdToUse.substring(0, 8);

        // Check if they match
        return (
          serviceIdPart === managerIdPart ||
          level.id.includes(managerIdPart) ||
          (serviceIdPart && levelIdToUse.includes(serviceIdPart))
        );
      });

      if (matchingLevels.length > 0) {
        // Sort by most recent first
        matchingLevels.sort((a, b) => b.lastModified - a.lastModified);
        const bestMatch = matchingLevels[0];

        if (bestMatch && bestMatch.id) {
          console.log(
            `[TestStep] Found matching level ID: ${bestMatch.id} for manager ID: ${levelIdToUse}`
          );
          effectiveLevelId = bestMatch.id;
          levelData = this.service.loadLevel(bestMatch.id);
        }
      }

      // If we still have no data, look for any recently modified level
      if (!levelData) {
        console.log('[TestStep] No matching ID found, trying most recently modified level');
        // Sort levels by last modified time, descending
        const recentLevels = [...allLevels].sort((a, b) => b.lastModified - a.lastModified);

        if (recentLevels.length > 0) {
          const mostRecentLevel = recentLevels[0];
          if (mostRecentLevel && mostRecentLevel.id) {
            console.log(`[TestStep] Using most recent level: ${mostRecentLevel.id}`);
            effectiveLevelId = mostRecentLevel.id;
            levelData = this.service.loadLevel(mostRecentLevel.id);
          }
        }
      }
    }

    console.log(`[TestStep] Using effective levelId: ${effectiveLevelId} for loading`);

    // If we still have no level data, that's a real problem
    if (!levelData) {
      console.error(`[TestStep] Failed to load level with ID: ${effectiveLevelId}`);
      return;
    }

    // Log detailed entity information to help debug
    if (levelData.entities && levelData.entities.length > 0) {
      // Count enemy spawners for better visibility
      const enemySpawners = levelData.entities.filter(
        (e) => e.type === 'ENEMY_SPAWNER' || String(e.type).includes('ENEMY_SPAWNER')
      );

      console.log(
        `[TestStep] Found ${levelData.entities.length} entities in level data, including ${enemySpawners.length} enemy spawners.`
      );

      // Log each entity
      levelData.entities.forEach((entity, i) => {
        // Use type assertion to access properties safely
        const entityData = entity as {
          type: string;
          position: { x: number; y: number };
          enemyType?: string;
          properties?: { enemyType?: string };
        };
        const entityType = entityData.type;
        const position = entityData.position || { x: 0, y: 0 };
        const enemyType = entityData.enemyType || entityData.properties?.enemyType;

        // Add highlighting for enemy spawners to make them easier to spot in logs
        const isEnemySpawner =
          entityType === 'ENEMY_SPAWNER' || String(entityType).includes('ENEMY_SPAWNER');
        const prefix = isEnemySpawner ? '⭐ [ENEMY]' : '[TestStep]';

        console.log(
          `${prefix} Entity ${i}: Type=${entityType}, Position=(${position.x},${position.y}), EnemyType=${enemyType || 'N/A'}`
        );
      });
    } else {
      console.warn('[TestStep] Level data has no entities!');
    }

    // Calculate proper metrics for the level data
    const enemySpawnerCount =
      levelData.entities?.filter((e) => e.type === 'ENEMY_SPAWNER').length || 0;

    // Log a comprehensive summary of the level data
    console.log('[TestStep] Level data loaded successfully:', {
      id: levelData.id,
      name: levelData.settings.name,
      entityCount: levelData.entities?.length || 0,
      enemySpawnerCount: enemySpawnerCount,
      hasEntities: !!levelData.entities && levelData.entities.length > 0,
    });

    // Store level data in scene registry for access during testing
    this.scene.registry.set('testLevelData', levelData);
    console.log('[TestStep] testLevelData set in registry');

    console.log('[TestStep] Level data loaded and ready for testing:', levelData.settings.name);
  }

  /**
   * Start the test
   */
  private startTest(): void {
    console.log('[TestStep] Starting test');

    // First verify that we have valid level data to test
    const levelData = this.scene.registry.get('testLevelData');
    if (!levelData) {
      console.error('[TestStep] Cannot start test: No level data found in registry');
      this.showToast('Cannot start test: No level data found', 'error');

      // Try to reload the test environment
      this.setupTestEnvironment();

      // Check if we have data now
      const reloadedData = this.scene.registry.get('testLevelData');
      if (!reloadedData) {
        console.error('[TestStep] Failed to reload level data, test cannot proceed');
        return;
      } else {
        console.log('[TestStep] Successfully reloaded level data, proceeding with test');
      }
    }

    // Verify entity data if available
    if (levelData && (!levelData.entities || levelData.entities.length === 0)) {
      console.warn('[TestStep] Starting test with empty level (no entities)');
      this.showToast('Warning: Testing a level with no entities', 'info');
    }

    this.isPlaying = true;
    this.testStartTime = this.scene.time.now;

    // Reset test stats
    this.testStats = {
      timePlayed: 0,
      enemiesDefeated: 0,
      playerDeaths: 0,
      powerupsCollected: 0,
      score: 0,
    };

    // Hide start button, show stop button
    const startButton = this.controlsContainer.getData(
      'startButton'
    ) as Phaser.GameObjects.Container;
    const stopButton = this.controlsContainer.getData('stopButton') as Phaser.GameObjects.Container;

    // Add transition effect when switching buttons
    this.scene.tweens.add({
      targets: startButton,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      onComplete: () => {
        startButton.setVisible(false);
        startButton.setAlpha(1);
        startButton.setScale(1);
      },
    });

    stopButton.setAlpha(0);
    stopButton.setScale(0.8);
    stopButton.setVisible(true);

    this.scene.tweens.add({
      targets: stopButton,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
    });

    // Hide feedback panel with a fade effect
    this.scene.tweens.add({
      targets: this.feedbackContainer,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.feedbackContainer.setVisible(false);
        this.feedbackContainer.setAlpha(1);
      },
    });

    // Hide the whole Test UI overlay so it doesn't block gameplay
    if (this.container) {
      this.container.setVisible(false);
    }

    // Create a small floating Stop button while testing
    this.createFloatingStopButton();

    // Visual feedback that test is starting
    const testStartingText = this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2 - 100, 'STARTING TEST...', {
        fontSize: '32px',
        color: '#00ff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Fade out and remove the text
    this.scene.tweens.add({
      targets: testStartingText,
      alpha: 0,
      y: this.scene.scale.height / 2 - 150,
      duration: 1000,
      onComplete: () => {
        testStartingText.destroy();
      },
    });

    // Start the actual test
    this.launchTestGame();
  }

  /**
   * Launch the game scene in test mode
   */
  private launchTestGame(): void {
    // Ensure any previous StarshipScene instance is stopped for a clean start
    if (this.scene.scene.isActive('StarshipScene')) {
      console.log('[TestStep] StarshipScene already active; stopping before relaunch');
      // Emit stop to the StarshipScene to allow graceful shutdown and stats flush
      const starship = this.scene.scene.get('StarshipScene') as Phaser.Scene | undefined;
      if (starship) {
        starship.events.emit('test:stop');
      }
      this.scene.scene.stop('StarshipScene');
    }

    // Reset per-test registry counters/flags to avoid leakage between runs
    this.scene.registry.set('enemiesDefeated', 0);
    this.scene.registry.set('playerDeaths', 0);
    this.scene.registry.set('powerupsCollected', 0);
    this.scene.registry.set('isBuildModeTest', true);

    // First make sure we've tried to set up the test environment
    this.setupTestEnvironment();

    // Now check if we have level data to test
    const levelData = this.scene.registry.get('testLevelData');
    if (!levelData) {
      // Try to get the current level ID from the manager as a fallback
      const currentLevelId = this.manager.getCurrentLevelId();

      if (currentLevelId) {
        // Try loading the level data directly
        const loadedLevelData = this.service.loadLevel(currentLevelId);
        if (loadedLevelData) {
          // Store and use this data
          this.scene.registry.set('testLevelData', loadedLevelData);

          // Continue with the loaded data
          this.startTestWithData(loadedLevelData);
          return;
        }
      }

      // If we get here, we really couldn't find any level data
      console.error('[TestStep] No level data found for testing');
      this.showToast('No level data available for testing', 'error');
      this.stopTest();
      return;
    }

    // If we have the level data, start testing
    this.startTestWithData(levelData);
  }

  /**
   * Start the test with the provided level data
   * @param levelData The level data to use for testing
   */
  private startTestWithData(levelData: LevelData): void {
    console.log('[TestStep] Starting test with level data:', {
      id: levelData.id,
      name: levelData.settings?.name,
      entityCount: levelData.entities?.length || 0,
    });

    // Log detailed entity information
    if (levelData.entities && levelData.entities.length > 0) {
      console.log('[TestStep] Level entities:');
      levelData.entities.forEach((entity, index) => {
        console.log(`[TestStep] Entity ${index}:`, {
          id: entity.id,
          type: entity.type,
          position: entity.position,
          // Use optional chaining and type assertion for type-specific properties
          enemyType:
            entity.type === 'ENEMY_SPAWNER'
              ? (entity as unknown as { enemyType: string }).enemyType
              : undefined,
        });
      });
    } else {
      console.warn('[TestStep] No entities found in level data');
    }

    // Set up communication between test scene and game scene
    // This allows us to receive events back from the game
    this.scene.events.once('test:completed', this.handleTestCompleted, this);
    this.scene.events.once('test:stats', this.handleTestStats, this);

    // Add flag for build mode test to registry to make it accessible across scenes (already set above)
    console.log('[TestStep] isBuildModeTest flag set in registry');

    // Ensure level data is in registry
    this.scene.registry.set('testLevelData', levelData);
    console.log('[TestStep] Set/updated testLevelData in registry');

    // Launch the StarshipScene in test mode with our level data
    console.log('[TestStep] Launching StarshipScene with params:', {
      testMode: true,
      buildModeTest: true,
    });

    this.scene.scene.launch('StarshipScene', {
      testMode: true,
      levelData: levelData,
      buildModeTest: true,
    });

    console.log('[TestStep] Launched game scene for testing');
  }

  /**
   * Handle test completion event
   */
  private handleTestCompleted(): void {
    console.log('[TestStep] Test completed event received');
    this.stopTest();
  }

  /**
   * Handle test statistics update event
   * @param stats Updated game statistics
   */
  private handleTestStats(stats: Partial<TestStatistics>): void {
    console.log('[TestStep] Received test stats update:', stats);

    // Update our test stats with the actual gameplay data
    if (stats) {
      if (stats.enemiesDefeated !== undefined) {
        this.testStats.enemiesDefeated = stats.enemiesDefeated;
      }

      if (stats.score !== undefined) {
        this.testStats.score = stats.score;
      }

      if (stats.playerDeaths !== undefined) {
        this.testStats.playerDeaths = stats.playerDeaths;
      }

      if (stats.powerupsCollected !== undefined) {
        this.testStats.powerupsCollected = stats.powerupsCollected;
      }
    }
  }

  /**
   * Create a toast notification for test events
   * @param message Toast message
   * @param type Toast type (success, error, info)
   */
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Create container for toast
    const toast = this.scene.add.container(
      this.scene.scale.width / 2,
      this.scene.scale.height - 100
    );

    // Determine color based on type
    let color = 0x0088ff; // info (blue)
    if (type === 'success') {
      color = 0x00aa44; // success (green)
    } else if (type === 'error') {
      color = 0xaa0000; // error (red)
    }

    // Toast background
    const toastBg = this.scene.add.graphics();
    toastBg.fillStyle(color, 0.9);
    toastBg.fillRoundedRect(-200, -25, 400, 50, 8);
    toastBg.lineStyle(2, 0xffffff, 0.5);
    toastBg.strokeRoundedRect(-200, -25, 400, 50, 8);

    // Toast message
    const toastText = this.scene.add
      .text(0, 0, message, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 380 },
      })
      .setOrigin(0.5);

    // Add components to toast
    toast.add([toastBg, toastText]);

    // Animation to slide in from bottom
    toast.setY(this.scene.scale.height + 50);
    this.scene.tweens.add({
      targets: toast,
      y: this.scene.scale.height - 100,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Auto-remove after delay
        this.scene.time.delayedCall(3000, () => {
          this.scene.tweens.add({
            targets: toast,
            y: this.scene.scale.height + 50,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => {
              toast.destroy();
            },
          });
        });
      },
    });
  }

  /**
   * Stop the test
   */
  private stopTest(): void {
    console.log('[TestStep] Stopping test');
    this.isPlaying = false;

    // Calculate final stats
    this.testStats.timePlayed = (this.scene.time.now - this.testStartTime) / 1000;

    // Show start button, hide stop button
    const startButton = this.controlsContainer.getData(
      'startButton'
    ) as Phaser.GameObjects.Container;
    const stopButton = this.controlsContainer.getData('stopButton') as Phaser.GameObjects.Container;

    // Add transition effect when switching buttons
    this.scene.tweens.add({
      targets: stopButton,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      onComplete: () => {
        stopButton.setVisible(false);
        stopButton.setAlpha(1);
        stopButton.setScale(1);
      },
    });

    startButton.setAlpha(0);
    startButton.setScale(0.8);
    startButton.setVisible(true);

    this.scene.tweens.add({
      targets: startButton,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
    });

    // Update feedback panel
    this.updateFeedbackPanel();

    // Show feedback panel with a fade-in effect
    this.feedbackContainer.setAlpha(0);
    this.feedbackContainer.setVisible(true);

    this.scene.tweens.add({
      targets: this.feedbackContainer,
      alpha: 1,
      duration: 500,
    });

    // Visual feedback that test has ended
    const testEndedText = this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2 - 200, 'TEST COMPLETE', {
        fontSize: '32px',
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Fade out and remove the text
    this.scene.tweens.add({
      targets: testEndedText,
      alpha: 0,
      y: this.scene.scale.height / 2 - 250,
      duration: 1500,
      onComplete: () => {
        testEndedText.destroy();
      },
    });

    // Stop the actual test
    this.stopTestGame();

    // Restore the overlay UI
    if (this.container) {
      this.container.setVisible(true);
    }

    // Remove floating Stop button if present
    if (this.floatingStopButton) {
      // Remove resize listener and destroy
      this.scene.scale.off('resize', this.positionFloatingStopButton, this);
      this.floatingStopButton.destroy();
      this.floatingStopButton = undefined;
    }
  }

  /**
   * Stop the test game and clean up
   */
  private stopTestGame(): void {
    console.log('[TestStep] Stopping test game');

    // Stop the game scene if it's running
    if (this.scene.scene.isActive('StarshipScene')) {
      // Signal to the game scene that we're stopping the test
      const starship = this.scene.scene.get('StarshipScene') as Phaser.Scene | undefined;
      if (starship) {
        starship.events.emit('test:stop');
      }
      // Stop and remove the game scene
      this.scene.scene.stop('StarshipScene');
      console.log('[TestStep] Game scene stopped');
    }

    // Unregister event handlers to prevent memory leaks
    this.scene.events.off('test:completed', this.handleTestCompleted, this);
    this.scene.events.off('test:stats', this.handleTestStats, this);

    // Show a toast notification that test has ended
    this.showToast('Test completed', 'success');
  }

  /**
   * Update the feedback panel with current stats and enhanced visuals
   */
  private updateFeedbackPanel(): void {
    // Format time played as mm:ss
    const minutes = Math.floor(this.testStats.timePlayed / 60);
    const seconds = Math.floor(this.testStats.timePlayed % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update stat cards with animation
    const updateStatCard = (cardName: string, value: string) => {
      const card = this.feedbackContainer.getData(cardName) as Phaser.GameObjects.Container;
      const valueText = card.getData('valueText') as Phaser.GameObjects.Text;

      // Only animate if the value has changed
      if (valueText.text !== value) {
        // Scale effect on value change
        this.scene.tweens.add({
          targets: valueText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          yoyo: true,
          onComplete: () => {
            valueText.setScale(1);
          },
        });

        // Update the text
        valueText.setText(value);
      }
    };

    // Update all stat cards
    updateStatCard('timeCard', timeString);
    updateStatCard('enemiesCard', this.testStats.enemiesDefeated.toString());
    updateStatCard('deathsCard', this.testStats.playerDeaths.toString());
    updateStatCard('scoreCard', this.testStats.score.toString());

    // Update difficulty assessment with visual meter
    const diffText = this.feedbackContainer.getData('diffText') as Phaser.GameObjects.Text;
    const diffSegments = this.feedbackContainer.getData(
      'diffSegments'
    ) as Phaser.GameObjects.Rectangle[];

    // Reset all segments to low alpha
    diffSegments.forEach((segment) => {
      segment.setAlpha(0.3);
    });

    // Enhanced difficulty assessment logic
    let difficultyAssessment = '';
    let difficultyColor = '#ffffff';
    let difficultyLevel = 0; // 0-4 index for which segment to highlight

    // Determine difficulty based on deaths and enemies defeated
    if (this.testStats.playerDeaths > 3) {
      difficultyAssessment = 'EXTREMELY DIFFICULT';
      difficultyColor = '#ff5555';
      difficultyLevel = 4;
    } else if (this.testStats.playerDeaths > 1) {
      difficultyAssessment = 'CHALLENGING';
      difficultyColor = '#ff9900';
      difficultyLevel = 3;
    } else if (this.testStats.playerDeaths > 0) {
      difficultyAssessment = 'MODERATE';
      difficultyColor = '#ffcc00';
      difficultyLevel = 2;
    } else if (this.testStats.enemiesDefeated > 15) {
      difficultyAssessment = 'WELL BALANCED';
      difficultyColor = '#55ff55';
      difficultyLevel = 1;
    } else {
      difficultyAssessment = 'TOO EASY';
      difficultyColor = '#55aaff';
      difficultyLevel = 0;
    }

    // Highlight the appropriate difficulty segment with animation
    if (
      difficultyLevel >= 0 &&
      difficultyLevel < diffSegments.length &&
      diffSegments[difficultyLevel]
    ) {
      // Safely access the active segment
      const activeSegment = diffSegments[difficultyLevel];
      if (activeSegment) {
        activeSegment.setAlpha(1);

        // Pulse animation on the active segment
        this.scene.tweens.add({
          targets: activeSegment,
          alpha: { from: 1, to: 0.7 },
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    // Update text with animation
    this.scene.tweens.add({
      targets: diffText,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        diffText.setText(difficultyAssessment);
        diffText.setColor(difficultyColor);

        this.scene.tweens.add({
          targets: diffText,
          alpha: 1,
          duration: 300,
        });
      },
    });

    // Provide visual feedback based on the assessment
    if (difficultyAssessment === 'WELL BALANCED') {
      // Positive feedback with particles for well-balanced levels
      const particles = this.scene.add.particles(0, 100, 'particle', {
        speed: { min: -100, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        gravityY: 50,
      });

      // Auto-destroy after emission
      this.scene.time.delayedCall(1000, () => {
        particles.destroy();
      });
    }
  }

  /**
   * Update function called by the scene
   * @param time Current time
   * @param _delta Time since last update (unused)
   */
  update(time: number, _delta: number): void {
    // Update test stats if playing
    if (this.isPlaying) {
      // Update time played
      this.testStats.timePlayed = (time - this.testStartTime) / 1000;

      // Update other stats from the actual test
      // To be implemented
    }
  }

  /**
   * Create a lightweight floating Stop button shown during testing
   */
  private createFloatingStopButton(): void {
    // If already exists, refresh position and return
    if (this.floatingStopButton) {
      this.positionFloatingStopButton();
      this.floatingStopButton.setVisible(true);
      return;
    }

    const btnWidth = 110;
    const btnHeight = 36;

    const container = this.scene.add.container(0, 0);

    const bg = this.scene.add.rectangle(0, 0, btnWidth, btnHeight, 0x990000, 0.9);
    bg.setOrigin(1, 0); // anchor top-right
    bg.setStrokeStyle(2, 0xcc0000);
    bg.setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(-btnWidth + 8, btnHeight / 2, '■ Stop Test', {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    container.add([bg, label]);

    // Simple hover feedback
    bg.on('pointerover', () => {
      bg.setFillStyle(0xbb0000, 0.95);
      bg.setStrokeStyle(2, 0xff0000);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x990000, 0.9);
      bg.setStrokeStyle(2, 0xcc0000);
    });

    bg.on('pointerdown', () => {
      this.stopTest();
    });

    // Position in top-right corner and keep above everything
    this.floatingStopButton = container.setDepth(1000);
    this.positionFloatingStopButton();

    // Update position on resize
    this.scene.scale.on('resize', this.positionFloatingStopButton, this);
  }

  /**
   * Position the floating stop button relative to current viewport
   */
  private positionFloatingStopButton = (): void => {
    if (!this.floatingStopButton) return;
    const margin = 12;
    const x = this.scene.scale.width - margin;
    const y = margin; // top-right
    this.floatingStopButton.setPosition(x, y);
  };
}
