import * as Phaser from 'phaser';
import { getInit, getPublishedLevel } from '../api';

export class LoadingScene extends Phaser.Scene {
  private loadingDots?: Phaser.GameObjects.Text;
  private spinner?: Phaser.GameObjects.Graphics;
  private statusText?: Phaser.GameObjects.Text;
  private dotCount = 0;
  private spinnerAngle = 0;
  private useExternalSplash = false;

  constructor() {
    super('LoadingScene');
  }

  preload() {
    // Moved from Boot: load a minimal set of essential assets
    // Note: we no longer load a standalone 'ship' PNG; we use Aseprite mainShip or fallbacks
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('enemy', 'assets/enemy.png');
    this.load.audio('boom', 'assets/Boom.wav');
    // Background music: only loading theme
    try {
      this.load.audio('music_loading', 'assets/loading.wav');
    } catch (e) {
      /* non-fatal: background music optional */
    }

    // Load Aseprite-exported main ship (spritesheet + JSON)
    this.load.aseprite(
      'mainShip',
      'assets/Void_MainShip/export/main_ship.png',
      'assets/Void_MainShip/export/main_ship.json'
    );

    // Load engine effects (optional; will be ignored if missing on disk)
    // Base engine module (static or tagged); exported PNG+JSON expected in export/
    this.load.aseprite(
      'engineModule',
      'assets/Void_MainShip/export/engine_module.png',
      'assets/Void_MainShip/export/engine_module.json'
    );
    // Base engine idle
    this.load.aseprite(
      'engineBaseIdle',
      'assets/Void_MainShip/export/engine_base_idle.png',
      'assets/Void_MainShip/export/engine_base_idle.json'
    );
    // Base engine powering
    this.load.aseprite(
      'engineBasePower',
      'assets/Void_MainShip/export/engine_base_power.png',
      'assets/Void_MainShip/export/engine_base_power.json'
    );

    // Load Auto Cannon weapon & projectile via Aseprite exports if available
    try {
      this.load.aseprite(
        'autoCannon',
        'assets/Void_MainShip/export/auto_cannon.png',
        'assets/Void_MainShip/export/auto_cannon.json'
      );
      this.load.aseprite(
        'autoCannonProjectile',
        'assets/Void_MainShip/export/auto_cannon_projectile.png',
        'assets/Void_MainShip/export/auto_cannon_projectile.json'
      );
      // Invincibility Shield (Aseprite export expected at export/)
      this.load.aseprite(
        'invincibilityShield',
        'assets/Void_MainShip/export/invincibility_shield.png',
        'assets/Void_MainShip/export/invincibility_shield.json'
      );
    } catch {
      // Non-fatal; fallback to PNG or placeholder will be used at runtime
    }

    // Load Kla'ed enemy assets (if exported). Not fatal if missing.
    try {
      const base = "assets/Kla'ed/export";
      const loadAse = (key: string, file: string) =>
        this.load.aseprite(key, `${base}/${file}.png`, `${base}/${file}.json`);
      // Bases
      loadAse('kla_scout', 'kla_scout');
      loadAse('kla_fighter', 'kla_fighter');
      loadAse('kla_torpedo_ship', 'kla_torpedo_ship');
      loadAse('kla_bomber', 'kla_bomber');
      loadAse('kla_frigate', 'kla_frigate');
      // Removed: battlecruise assets no longer used
      // Engines / Weapons overlays optional
      loadAse('kla_scout_engine', 'kla_scout_engine');
      loadAse('kla_fighter_engine', 'kla_fighter_engine');
      loadAse('kla_torpedo_engine', 'kla_torpedo_engine');
      loadAse('kla_bomber_engine', 'kla_bomber_engine');
      loadAse('kla_frigate_engine', 'kla_frigate_engine');
      // Removed: battlecruise engine assets
      loadAse('kla_scout_weapons', 'kla_scout_weapons');
      loadAse('kla_fighter_weapons', 'kla_fighter_weapons');
      loadAse('kla_torpedo_weapons', 'kla_torpedo_weapons');
      loadAse('kla_frigate_weapons', 'kla_frigate_weapons');
      // Removed: battlecruise weapons assets
      // Projectiles
      loadAse('kla_bullet', 'kla_bullet');
      loadAse('kla_big_bullet', 'kla_big_bullet');
      loadAse('kla_torpedo', 'kla_torpedo');
      loadAse('kla_ray', 'kla_ray');
      loadAse('kla_wave', 'kla_wave');
      // Death animations
      loadAse('kla_scout_death', 'kla_scout_death');
      loadAse('kla_fighter_death', 'kla_fighter_death');
      loadAse('kla_torpedo_death', 'kla_torpedo_death');
      loadAse('kla_bomber_death', 'kla_bomber_death');
      loadAse('kla_frigate_death', 'kla_frigate_death');
      // Removed: battlecruise death assets
    } catch (e) {
      /* non-fatal: Kla'ed assets optional */
    }
  }

