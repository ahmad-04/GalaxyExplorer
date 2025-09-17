import * as Phaser from 'phaser';
import { getLeaderboard, getPublishedLevel, getInit } from '../api';
import { isFeatureEnabled } from '../../../shared/config';
import { BackgroundManager } from '../services/BackgroundManager';
import {
  titleText as uiTitleText,
  bodyText as uiBodyText,
  createButton,
  createPanel,
} from '../ui/UiKit';
import { shineSweep } from '../effects/Effects';

export class MainMenu extends Phaser.Scene {
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private startEnabled = true;
  private publishedPollAttempts = 0;
  private background!: Phaser.GameObjects.TileSprite;
  // star texture handled by BackgroundManager
  private leaderboardPopup!: Phaser.GameObjects.Container;
  private leaderboardVisible = false;
  private resizeHandler: (() => void) | undefined;

  constructor() {
    super('MainMenu');
  }

  init() {
    // Reset the startEnabled flag whenever the scene is initialized
    this.startEnabled = true;
    // Reset the leaderboard visibility state when returning to this scene
    this.leaderboardVisible = false;
    console.log('MainMenu scene initialized, startEnabled =', this.startEnabled);
    this.logState('init');
  }

  create() {
    console.log('[MainMenu] create() starting');
    this.logState('create:before-load');
    // If we have a published-level context, attempt to auto-load it silently
    void this.ensurePublishedLevelLoaded();
    console.log('[MainMenu] ensurePublishedLevelLoaded() invoked from create()');
    // --- 1. Draw the scene immediately with defaults ---

    const starsKey = BackgroundManager.ensureStars(this);

    // Enable keyboard input and ensure focus
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.once('pointerdown', () => this.game.canvas.focus());
    this.game.canvas.focus();
    // Set up space key for starting the game
    const kb = this.input.keyboard;
    if (kb) {
      this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Ensure leaderboard is hidden when scene starts/restarts
    if (this.leaderboardPopup) {
      this.leaderboardPopup.setVisible(false);
      console.log('[Leaderboard] Reset leaderboard visibility on scene create');
    }

    // Add background
    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, starsKey);
    this.background.setOrigin(0, 0);

    // Keep background sized to viewport
    this.resizeHandler = () => {
      this.background.setSize(this.scale.width, this.scale.height);
    };
    this.scale.on('resize', this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
        this.resizeHandler = undefined;
      }
    });

    // Title and subtitle using UiKit
    const title = uiTitleText(this, this.scale.width / 2, 100, 'GALAXY EXPLORER');
    this.time.delayedCall(600, () => shineSweep(this, title.y));
    uiBodyText(this, this.scale.width / 2, 170, 'CONQUER THE COSMOS', 24);

    // Buttons using UiKit
    const startBtn = createButton(this, this.scale.width / 2, 250, 'START GAME');
    const customizeBtn = createButton(this, this.scale.width / 2, 340, 'CUSTOMIZE');
    const leaderboardBtn = createButton(this, this.scale.width / 2, 430, 'LEADERBOARD');
    let buildModeBtn: ReturnType<typeof createButton> | undefined;
    if (isFeatureEnabled('ENABLE_BUILD_MODE')) {
      buildModeBtn = createButton(this, this.scale.width / 2, 520, 'BUILD MODE');
    }

    startBtn.container.once('pointerdown', () => {
      this.cameras.main.flash(300, 255, 255, 255, true);
      this.time.delayedCall(300, () => this.startGame());
    });
    customizeBtn.container.once('pointerdown', () => {
      this.resetLeaderboardState();
      this.cameras.main.flash(300, 100, 100, 255, true);
      this.time.delayedCall(200, () => this.scene.start('CustomizationScene'));
    });
    leaderboardBtn.container.on('pointerdown', () => {
      this.time.delayedCall(100, () => {
        void this.showLeaderboard();
      });
    });
    if (buildModeBtn) {
      buildModeBtn.container.once('pointerdown', () => {
        this.resetLeaderboardState();
        this.cameras.main.flash(300, 100, 200, 255, true);
        this.time.delayedCall(200, () => this.scene.start('BuildModeScene', { action: 'design' }));
      });
    }

    // Instruction hint
    createPanel(this, this.scale.width / 2 - 200, 570, 400, 40, { fillAlpha: 0.3 });
    const instructionText = uiBodyText(this, this.scale.width / 2, 590, 'PRESS SPACE TO START', 18);
    this.tweens.add({
      targets: instructionText,
      alpha: { from: 1, to: 0.6 },
      duration: 1500,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    // Version footer
    this.add
      .text(this.scale.width - 10, this.scale.height - 10, 'v0.5', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#666666',
        align: 'right',
      })
      .setOrigin(1, 1);

    // Keep the design clean as shown in the mockup - no additional decorations

    // Create but hide the leaderboard popup initially
    this.createLeaderboardPopup();

    // Legacy handlers removed in favor of UiKit button bindings above

    // Test data button event handler - commented out for production
    /*
    testDataButton.on('pointerdown', () => {
      void this.generateTestScores();
    });
    */

    // Create but hide the leaderboard popup initially (already created above)

    // --- 2. Asynchronously load custom config and update if found ---

    // Check for config passed from CustomizationScene first for responsiveness
    const registryConfig = this.registry.get('backgroundConfig');
    if (registryConfig) {
      console.log('Applying config from registry:', registryConfig);
      this.applyBackgroundConfig(registryConfig);
    } else {
      // If no registry config, try loading from the server
      this.loadConfigFromServer().catch((error) => {
        console.error('Failed to load or apply server config:', error);
      });
    }

    // Add parallax elements to the background
    this.addParallaxElements();
    this.logState('create:end');
  }

  // Removed modal prompt; published levels are preloaded silently

  private async loadConfigFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/load-user-config');
      if (response.ok) {
        const config = await response.json();
        console.log('Successfully loaded config from server:', config);
        this.registry.set('backgroundConfig', config); // Store for other scenes
        this.applyBackgroundConfig(config);
      }
    } catch (error) {
      console.error('Could not load user config from server:', error);
    }
  }

  private applyBackgroundConfig(config: { color: string; density: number }) {
    if (config && this.background) {
      // Set a dark red background color regardless of the config
      this.cameras.main.setBackgroundColor('#000000ff');
      this.generateCustomBackground(config);
      this.background.setTexture('custom_stars');
    }
  }

  // Add parallax background elements for depth perception
  private addParallaxElements() {
    // Remove any existing parallax elements
    this.children.getAll().forEach((child) => {
      if (child.getData('parallaxElement')) {
        child.destroy();
      }
    });

    // Create some distant stars that move at a different speed than the main background
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.FloatBetween(1.5, 3);

      const distantStar = this.add.circle(x, y, size, 0xffffff, 0.7);
      distantStar.setData('parallaxElement', true);
      distantStar.setData('parallaxSpeed', 0.4);
      distantStar.setDepth(1);
    }
  }

  override update(_time: number, delta: number) {
    // Use a fixed speed of 0.5 instead of getting it from the configuration
    const fixedSpeed = 0.5;
    const d = delta / 16.6667; // Make movement frame-rate independent

    // Scroll the background at the fixed speed
    this.background.tilePositionY -= fixedSpeed * d;

    // Update parallax elements
    this.children.getAll().forEach((child) => {
      if (child.getData('parallaxElement')) {
        const parallaxSpeed = child.getData('parallaxSpeed') || 0.5;

        // If this element is orbiting something
        const orbitData = child.getData('orbit');
        if (orbitData) {
          // Update orbit position
          orbitData.angle += orbitData.speed * d;
          const x = orbitData.center.x + Math.cos(orbitData.angle) * orbitData.radius;
          const y = orbitData.center.y + Math.sin(orbitData.angle) * orbitData.radius;

          // Type safety - only call setPosition if the object has it
          if ('setPosition' in child && typeof child.setPosition === 'function') {
            child.setPosition(x, y);
          }
        }
        // Otherwise just move it vertically
        else if ('y' in child) {
          // Type safety - ensure we're updating a property that has 'y'
          const gameObject = child as unknown as { y: number };
          gameObject.y += parallaxSpeed * d;

          // Wrap around when off-screen
          if (gameObject.y > this.scale.height + 50) {
            gameObject.y = -50;
          }
        }
      }
    });

    // Check for spacebar press - use both methods for redundancy
    if (this.startEnabled && this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      console.log('Space key detected in update()');
      this.startGame();
    }
  }

  /**
   * Reset the leaderboard state forcefully (for scene transitions)
   */
  private resetLeaderboardState(): void {
    console.log('[Leaderboard] Forcefully resetting leaderboard state');

    // Skip animation and just reset everything
    if (this.leaderboardPopup) {
      this.leaderboardPopup.setVisible(false);
      this.leaderboardPopup.setAlpha(1);
      this.leaderboardPopup.setScale(1);

      // Clear all score entries but keep the first 5 elements (fullscreen block, background, title, close button, loading text)
      while (this.leaderboardPopup.list.length > 5) {
        const item = this.leaderboardPopup.list[
          this.leaderboardPopup.list.length - 1
        ] as Phaser.GameObjects.GameObject; // Properly clean up container objects
        if (item instanceof Phaser.GameObjects.Container) {
          // Destroy all children in the container
          item.each((child: Phaser.GameObjects.GameObject) => {
            if (child && 'destroy' in child) {
              child.destroy();
            }
          });
        }

        if (item && 'destroy' in item) {
          item.destroy();
        } else {
          // If we can't destroy it properly, at least remove it from the container
          this.leaderboardPopup.remove(item);
        }
      }
    }

    // Reset the state flag
    this.leaderboardVisible = false;
  }

  /**
   * Clean up when the scene is shut down (switching to another scene)
   */
  shutdown() {
    console.log('[MainMenu] Scene shutdown, cleaning up resources');
    // Reset leaderboard state when shutting down the scene
    this.resetLeaderboardState();
  }

  private startGame() {
    this.logState('startGame:entered');
    // If published level not yet loaded, attempt a last-second fetch
    const hasCustom = !!this.registry.get('testLevelData');
    const loading = this.registry.get('publishedLevelLoading') === true;
    if (!hasCustom && !loading) {
      console.log('[MainMenu] No custom level loaded yet; attempting fallback fetch');
      void this.ensurePublishedLevelLoaded();
    }

    // If a published level is still loading, wait a moment then retry
    if (this.registry.get('publishedLevelLoading') === true) {
      if (this.publishedPollAttempts < 15) {
        this.publishedPollAttempts++;
        console.log('[MainMenu] Waiting for published level to load...');
        this.time.delayedCall(200, () => this.startGame());
        return;
      } else {
        console.warn('[MainMenu] Published level did not load in time; starting default game');
      }
    }

    if (!this.startEnabled) {
      console.log('Start game attempted but startEnabled is false');
      return;
    }

    // Disable starting to prevent multiple calls
    this.startEnabled = false;
    console.log('Starting game, startEnabled set to false');

    // Reset leaderboard state when starting the game
    this.resetLeaderboardState();

    // Reset poll attempts for next time
    this.publishedPollAttempts = 0;

    // Get ship configuration from registry if available
    const shipConfig = this.registry.get('shipConfig');
    const levelData = this.registry.get('testLevelData');
    console.log('[MainMenu] startGame state:', {
      hasCustomLevel: !!levelData,
      hasShipConfig: !!shipConfig,
      pollAttempts: this.publishedPollAttempts,
    });

    // If we have a custom level loaded, pass it explicitly to StarshipScene
    if (levelData) {
      const payload = {
        ...(shipConfig || {
          ship: 'ship',
          primaryTint: 0xffffff,
          secondaryTint: 0xffffff,
        }),
        levelData,
        testMode: false,
        buildModeTest: false,
      } as const;
      const entityCount = Array.isArray(
        (levelData as unknown as { entities?: unknown[] })?.entities
      )
        ? ((levelData as unknown as { entities?: unknown[] }).entities?.length ?? undefined)
        : undefined;
      console.log('[MainMenu] Starting game with custom level payload', {
        entityCount,
      });
      this.scene.start('CustomLevelScene', payload as unknown as Record<string, unknown>);
      return;
    }

    // Fall back to normal game without custom level
    if (shipConfig) {
      console.log('Starting endless game with ship config:', shipConfig);
      this.scene.start('EndlessScene', shipConfig);
    } else {
      const defaultShipConfig = {
        ship: 'ship',
        primaryTint: 0xffffff,
        secondaryTint: 0xffffff,
      };
      console.log('Starting endless game with default ship config');
      this.scene.start('EndlessScene', defaultShipConfig);
    }
  }

  // Try to load the published level (from pointer if present, otherwise via context)
  private async ensurePublishedLevelLoaded(): Promise<boolean> {
    try {
      const t0 = performance.now();
      this.logState('ensure:start');
      const already = this.registry.get('testLevelData');
      if (already) {
        console.log(
          '[MainMenu] ensurePublishedLevelLoaded: custom level already present; skipping'
        );
        return true;
      }

      let ptr = this.registry.get('publishedLevelPointer') as
        | { postId: string; title: string }
        | undefined;

      // If we don't have a pointer yet, try fetching init info now
      if (!ptr) {
        try {
          console.log('[MainMenu] ensurePublishedLevelLoaded: fetching init for pointer');
          const init = await getInit();
          if (init.publishedLevel) {
            ptr = init.publishedLevel;
            this.registry.set('publishedLevelPointer', ptr);
            console.log('[MainMenu] Acquired published level pointer via init:', ptr.title);
          } else {
            console.log('[MainMenu] ensurePublishedLevelLoaded: init returned no publishedLevel');
          }
        } catch (e) {
          console.warn('[MainMenu] getInit failed while probing for pointer:', e);
        }
      }

      this.registry.set('publishedLevelLoading', true);
      console.log('[MainMenu] ensurePublishedLevelLoaded: set publishedLevelLoading=true');

      let resp;
      if (ptr?.postId) {
        console.log('[MainMenu] Preloading published level by pointer:', ptr.title);
        resp = await getPublishedLevel(ptr.postId);
      } else {
        console.log('[MainMenu] Preloading published level by context (no pointer)');
        resp = await getPublishedLevel();
      }

      if (resp && resp.level) {
        this.registry.set('testLevelData', resp.level);
        this.registry.set('buildModeTest', false);
        this.registry.set('testMode', false);
        if (ptr) {
          // Clear pointer only on successful load
          this.registry.set('publishedLevelPointer', undefined);
        }
        const entityCount = Array.isArray(
          (resp.level as unknown as { entities?: unknown[] })?.entities
        )
          ? ((resp.level as unknown as { entities?: unknown[] }).entities?.length ?? undefined)
          : undefined;
        console.log('[MainMenu] Published level loaded successfully', {
          postId: resp.postId,
          entityCount,
        });
        this.logState('ensure:after-success');
        const dt = (performance.now() - t0).toFixed(2);
        console.log(`[MainMenu] ensurePublishedLevelLoaded completed in ${dt}ms`);
        return true;
      }
    } catch (e) {
      console.warn('[MainMenu] ensurePublishedLevelLoaded failed:', e);
    } finally {
      this.registry.set('publishedLevelLoading', false);
      console.log('[MainMenu] ensurePublishedLevelLoaded: set publishedLevelLoading=false');
      this.logState('ensure:finally');
    }
    return false;
  }

  private logState(where: string) {
    try {
      const ptr = this.registry.get('publishedLevelPointer') as
        | { postId?: string; title?: string }
        | undefined;
      const hasLevel = !!this.registry.get('testLevelData');
      const loading = this.registry.get('publishedLevelLoading') === true;
      const testMode = this.registry.get('testMode');
      const buildModeTest = this.registry.get('buildModeTest');
      console.log(`[MainMenu] State@${where}:`, {
        pointerPostId: ptr?.postId,
        pointerTitle: ptr?.title,
        hasTestLevelData: hasLevel,
        publishedLevelLoading: loading,
        testMode,
        buildModeTest,
      });
    } catch (err) {
      console.warn('[MainMenu] logState error:', err);
    }
  }

  // removed local starfield generators; BackgroundManager handles it

  private generateCustomBackground(config: { density: number }) {
    const key = 'custom_stars';
    if (this.textures.exists(key)) this.textures.remove(key);
    const w = this.scale.width;
    const h = this.scale.height;
    BackgroundManager.createStarsFallback(
      this,
      key,
      w,
      h,
      Math.max(60, Math.min(400, config.density))
    );
  }

  private createLeaderboardPopup(): void {
    console.log('[Leaderboard] Creating leaderboard popup');

    // Clean up existing leaderboard popup if it exists
    if (this.leaderboardPopup) {
      console.log('[Leaderboard] Cleaning up existing leaderboard popup');
      this.leaderboardPopup.removeAll(true); // Remove and destroy all children
      this.leaderboardPopup.destroy();
    }

    // Create a container for the leaderboard popup
    this.leaderboardPopup = this.add.container(this.scale.width / 2, this.scale.height / 2);

    // Create a dimming overlay for the background
    const fullscreenBlock = this.add.rectangle(
      0,
      0,
      this.scale.width * 2,
      this.scale.height * 2,
      0x000000,
      0.5
    );
    fullscreenBlock.setInteractive();
    fullscreenBlock.on('pointerdown', () => {
      // Clicking the backdrop will close the leaderboard
      console.log('[Leaderboard] Click on backdrop, closing leaderboard');
      this.hideLeaderboard();
      return false;
    });

    // Create a space-themed panel for the leaderboard
    // Main background
    const background = this.add.rectangle(0, 0, 500, 550, 0x000022, 0.85);
    background.setStrokeStyle(3, 0x4466ff, 1);

    // Add a decorative header
    const headerBg = this.add.rectangle(0, -250, 500, 70, 0x0033aa, 0.8);
    headerBg.setStrokeStyle(2, 0x88aaff, 1);

    // Add decorative elements
    const decorGraphics = this.add.graphics();
    // Top left corner decoration
    decorGraphics.lineStyle(2, 0x4466ff, 0.7);
    decorGraphics.beginPath();
    decorGraphics.moveTo(-250, -230);
    decorGraphics.lineTo(-210, -230);
    decorGraphics.moveTo(-230, -250);
    decorGraphics.lineTo(-230, -210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(-230, -230, 4);

    // Top right corner decoration
    decorGraphics.beginPath();
    decorGraphics.moveTo(250, -230);
    decorGraphics.lineTo(210, -230);
    decorGraphics.moveTo(230, -250);
    decorGraphics.lineTo(230, -210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(230, -230, 4);

    // Bottom left corner decoration
    decorGraphics.beginPath();
    decorGraphics.moveTo(-250, 230);
    decorGraphics.lineTo(-210, 230);
    decorGraphics.moveTo(-230, 250);
    decorGraphics.lineTo(-230, 210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(-230, 230, 4);

    // Bottom right corner decoration
    decorGraphics.beginPath();
    decorGraphics.moveTo(250, 230);
    decorGraphics.lineTo(210, 230);
    decorGraphics.moveTo(230, 250);
    decorGraphics.lineTo(230, 210);
    decorGraphics.strokePath();
    decorGraphics.fillStyle(0x4466ff, 0.8);
    decorGraphics.fillCircle(230, 230, 4);

    // Make the background interactive to capture clicks
    background.setInteractive();
    background.on('pointerdown', () => {
      // Consume the click but do nothing
      console.log('[Leaderboard] Blocked click on leaderboard background');
      return false;
    });

    // Add title text with sci-fi style
    const titleText = this.add
      .text(0, -250, 'GALACTIC LEADERBOARD', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);

    // Add subtitle
    const subtitleText = this.add
      .text(0, -215, 'TOP SPACE COMMANDERS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#88ccff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Create a styled close button
    const closeButtonBg = this.add.circle(220, -250, 25, 0x000022, 0.8);
    closeButtonBg.setStrokeStyle(2, 0x4466ff, 1);

    const closeButton = this.add
      .text(220, -250, 'X', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setInteractive();

    // Handle close button hover effects
    closeButton.on('pointerover', () => {
      closeButtonBg.setFillStyle(0xaa0000, 0.8);
      closeButtonBg.setStrokeStyle(2, 0xff6666, 1);
    });

    closeButton.on('pointerout', () => {
      closeButtonBg.setFillStyle(0x000022, 0.8);
      closeButtonBg.setStrokeStyle(2, 0x4466ff, 1);
    });

    // Handle close button click
    closeButton.on('pointerdown', () => {
      // Stop propagation by consuming the event
      console.log('[Leaderboard] Close button clicked');
      this.hideLeaderboard();
      return false;
    });

    // Create a themed loading indicator
    const loadingContainer = this.add.container(0, 0);

    const loadingText = this.add
      .text(0, -20, 'RETRIEVING DATA...', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#4466ff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Create loading spinner animation
    const spinner = this.add.graphics();
    spinner.lineStyle(3, 0x4466ff, 1);
    spinner.beginPath();
    spinner.arc(0, 30, 25, 0, Math.PI * 1.5);
    spinner.strokePath();

    // Animate spinner rotation
    this.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 1500,
      repeat: -1,
    });

    loadingContainer.add([loadingText, spinner]);

    // Add everything to the container
    this.leaderboardPopup.add([
      fullscreenBlock,
      background,
      headerBg,
      decorGraphics,
      titleText,
      subtitleText,
      closeButtonBg,
      closeButton,
      loadingContainer,
    ]);

    // Set initial visibility and depth
    this.leaderboardPopup.setVisible(false);
    this.leaderboardPopup.setDepth(100);

    // Ensure the entire container blocks clicks
    this.input.on(
      'gameobjectdown',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (
          this.leaderboardVisible &&
          (this.leaderboardPopup.list.includes(gameObject as Phaser.GameObjects.GameObject) ||
            gameObject === this.leaderboardPopup)
        ) {
          console.log('[Leaderboard] Click intercepted on leaderboard element');
          return false;
        }
      }
    );
  }

  private async showLeaderboard(): Promise<void> {
    if (this.leaderboardVisible) {
      console.log('[Leaderboard] Leaderboard is already visible, ignoring showLeaderboard call');
      return;
    }

    console.log('[Leaderboard] Opening leaderboard popup');
    this.leaderboardVisible = true;
    this.leaderboardPopup.setVisible(true);

    try {
      // Make all children except loading text invisible while we load
      for (let i = 0; i < this.leaderboardPopup.list.length - 1; i++) {
        const item = this.leaderboardPopup.list[i] as unknown as Phaser.GameObjects.GameObject & {
          setVisible: (visible: boolean) => void;
        };
        if (item && typeof item.setVisible === 'function') {
          item.setVisible(true);
        }
      }

      console.log('[Leaderboard] Fetching leaderboard data...');
      const startTime = performance.now();

      // Fetch the leaderboard data - get exactly 10 scores to display
      const leaderboardData = await getLeaderboard(10);

      const endTime = performance.now();
      console.log(`[Leaderboard] Data fetched in ${(endTime - startTime).toFixed(2)}ms`);
      console.log('[Leaderboard] Retrieved data:', JSON.stringify(leaderboardData));
      console.log(`[Leaderboard] Number of scores: ${leaderboardData.scores.length}`);

      // Remove the loading text
      const loadingText = this.leaderboardPopup.list[
        this.leaderboardPopup.list.length - 1
      ] as Phaser.GameObjects.Text;
      if (loadingText && 'destroy' in loadingText) {
        loadingText.destroy();
      }

      if (leaderboardData.scores.length === 0) {
        console.log('[Leaderboard] No scores available');

        // Create an empty galaxy graphic
        const emptyGraphic = this.add.graphics();

        // Create a small galaxy illustration
        emptyGraphic.fillStyle(0x4466ff, 0.3);
        emptyGraphic.fillCircle(0, -50, 40);
        emptyGraphic.fillStyle(0x0033aa, 0.5);
        emptyGraphic.fillCircle(0, -50, 25);
        emptyGraphic.fillStyle(0xffffff, 0.8);
        emptyGraphic.fillCircle(0, -50, 5);

        // Add some dots around to represent stars
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 20 + Math.random() * 60;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance - 50;
          const size = Math.random() * 2 + 1;
          emptyGraphic.fillStyle(0xffffff, 0.7);
          emptyGraphic.fillCircle(x, y, size);
        }

        // Create empty state container
        const emptyContainer = this.add.container(0, 0);

        // Show no scores available message with better styling
        const noScoresText = this.add
          .text(0, 20, 'NO COMMANDERS DETECTED', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '26px',
            color: '#4466ff',
            align: 'center',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);

        const encourageText = this.add
          .text(0, 60, 'Be the first to claim your place\nin the galactic rankings!', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
          })
          .setOrigin(0.5);

        // Add pulsing animation to the galaxy
        this.tweens.add({
          targets: emptyGraphic,
          alpha: { from: 0.7, to: 1 },
          scale: { from: 0.9, to: 1.1 },
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        emptyContainer.add([emptyGraphic, noScoresText, encourageText]);
        this.leaderboardPopup.add(emptyContainer);
      } else {
        console.log('[Leaderboard] Creating leaderboard UI with scores');
        // Create styled header section with background
        const headerBg = this.add.rectangle(0, -180, 460, 40, 0x0033aa, 0.6);
        headerBg.setStrokeStyle(1, 0x4466ff, 0.7);

        // Create header row with better alignment and styling
        const rankHeader = this.add
          .text(-200, -180, 'RANK', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#aaccff',
            align: 'center',
            fontStyle: 'bold',
          })
          .setOrigin(0.5, 0.5);

        const nameHeader = this.add
          .text(0, -180, 'COMMANDER', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#aaccff',
            align: 'center',
            fontStyle: 'bold',
          })
          .setOrigin(0.5, 0.5);

        const scoreHeader = this.add
          .text(180, -180, 'SCORE', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#aaccff',
            align: 'center',
            fontStyle: 'bold',
          })
          .setOrigin(0.5, 0.5);

        this.leaderboardPopup.add([headerBg, rankHeader, nameHeader, scoreHeader]);

        // Add a separator line
        const separatorLine = this.add.graphics();
        separatorLine.lineStyle(1, 0x4466ff, 0.7);
        separatorLine.beginPath();
        separatorLine.moveTo(-230, -160);
        separatorLine.lineTo(230, -160);
        separatorLine.strokePath();
        this.leaderboardPopup.add(separatorLine);

        // Create a container for scrollable content
        const scrollContainer = this.add.container(0, -130);
        this.leaderboardPopup.add(scrollContainer);

        console.log('[Leaderboard] Adding individual score entries to UI');
        // Add each score to the leaderboard (limit to 10 entries maximum)
        const scoresToDisplay = leaderboardData.scores.slice(0, 10);
        scoresToDisplay.forEach((score, index) => {
          console.log(
            `[Leaderboard] Adding score entry ${index + 1}: ${score.username} - ${score.score}`
          );
          const y = index * 40; // Position relative to scroll container

          // Create row container for each entry
          const rowContainer = this.add.container(0, y);

          // Add alternating row background for better readability
          let rowBgColor = index % 2 === 0 ? 0x223366 : 0x112244;
          // Special styling for top 3
          if (index < 3) {
            const topColors = [0x664400, 0x555555, 0x553311];
            const topColor = topColors[index] || 0x223366; // Fallback to default if undefined
            rowBgColor = topColor;
          }

          const rowBg = this.add.rectangle(0, 0, 460, 36, rowBgColor, 0.3);
          rowContainer.add(rowBg);

          // Consistent rank display for all positions
          let rankDisplay;
          // For all ranks, use the same position but with different styling
          if (index === 0) {
            // Gold medal
            rankDisplay = this.add
              .text(-200, 0, `${index + 1}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#ffcc00', // Gold color
                fontStyle: 'bold',
                align: 'center',
              })
              .setOrigin(0.5);
          } else if (index === 1) {
            // Silver medal
            rankDisplay = this.add
              .text(-200, 0, `${index + 1}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#cccccc', // Silver color
                fontStyle: 'bold',
                align: 'center',
              })
              .setOrigin(0.5);
          } else if (index === 2) {
            // Bronze medal
            rankDisplay = this.add
              .text(-200, 0, `${index + 1}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#cc8844', // Bronze color
                fontStyle: 'bold',
                align: 'center',
              })
              .setOrigin(0.5);
          } else {
            // Regular number
            rankDisplay = this.add
              .text(-200, 0, `${index + 1}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#ffffff',
                align: 'center',
              })
              .setOrigin(0.5);
          }

          // Username - truncate if too long
          let username = score.username;
          if (username.length > 15) {
            username = username.substring(0, 12) + '...';
            console.log(`[Leaderboard] Truncated username: ${score.username} -> ${username}`);
          }

          const nameText = this.add
            .text(0, 0, username, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '20px',
              color: '#ffffff',
              align: 'center',
            })
            .setOrigin(0.5);

          // Score with formatting
          const scoreText = this.add
            .text(180, 0, `${score.score.toLocaleString()}`, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '20px',
              color: '#ffffff',
              align: 'center',
            })
            .setOrigin(0.5);

          // Add special effects for top scores
          if (index < 3) {
            const glowColor = [0xffdd00, 0xdddddd, 0xddaa66][index];

            // Add subtle glow effect
            nameText.setTint(glowColor);
            scoreText.setTint(glowColor);

            // Make text slightly larger for top scores
            nameText.setFontSize(22);
            scoreText.setFontSize(22);
          }

          // Add all elements to the row
          rowContainer.add([rankDisplay, nameText, scoreText]);

          // Add row to scroll container with animation delay
          scrollContainer.add(rowContainer);

          // Initial state - slide in from right with delay based on position
          rowContainer.setX(500);
          rowContainer.setAlpha(0);

          // Animate each row in sequence
          this.tweens.add({
            targets: rowContainer,
            x: 0,
            alpha: 1,
            delay: index * 80,
            duration: 300,
            ease: 'Back.Out',
          });
        });
      }

      console.log('[Leaderboard] Adding opening animation');
      // Add a nice animation
      this.tweens.add({
        targets: this.leaderboardPopup,
        scale: { from: 0.8, to: 1 },
        alpha: { from: 0, to: 1 },
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          console.log('[Leaderboard] Opening animation completed');
        },
      });
    } catch (error) {
      console.error('[Leaderboard] Error loading leaderboard:', error);

      // Remove the loading text
      const loadingText = this.leaderboardPopup.list[
        this.leaderboardPopup.list.length - 1
      ] as Phaser.GameObjects.Text;
      if (loadingText && 'destroy' in loadingText) {
        loadingText.destroy();
      }

      // Create an error display container
      const errorContainer = this.add.container(0, 0);

      // Create warning icon
      const warningGraphic = this.add.graphics();
      warningGraphic.fillStyle(0xdd3333, 0.8);
      warningGraphic.fillTriangle(0, -80, -40, -20, 40, -20);
      warningGraphic.fillStyle(0x000000, 1);
      warningGraphic.fillRect(-4, -70, 8, 30);
      warningGraphic.fillCircle(0, -30, 4);

      // Show error message with better styling
      const errorText = this.add
        .text(0, 20, 'COMMUNICATION ERROR', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '26px',
          color: '#ff6666',
          align: 'center',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const errorDetailText = this.add
        .text(
          0,
          60,
          'Unable to establish connection with\nthe galactic database.\nPlease try again later.',
          {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
          }
        )
        .setOrigin(0.5);

      // Add retry button
      const retryButton = this.add.container(0, 120);

      const retryBg = this.add.rectangle(0, 0, 120, 40, 0x444444, 0.8);
      retryBg.setStrokeStyle(2, 0xff6666);

      const retryText = this.add
        .text(0, 0, 'RETRY', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);

      retryButton.add([retryBg, retryText]);
      retryButton.setInteractive(
        new Phaser.Geom.Rectangle(-60, -20, 120, 40),
        Phaser.Geom.Rectangle.Contains
      );

      // Add hover effects for retry button
      retryButton.on('pointerover', () => {
        retryBg.setFillStyle(0x666666, 0.8);
        retryText.setTint(0xff9999);
      });

      retryButton.on('pointerout', () => {
        retryBg.setFillStyle(0x444444, 0.8);
        retryText.setTint(0xffffff);
      });

      // Add retry functionality
      retryButton.on('pointerdown', () => {
        errorContainer.destroy();
        const loadingText = this.add
          .text(0, 0, 'RETRIEVING DATA...', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            color: '#4466ff',
            align: 'center',
          })
          .setOrigin(0.5);
        this.leaderboardPopup.add(loadingText);

        // Retry getting the leaderboard after a short delay
        this.time.delayedCall(500, () => {
          this.hideLeaderboard();
          this.time.delayedCall(300, () => {
            void this.showLeaderboard();
          });
        });
      });

      // Add flashing animation to warning icon
      this.tweens.add({
        targets: warningGraphic,
        alpha: { from: 1, to: 0.5 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      errorContainer.add([warningGraphic, errorText, errorDetailText, retryButton]);
      this.leaderboardPopup.add(errorContainer);
    }
  }

  private hideLeaderboard(): void {
    if (!this.leaderboardVisible) {
      console.log('[Leaderboard] Leaderboard is already hidden, ignoring hideLeaderboard call');
      return;
    }

    console.log('[Leaderboard] Closing leaderboard popup');

    // Add a nice animation when hiding
    this.tweens.add({
      targets: this.leaderboardPopup,
      scale: { from: 1, to: 0.8 },
      alpha: { from: 1, to: 0 },
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        console.log('[Leaderboard] Closing animation completed');
        this.leaderboardPopup.setVisible(false);

        // Important: Only set the flag to false AFTER the animation completes
        // and the cleanup is done
        this.leaderboardVisible = false;
        console.log('[Leaderboard] Clearing score entries from popup');
        // Clear all score entries but keep the first 5 elements (fullscreen block, background, title, close button, loading text)
        while (this.leaderboardPopup.list.length > 5) {
          const item = this.leaderboardPopup.list[
            this.leaderboardPopup.list.length - 1
          ] as Phaser.GameObjects.GameObject;

          // Properly clean up container objects
          if (item instanceof Phaser.GameObjects.Container) {
            console.log('[Leaderboard] Cleaning up container with', item.list.length, 'children');
            // Destroy all children in the container
            item.each((child: Phaser.GameObjects.GameObject) => {
              if (child && 'destroy' in child) {
                child.destroy();
              }
            });
          }

          if (item && 'destroy' in item) {
            item.destroy();
          } else {
            // If we can't destroy it properly, at least remove it from the container
            this.leaderboardPopup.remove(item);
          }
        }

        console.log('[Leaderboard] Recreating loading text for next open');
        // Recreate the loading text
        const loadingText = this.add
          .text(0, 0, 'Loading scores...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
          })
          .setOrigin(0.5);

        this.leaderboardPopup.add(loadingText);
      },
    });
  }

  /**
   * Generates and submits test scores for the leaderboard
   * This is a development utility function - currently disabled
   */
  /*
  private async generateTestScores(): Promise<void> {
    console.log('[TestData] Generating test scores for leaderboard...');

    // Create an array of test player names
    const testPlayers = [
      'SpaceAce',
      'StarHunter',
      'CosmicRider',
      'GalaxyQueen',
      'NebulaNinja',
      'AstroBlaster',
      'VoidWalker',
      'SolarSurfer',
      'MeteorMaster',
      'PlanetHopper',
    ];

    // Function to submit a score for a specific username
    const submitTestScore = async (username: string, score: number): Promise<void> => {
      console.log(`[TestData] Submitting score ${score} for ${username}`);
      try {
        const response = await fetch('/api/submit-test-score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, score }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`[TestData] Successfully submitted score for ${username}`);
      } catch (error) {
        console.error(`[TestData] Error submitting score for ${username}:`, error);
      }
    };

    try {
      // Show a loading message
      const loadingText = this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'Generating test scores...', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setDepth(1000);

      // Submit scores for each test player with random scores
      const promises = testPlayers.map((player, index) => {
        // Generate a random score between 100 and 1000
        const baseScore = 100 + Math.floor(Math.random() * 900);
        // Make scores somewhat descending for better visual display
        const adjustedScore = baseScore - index * 50 + Math.floor(Math.random() * 100);
        const finalScore = Math.max(50, adjustedScore);

        // Add a small delay between submissions to avoid overwhelming the server
        return new Promise<void>((resolve) => {
          setTimeout(async () => {
            await submitTestScore(player, finalScore);
            resolve();
          }, index * 200);
        });
      });

      await Promise.all(promises);

      // Remove the loading text
      loadingText.destroy();

      // Show success message
      const successText = this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'Test scores generated!', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#00ff00',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setDepth(1000);

      // Show the leaderboard after a short delay
      setTimeout(() => {
        successText.destroy();
        void this.showLeaderboard();
      }, 1500);
    } catch (error) {
      console.error('[TestData] Error generating test scores:', error);
    }
  }
  */
}
