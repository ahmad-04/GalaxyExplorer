import * as Phaser from 'phaser';
import { getInit } from '../api';

export class LoadingScene extends Phaser.Scene {
  private loadingDots!: Phaser.GameObjects.Text;
  private spinner!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private dotCount = 0;
  private spinnerAngle = 0;

  constructor() {
    super('LoadingScene');
  }

  create() {
    const { width, height } = this.scale;

    // Create a simple dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000011);

    // Add title
    this.add
      .text(width / 2, height / 2 - 100, 'GALAXY EXPLORER', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#0066ff',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5);

    // Loading text
    this.add
      .text(width / 2, height / 2 + 50, 'Loading', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#88ccff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Animated dots
    this.loadingDots = this.add
      .text(width / 2 + 60, height / 2 + 50, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#88ccff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Status text to show current loading step
    this.statusText = this.add
      .text(width / 2, height / 2 + 90, 'Initializing...', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#aaccff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Simple spinner
    this.spinner = this.add.graphics();
    this.spinner.x = width / 2;
    this.spinner.y = height / 2 + 130;

    // Animate loading dots
    this.time.addEvent({
      delay: 500,
      callback: this.updateLoadingDots,
      callbackScope: this,
      loop: true,
    });

    // Start loading process
    void this.startLoading();
  }

  private updateLoadingDots() {
    this.dotCount = (this.dotCount + 1) % 4;
    this.loadingDots.setText('.'.repeat(this.dotCount));
  }

  private drawSpinner() {
    this.spinner.clear();

    // Draw spinning circle
    this.spinner.lineStyle(4, 0x0088ff, 0.8);
    this.spinner.beginPath();
    this.spinner.arc(0, 0, 20, 0, this.spinnerAngle);
    this.spinner.strokePath();

    // Add a dot at the end
    const dotX = Math.cos(this.spinnerAngle) * 20;
    const dotY = Math.sin(this.spinnerAngle) * 20;
    this.spinner.fillStyle(0x00aaff);
    this.spinner.fillCircle(dotX, dotY, 3);

    this.spinnerAngle += 0.15;
    if (this.spinnerAngle > Math.PI * 2) {
      this.spinnerAngle = 0;
    }
  }

  override update() {
    this.drawSpinner();
  }

  private async startLoading() {
    // Simplified loading process - faster since no config loading needed
    const minLoadTime = 1200; // Minimum 1.2 seconds to show loading screen
    const startTime = Date.now();

    try {
      console.log('[LoadingScene] Starting loading process...');
      this.statusText.setText('Loading assets...');

      // Step 1: Wait for essential assets
      console.log('[LoadingScene] Checking assets...');
      await this.waitForAssetsReady();

      // Step 1.5: Fetch init info to detect published-level context
      try {
        console.log('[LoadingScene] Fetching init info for published-level context...');
        const init = await getInit();
        if (init.publishedLevel) {
          this.registry.set('publishedLevelPointer', init.publishedLevel);
          console.log(
            '[LoadingScene] Set publishedLevelPointer from init:',
            init.publishedLevel.postId,
            init.publishedLevel.title
          );
        } else {
          console.log('[LoadingScene] No publishedLevel in init response');
        }
      } catch (e) {
        // Non-fatal; proceed without published level context
        console.warn('[LoadingScene] init check failed:', e);
      }

      // Step 2: Preload MainMenu scene to ensure it's ready
      console.log('[LoadingScene] Preloading MainMenu scene...');
      this.statusText.setText('Preparing main menu...');
      await this.preloadMainMenuScene();

      // Step 3: Simple finalization (no config loading needed for main menu)
      console.log('[LoadingScene] Finalizing initialization...');
      this.statusText.setText('Finalizing...');
      await this.simpleFinalization();

      // Ensure minimum loading time for smooth UX
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadTime - elapsedTime);

      if (remainingTime > 0) {
        console.log(
          `[LoadingScene] Waiting additional ${remainingTime}ms for smooth transition...`
        );
        this.statusText.setText('Ready!');
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      console.log('[LoadingScene] Loading complete, transitioning to MainMenu...');
      this.statusText.setText('Starting...');

      // Fade out effect
      this.cameras.main.fadeOut(500, 0, 0, 0);

      // Start main menu after fade
      this.time.delayedCall(500, () => {
        this.scene.start('MainMenu');
      });
    } catch (error) {
      console.error('[LoadingScene] Error during loading:', error);
      // Even if there's an error, proceed to main menu after a delay
      this.time.delayedCall(3000, () => {
        this.scene.start('MainMenu');
      });
    }
  }

  private async waitForAssetsReady(): Promise<void> {
    // Check if all essential textures are loaded
    const essentialTextures = ['ship', 'bullet', 'enemy'];

    return new Promise((resolve) => {
      const checkAssets = () => {
        const allLoaded = essentialTextures.every(
          (key) => this.textures.exists(key) || this.load.textureManager.exists(key)
        );

        if (allLoaded) {
          console.log('[LoadingScene] All essential assets are ready');
          resolve();
        } else {
          // Check again in next frame
          this.time.delayedCall(100, checkAssets);
        }
      };

      checkAssets();
    });
  }

  private async preloadMainMenuScene(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Add the MainMenu scene if it's not already added
        if (!this.scene.manager.getScene('MainMenu')) {
          console.log('[LoadingScene] MainMenu scene not found, will be loaded when started');
          resolve();
          return;
        }

        // Check if MainMenu scene is ready
        const mainMenuScene = this.scene.manager.getScene('MainMenu');
        if (mainMenuScene && mainMenuScene.sys) {
          console.log('[LoadingScene] MainMenu scene is available and ready');
          resolve();
        } else {
          // Wait a bit and check again
          this.time.delayedCall(100, () => {
            console.log('[LoadingScene] MainMenu scene loaded successfully');
            resolve();
          });
        }
      } catch (error) {
        console.warn('[LoadingScene] Warning during MainMenu preload:', error);
        // Don't fail the loading process, just continue
        resolve();
      }
    });
  }

  private async simpleFinalization(): Promise<void> {
    // Simple finalization without config loading (main menu doesn't need customization)
    return new Promise((resolve) => {
      // Just ensure the game registry is accessible and ready
      try {
        const gameRegistry = this.game.registry;
        if (gameRegistry) {
          console.log(
            '[LoadingScene] Game registry is ready - no config loading needed for main menu'
          );
          resolve();
        } else {
          // Wait a bit and resolve anyway
          this.time.delayedCall(100, () => {
            console.log('[LoadingScene] Finalization complete');
            resolve();
          });
        }
      } catch (error) {
        console.warn('[LoadingScene] Warning during finalization:', error);
        // Don't fail, just continue
        resolve();
      }
    });
  }
}