  create() {
    const { width, height } = this.scale;

    // If the HTML splash is present and visible, prefer it and avoid creating in-canvas loading UI
    try {
      const splash = document.getElementById('splash');
      this.useExternalSplash = !!splash && !splash.classList.contains('hidden');
    } catch {
      this.useExternalSplash = false;
    }

    // Create a simple dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000011);

    if (!this.useExternalSplash) {
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
    }

    // Do not start music here; start when MainMenu is displayed

    // Start loading process and update external splash
    this.hookSplashProgress('Initializing...');
    this.startLoading().catch((error) => {
      console.error('[LoadingScene] Fatal error in startLoading:', error);
      // Force transition to MainMenu on error
      this.time.delayedCall(2000, () => {
        this.hideSplash(true);
        this.scene.start('MainMenu');
      });
    });

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
      if (this.textures.exists('invincibilityShield')) {
        this.anims.createFromAseprite('invincibilityShield');
      }

      // Kla'ed animations
      const klaKeys = [
        'kla_scout',
        'kla_fighter',
        'kla_torpedo_ship',
        'kla_bomber',
        'kla_frigate',
        'kla_scout_engine',
        'kla_fighter_engine',
        'kla_torpedo_engine',
        'kla_bomber_engine',
        'kla_frigate_engine',
        'kla_scout_weapons',
        'kla_fighter_weapons',
        'kla_torpedo_weapons',
        'kla_frigate_weapons',
        'kla_bullet',
        'kla_big_bullet',
        'kla_torpedo',
        'kla_ray',
        'kla_wave',
        'kla_scout_death',
        'kla_fighter_death',
        'kla_torpedo_death',
        'kla_bomber_death',
        'kla_frigate_death',
      ];
      for (const k of klaKeys) {
        if (this.textures.exists(k)) {
          try {
            this.anims.createFromAseprite(k);
          } catch (e) {
            /* noop: some atlases may lack tags */
          }
        }
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
      ensureFramesAnim('invincibilityShield', 'invincibilityShield_idle', 12);
      // Kla'ed fallback loops
      const klaFallbacks = [
        'kla_scout',
        'kla_fighter',
        'kla_torpedo_ship',
        'kla_bomber',
        'kla_frigate',
        'kla_scout_engine',
        'kla_fighter_engine',
        'kla_torpedo_engine',
        'kla_bomber_engine',
        'kla_frigate_engine',
        'kla_scout_weapons',
        'kla_fighter_weapons',
        'kla_torpedo_weapons',
        'kla_frigate_weapons',
        'kla_bullet',
        'kla_big_bullet',
        'kla_torpedo',
        'kla_ray',
        'kla_wave',
        'kla_scout_death',
        'kla_fighter_death',
        'kla_torpedo_death',
        'kla_bomber_death',
        'kla_frigate_death',
      ];
      klaFallbacks.forEach((k) => ensureFramesAnim(k, `${k}_idle`, 10));
    } catch {
      // Non-fatal if not present yet; StarshipScene can lazily handle if needed
    }
  }

  private updateLoadingDots() {
    this.dotCount = (this.dotCount + 1) % 4;
    if (this.loadingDots) {
      this.loadingDots.setText('.'.repeat(this.dotCount));
    }
  }

  private drawSpinner() {
    if (!this.spinner) return;
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
    if (this.spinner) {
      this.drawSpinner();
    }
  }

