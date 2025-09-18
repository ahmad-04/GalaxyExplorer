import * as Phaser from 'phaser';
import { getInit, getPublishedLevel } from '../api';

export class LoadingScene extends Phaser.Scene {
  private loadingDots!: Phaser.GameObjects.Text;
  private spinner!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private dotCount = 0;
  private spinnerAngle = 0;

  constructor() {
    super('LoadingScene');
  }

  preload() {
    // Moved from Boot: load a minimal set of essential assets
    this.load.image('ship', '/assets/ship.png');
    this.load.image('bullet', '/assets/bullet.png');
    this.load.image('enemy', '/assets/enemy.png');
    this.load.audio('boom', '/assets/Boom.wav');

    // Load Aseprite-exported main ship (spritesheet + JSON)
    this.load.aseprite(
      'mainShip',
      '/assets/Void_MainShip/export/main_ship.png',
      '/assets/Void_MainShip/export/main_ship.json'
    );

  // Load engine effects (optional; will be ignored if missing on disk)
    // Base engine module (static or tagged); exported PNG+JSON expected in export/
    this.load.aseprite(
      'engineModule',
      '/assets/Void_MainShip/export/engine_module.png',
      '/assets/Void_MainShip/export/engine_module.json'
    );
    // Base engine idle
    this.load.aseprite(
      'engineBaseIdle',
      '/assets/Void_MainShip/export/engine_base_idle.png',
      '/assets/Void_MainShip/export/engine_base_idle.json'
    );
    // Base engine powering
    this.load.aseprite(
      'engineBasePower',
      '/assets/Void_MainShip/export/engine_base_power.png',
      '/assets/Void_MainShip/export/engine_base_power.json'
    );

    // Load Auto Cannon weapon & projectile via Aseprite exports if available
    try {
      this.load.aseprite(
        'autoCannon',
        '/assets/Void_MainShip/export/auto_cannon.png',
        '/assets/Void_MainShip/export/auto_cannon.json'
      );
      this.load.aseprite(
        'autoCannonProjectile',
        '/assets/Void_MainShip/export/auto_cannon_projectile.png',
        '/assets/Void_MainShip/export/auto_cannon_projectile.json'
      );
    } catch {
      // Non-fatal; fallback to PNG or placeholder will be used at runtime
    }
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

    // Start loading process and update external splash
    this.hookSplashProgress('Initializing...');
    void this.startLoading();

    // Register animations from Aseprite once available
    try {
      if (this.textures.exists('mainShip')) {
        this.anims.createFromAseprite('mainShip');
      }
      if (this.textures.exists('engineModule')) {
        this.anims.createFromAseprite('engineModule');
      }
      if (this.textures.exists('engineBaseIdle')) {
        this.anims.createFromAseprite('engineBaseIdle');
      }
      if (this.textures.exists('engineBasePower')) {
        this.anims.createFromAseprite('engineBasePower');
      }
      // Register auto cannon animations if present
      if (this.textures.exists('autoCannon')) {
        this.anims.createFromAseprite('autoCannon');
      }
      if (this.textures.exists('autoCannonProjectile')) {
        this.anims.createFromAseprite('autoCannonProjectile');
      }

      // Fallback: if tags weren't exported, build simple looping animations from frames
      const ensureFramesAnim = (texKey: string, animKey: string, frameRate = 10) => {
        try {
          if (!this.textures.exists(texKey) || this.anims.exists(animKey)) return;
          const tex = this.textures.get(texKey);
          // getFrameNames() returns frame names; sort to keep numeric order if present
          const names = tex
            .getFrameNames()
            .filter((n) => n !== '__BASE')
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          if (names.length > 0) {
            this.anims.create({
              key: animKey,
              frames: names.map((n) => ({ key: texKey, frame: n })),
              frameRate,
              repeat: -1,
            });
          }
        } catch {
          /* noop */
        }
      };

      ensureFramesAnim('engineBaseIdle', 'engineIdle', 8);
  ensureFramesAnim('engineBasePower', 'enginePower', 14);
  ensureFramesAnim('autoCannon', 'autoCannon_idle', 10);
  ensureFramesAnim('autoCannonProjectile', 'autoCannonProjectile_idle', 10);
    } catch {
      // Non-fatal if not present yet; StarshipScene can lazily handle if needed
    }
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
      this.updateSplash(0.1, 'Loading assets...');

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

      // Step 1.6: If we have a pointer or context, preload the published level now
      try {
        const ptr = this.registry.get('publishedLevelPointer') as
          | { postId?: string; title?: string }
          | undefined;
        this.registry.set('publishedLevelLoading', true);
        console.log(
          '[LoadingScene] Preloading published level early...',
          ptr?.title || '(context)'
        );
        this.updateSplash(0.5, 'Loading community level...');
        let resp;
        if (ptr?.postId) {
          resp = await getPublishedLevel(ptr.postId);
        } else {
          resp = await getPublishedLevel();
        }
        if (resp?.level) {
          this.registry.set('testLevelData', resp.level);
          this.registry.set('buildModeTest', false);
          this.registry.set('testMode', false);
          if (ptr) this.registry.set('publishedLevelPointer', undefined);
          console.log('[LoadingScene] Published level preloaded successfully:', resp.postId);
          this.updateSplash(0.7, 'Level ready');
        } else {
          console.log('[LoadingScene] No published level available at startup');
        }
      } catch (e) {
        console.warn('[LoadingScene] Preloading published level failed (non-fatal):', e);
      } finally {
        this.registry.set('publishedLevelLoading', false);
      }

      // Step 2: Preload MainMenu scene to ensure it's ready
      console.log('[LoadingScene] Preloading MainMenu scene...');
      this.statusText.setText('Preparing main menu...');
      this.updateSplash(0.6, 'Preparing main menu...');
      await this.preloadMainMenuScene();

      // Step 3: Simple finalization (no config loading needed for main menu)
      console.log('[LoadingScene] Finalizing initialization...');
      this.statusText.setText('Finalizing...');
      this.updateSplash(0.9, 'Finalizing...');
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
      this.updateSplash(1.0, 'Ready');

      // Fade out effect
      this.cameras.main.fadeOut(500, 0, 0, 0);

      // Start main menu after fade
      this.time.delayedCall(500, () => {
        this.hideSplash();
        this.scene.start('MainMenu');
      });
    } catch (error) {
      console.error('[LoadingScene] Error during loading:', error);
      // Even if there's an error, proceed to main menu after a delay
      this.time.delayedCall(3000, () => {
        this.hideSplash(true);
        this.scene.start('MainMenu');
      });
    }
  }

  private async waitForAssetsReady(): Promise<void> {
    // Check if all essential textures are loaded
    const essentialTextures = ['bullet', 'enemy', 'mainShip'];

    return new Promise((resolve) => {
      const checkAssets = () => {
        const allLoaded = essentialTextures.every(
          (key) => this.textures.exists(key) || this.load.textureManager.exists(key)
        );

        if (allLoaded) {
          console.log('[LoadingScene] All essential assets are ready');
          // Ensure Aseprite animations are registered
          try {
            this.anims.createFromAseprite('mainShip');
          } catch {
            // ignore if already created
          }
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

  // --- HTML Splash integration ---
  private hookSplashProgress(initial: string) {
    try {
      const text = document.getElementById('splash-status');
      if (text) text.textContent = initial;
    } catch {
      /* noop */
    }
  }

  private updateSplash(progress: number, message: string) {
    try {
      const fill = document.getElementById('splash-progress-fill') as HTMLDivElement | null;
      const text = document.getElementById('splash-status');
      const aria = document.getElementById('splash-aria');
      if (fill) fill.style.width = `${Math.min(100, Math.max(0, Math.round(progress * 100)))}%`;
      if (text) text.textContent = message;
      if (aria) aria.textContent = `${Math.round(progress * 100)}% loaded`;
    } catch {
      /* noop */
    }
  }

  private hideSplash(force = false) {
    try {
      const splash = document.getElementById('splash');
      if (!splash) return;
      if (force) {
        splash.remove();
        return;
      }
      splash.classList.add('hidden');
      // Remove after transition
      window.setTimeout(() => splash.remove(), 260);
    } catch {
      /* noop */
    }
  }
}