  private async startLoading() {
    // Fast loading process - no artificial delays
    const startTime = Date.now();

    try {
      console.log('[LoadingScene] Starting loading process...');
      console.log('[LoadingScene] Loader queue info:', {
        totalFiles: this.load.totalToLoad,
        filesLoaded: this.load.totalComplete,
        isLoading: this.load.isLoading(),
      });

      this.statusText?.setText('Loading assets...');
      this.updateSplash(0.1, 'Starting...', 'Initializing game engine');

      // Step 1: Wait for essential assets
      console.log('[LoadingScene] Checking assets...');
      this.updateSplash(0.2, 'Loading core assets...', 'Ship, weapons, and enemies');
      await this.waitForAssetsReady();
      this.updateSplash(0.4, 'Core assets loaded', '✓ Ready to fly!');

      // Step 1.5: Fetch init info to detect published-level context (skip in dev mode)
      try {
        const dev = this.registry.get('developmentMode') === true;
        if (!dev) {
          console.log('[LoadingScene] Fetching init info for published-level context...');
          this.updateSplash(0.45, 'Checking for custom level...', 'Looking for community content');
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
        } else {
          console.log('[LoadingScene] Dev mode: skipping init fetch');
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
        const dev = this.registry.get('developmentMode') === true;
        if (!dev) {
          this.registry.set('publishedLevelLoading', true);
          console.log(
            '[LoadingScene] Preloading published level early...',
            ptr?.title || '(context)'
          );
          this.updateSplash(0.5, 'Loading community level...', ptr?.title || 'Fetching level data');
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
            this.updateSplash(0.75, 'Custom level ready!', '✓ Community creation loaded');
          } else {
            console.log('[LoadingScene] No published level available at startup');
            this.updateSplash(0.6, 'Using default campaign', 'Standard missions loaded');
          }
        } else {
          console.log('[LoadingScene] Dev mode: skipping published level preload');
          this.updateSplash(0.6, 'Using default campaign', 'Standard missions loaded');
        }
      } catch (e) {
        console.warn('[LoadingScene] Preloading published level failed (non-fatal):', e);
        this.updateSplash(0.6, 'Using default campaign', 'Standard missions ready');
      } finally {
        this.registry.set('publishedLevelLoading', false);
      }

      // Step 2: Preload MainMenu scene if needed (skip for direct launches)
      const shouldSkipMenu =
        this.registry.get('autoStartGame') || this.registry.get('autoStartBuild');
      if (!shouldSkipMenu) {
        console.log('[LoadingScene] Preloading MainMenu scene...');
        this.statusText?.setText('Preparing menu...');
        this.updateSplash(0.8, 'Preparing menu...', 'Building user interface');
        await this.preloadMainMenuScene();
      } else {
        console.log('[LoadingScene] Skipping MainMenu preload for direct launch');
        this.statusText?.setText('Preparing game...');
        this.updateSplash(0.8, 'Preparing game...', 'Almost ready to launch!');
      }

      // Step 3: Simple finalization (no config loading needed for main menu)
      console.log('[LoadingScene] Finalizing initialization...');
      this.statusText?.setText('Finalizing...');
      this.updateSplash(0.9, 'Finalizing...', 'Final preparations');
      await this.simpleFinalization();

      const elapsedTime = Date.now() - startTime;
      console.log(`[LoadingScene] Loading completed in ${elapsedTime}ms`);

      // Check if we should skip MainMenu and go straight to game (reuse variable from earlier)
      const autoStartGame = this.registry.get('autoStartGame');
      const autoStartBuild = this.registry.get('autoStartBuild');
      const skipMenu = autoStartGame || autoStartBuild;

      console.log('[LoadingScene] Launch mode check:', {
        autoStartGame,
        autoStartBuild,
        skipMenu,
      });

      this.statusText?.setText('Starting...');
      this.updateSplash(1.0, 'Ready', skipMenu ? '🚀 Launching game!' : '✓ All systems go!');

      // Quick fade out for direct launches, slower for menu
      const fadeTime = skipMenu ? 200 : 400;
      this.cameras.main.fadeOut(fadeTime, 0, 0, 0);

      // Route to appropriate scene
      this.time.delayedCall(fadeTime, () => {
        this.hideSplash();

        if (skipMenu) {
          console.log('[LoadingScene] Fast-tracking to game/build mode, skipping MainMenu');
          this.startDirectLaunch();
        } else {
          console.log('[LoadingScene] Normal flow, showing MainMenu');
          this.scene.start('MainMenu');
        }
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
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max

      const checkAssets = () => {
        attempts++;

        console.log(`[LoadingScene] Checking assets (attempt ${attempts}/${maxAttempts})...`);

        // Check each texture individually for better debugging
        const textureStatus = essentialTextures.map((key) => ({
          key,
          exists: this.textures.exists(key),
        }));

        console.log('[LoadingScene] Texture status:', textureStatus);

        const allLoaded = essentialTextures.every((key) => this.textures.exists(key));

        if (allLoaded) {
          console.log('[LoadingScene] All essential assets are ready');
          // Ensure Aseprite animations are registered
          try {
            this.anims.createFromAseprite('mainShip');
          } catch (e) {
            console.warn('[LoadingScene] Could not create mainShip animations:', e);
            // ignore if already created
          }
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error('[LoadingScene] Timeout waiting for assets after', attempts, 'attempts');
          console.error(
            '[LoadingScene] Missing textures:',
            textureStatus.filter((t) => !t.exists)
          );
          // Resolve anyway to prevent infinite hang
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
      const hint = document.getElementById('splash-hint');
      if (text) text.textContent = initial;
      if (hint) hint.textContent = 'Loading game assets...';
    } catch {
      /* noop */
    }
  }

  private updateSplash(progress: number, message: string, hint?: string) {
    try {
      const fill = document.getElementById('splash-progress-fill') as HTMLDivElement | null;
      const text = document.getElementById('splash-status');
      const hintEl = document.getElementById('splash-hint');
      const aria = document.getElementById('splash-aria');

      const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

      if (fill) {
        fill.style.width = `${percent}%`;
        // Add a smooth transition
        fill.style.transition = 'width 0.3s ease-out';
      }
      if (text) text.textContent = message;
      if (hintEl && hint) hintEl.textContent = hint;
      if (aria) aria.textContent = `${percent}% loaded`;
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

  /**
   * Direct launch to game or build mode, skipping MainMenu
   */
  private startDirectLaunch() {
    const autoStartGame = this.registry.get('autoStartGame');
    const autoStartBuild = this.registry.get('autoStartBuild');

    // Clear auto-start flags
    this.registry.set('autoStartGame', false);
    this.registry.set('autoStartBuild', false);

    if (autoStartBuild) {
      console.log('[LoadingScene] Direct launch to BuildModeScene');
      const buildAction = this.registry.get('buildAction') || 'design';
      const showBuildTutorial = this.registry.get('showBuildTutorial');

      if (showBuildTutorial) {
        this.scene.start('BuildModeScene', { action: 'tutorial' });
      } else {
        this.scene.start('BuildModeScene', { action: buildAction });
      }
    } else if (autoStartGame) {
      console.log('[LoadingScene] Direct launch to game');

      // Get ship configuration
      const shipConfig = this.registry.get('shipConfig') || {
        ship: 'ship',
        primaryTint: 0xffffff,
        secondaryTint: 0xffffff,
      };

      // Check for custom level
      const levelData = this.registry.get('testLevelData');
      const gameType = this.registry.get('gameType');
      const challengeMode = this.registry.get('challengeMode');

      console.log('[LoadingScene] Game launch config:', {
        hasCustomLevel: !!levelData,
        gameType,
        challengeMode,
        hasShipConfig: !!shipConfig,
      });

      // If we have a custom level, launch StarshipScene with it
      if (levelData) {
        const payload = {
          ...shipConfig,
          levelData,
          testMode: false,
          buildModeTest: false,
        };
        console.log('[LoadingScene] Launching StarshipScene with custom level');
        this.scene.start('StarshipScene', payload);
      } else {
        // Launch endless mode
        console.log('[LoadingScene] Launching EndlessScene');
        this.scene.start('EndlessScene', shipConfig);
      }
    }
  }
}
