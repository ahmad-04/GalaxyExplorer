/**
 * PublishStep.ts
 * Final step in the Build Mode workflow
 * Handles publishing and sharing the created level
 */

import * as Phaser from 'phaser';
import { BuildModeManager } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { isFeatureEnabled } from '../../../../shared/config';

/**
 * Publish step in the Build Mode workflow
 * Provides UI for publishing, sharing, and finalizing the level
 */
export class PublishStep {
  private scene: Phaser.Scene;
  private manager: BuildModeManager; // stored for future navigation / feature flags
  private service: BuildModeService;

  // UI elements
  private container!: Phaser.GameObjects.Container;
  private publishContainer!: Phaser.GameObjects.Container;
  private successContainer!: Phaser.GameObjects.Container;

  // Level data
  private levelId: string | undefined;
  private levelName: string = 'Untitled Level';
  private levelAuthor: string = 'Anonymous';

  // Publishing state
  private isPublished: boolean = false;
  private publishId: string | undefined;
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
    console.log(`[PublishStep] Activating with levelId: ${levelId || 'none'}`);
    // Reference manager (reserved for future publish policies / permissions)
    void this.manager;
    this.levelId = levelId;

    // Load level data
    if (levelId) {
      const levelData = this.service.loadLevel(levelId);
      if (levelData) {
        this.levelName = levelData.settings.name;
        this.levelAuthor = levelData.settings.author;

        // Check if level is already published
        const levelMetadata = this.service.getLevelMetadata(levelId);
        if (levelMetadata) {
          this.isPublished = levelMetadata.isPublished;
          this.publishId = levelMetadata.publishId;
        }
      }
    }

    // Create the UI
    this.createUI();
  }

  /**
   * Deactivate this step
   */
  deactivate(): void {
    console.log('[PublishStep] Deactivating');

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

    // Background with gradient effect
    const bg = this.scene.add.rectangle(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height - 60,
      0x111122
    );
    bg.setOrigin(0, 0);

    // Add background gradient overlay
    const bgGradient = this.scene.add.graphics();
    bgGradient.fillGradientStyle(0x1a1a3a, 0x1a1a3a, 0x0a0a20, 0x0a0a20, 0.8);
    bgGradient.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height - 60);

    this.container.add([bg, bgGradient]);

    // Add background stars
    this.createBackgroundStars();

    // Add header with gradient
    const headerBg = this.scene.add.rectangle(0, 0, this.scene.scale.width, 60, 0x222244);
    headerBg.setOrigin(0, 0);

    // Add highlight line at bottom of header
    const headerHighlight = this.scene.add.rectangle(0, 59, this.scene.scale.width, 2, 0x4444aa);
    headerHighlight.setOrigin(0, 0);

    const title = this.scene.add
      .text(20, 30, 'PUBLISH YOUR LEVEL', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#4444ff',
        strokeThickness: 1,
      })
      .setOrigin(0, 0.5);

    // Add subtle pulse animation to title
    this.scene.tweens.add({
      targets: title,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.container.add([headerBg, headerHighlight, title]);

    // Create publish form container
    this.publishContainer = this.scene.add.container(this.scene.scale.width / 2, 250);
    this.container.add(this.publishContainer);

    // Create success container (hidden initially)
    this.successContainer = this.scene.add.container(this.scene.scale.width / 2, 250);
    this.container.add(this.successContainer);
    this.successContainer.setVisible(false);

    // Create publish form or success message based on publish state
    if (this.isPublished) {
      this.createSuccessMessage();
      this.publishContainer.setVisible(false);
      this.successContainer.setVisible(true);
    } else {
      this.createPublishForm();
    }

    // Add step navigation buttons
    this.createStepNavigation();
  }

  /**
   * Create the publishing form
   */
  private createPublishForm(): void {
    // Form background with gradient
    const formBg = this.scene.add.graphics();
    formBg.fillStyle(0x222244, 1);
    formBg.fillRoundedRect(-250, -175, 500, 350, 16);
    formBg.lineStyle(2, 0x4444aa, 1);
    formBg.strokeRoundedRect(-250, -175, 500, 350, 16);

    // Add highlight/glow effect at top of panel
    const highlight = this.scene.add.graphics();
    highlight.fillGradientStyle(0x4444ff, 0x4444ff, 0x2222aa, 0x2222aa, 0.3);
    highlight.fillRoundedRect(-250, -175, 500, 60, { tl: 16, tr: 16, bl: 0, br: 0 });

    this.publishContainer.add([formBg, highlight]);

    // Form title with glowing effect
    const formTitle = this.scene.add
      .text(0, -150, 'FINALIZE YOUR LEVEL', {
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#4444ff',
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Add glow effect to title (no variable retained to avoid unused warning)
    this.scene.tweens.add({
      targets: formTitle,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.publishContainer.add(formTitle);

    // Level info section
    const levelInfoTitle = this.scene.add
      .text(-220, -100, 'LEVEL INFORMATION', {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Level name display
    const levelNameLabel = this.scene.add
      .text(-220, -60, 'Level Name:', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    const levelNameValue = this.scene.add
      .text(-100, -60, this.levelName, {
        fontSize: '16px',
        color: '#ffff00',
      })
      .setOrigin(0, 0.5);

    // Author display
    const authorLabel = this.scene.add
      .text(-220, -30, 'Author:', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    const authorValue = this.scene.add
      .text(-100, -30, this.levelAuthor, {
        fontSize: '16px',
        color: '#ffff00',
      })
      .setOrigin(0, 0.5);

    // Sharing options section - only visible if sharing feature is enabled
    const sharingEnabled = isFeatureEnabled('ENABLE_BUILD_MODE_SHARING');

    // Create a container for the publish button for better styling
    const publishBtnContainer = this.scene.add.container(0, 100);

    // Button background with gradient
    const btnBg = this.scene.add.graphics();
    btnBg.fillGradientStyle(0x0088ff, 0x0066dd, 0x0044aa, 0x0066dd, 1);
    btnBg.fillRoundedRect(-100, -20, 200, 40, 8);
    btnBg.lineStyle(2, 0x44aaff, 1);
    btnBg.strokeRoundedRect(-100, -20, 200, 40, 8);

    // Button text
    const publishButtonText = this.scene.add
      .text(0, 0, 'PUBLISH LEVEL', {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0033aa',
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Add button shadow
    const btnShadow = this.scene.add.graphics();
    btnShadow.fillStyle(0x000000, 0.3);
    btnShadow.fillRoundedRect(-98, -18, 200, 40, 8);

    // Add components to button container
    publishBtnContainer.add([btnShadow, btnBg, publishButtonText]);

    // Add to main container
    this.publishContainer.add(publishBtnContainer);

    // Make button interactive with hover and click effects
    btnBg
      .setInteractive(new Phaser.Geom.Rectangle(-100, -20, 200, 40), Phaser.Geom.Rectangle.Contains)
      .on('pointerover', () => {
        btnBg.clear();
        btnBg.fillGradientStyle(0x44aaff, 0x0088ff, 0x0066cc, 0x0088ff, 1);
        btnBg.fillRoundedRect(-100, -20, 200, 40, 8);
        btnBg.lineStyle(2, 0x88ccff, 1);
        btnBg.strokeRoundedRect(-100, -20, 200, 40, 8);
      })
      .on('pointerout', () => {
        btnBg.clear();
        btnBg.fillGradientStyle(0x0088ff, 0x0066dd, 0x0044aa, 0x0066dd, 1);
        btnBg.fillRoundedRect(-100, -20, 200, 40, 8);
        btnBg.lineStyle(2, 0x44aaff, 1);
        btnBg.strokeRoundedRect(-100, -20, 200, 40, 8);
      })
      .on('pointerdown', () => {
        btnBg.clear();
        btnBg.fillGradientStyle(0x0066cc, 0x0044aa, 0x003388, 0x0044aa, 1);
        btnBg.fillRoundedRect(-100, -20, 200, 40, 8);
        btnBg.lineStyle(2, 0x0066cc, 1);
        btnBg.strokeRoundedRect(-100, -20, 200, 40, 8);

        // Add click animation
        this.scene.tweens.add({
          targets: publishBtnContainer,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true,
          onComplete: () => this.publishLevel(),
        });
      });

    // Add disclaimer based on whether sharing is enabled
    const disclaimer = this.scene.add
      .text(
        0,
        150,
        sharingEnabled
          ? 'By publishing, you agree to share this level with other players.'
          : 'Publishing will save this level as complete in your local collection.',
        {
          fontSize: '14px',
          color: '#aaaaaa',
          align: 'center',
          wordWrap: { width: 400 },
        }
      )
      .setOrigin(0.5);

    // Add everything to container
    this.publishContainer.add([
      levelInfoTitle,
      levelNameLabel,
      levelNameValue,
      authorLabel,
      authorValue,
      disclaimer,
    ]);

    // Add sharing options if enabled
    if (sharingEnabled) {
      this.addSharingOptions();
    }
  }

  /**
   * Add sharing options to the publish form
   * Only called if sharing is enabled
   */
  private addSharingOptions(): void {
    const sharingTitle = this.scene.add
      .text(-220, 20, 'SHARING OPTIONS', {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Sharing checkbox
    const shareCheckboxBg = this.scene.add.rectangle(-210, 50, 20, 20, 0x555555);
    shareCheckboxBg.setOrigin(0.5);
    shareCheckboxBg.setStrokeStyle(1, 0xaaaaaa);

    // Checkmark (shown when selected)
    const checkmark = this.scene.add
      .text(-210, 50, '✓', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Initially checked
    shareCheckboxBg.setData('checked', true);

    // Label
    const shareLabel = this.scene.add
      .text(-190, 50, 'Share with community leaderboards', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    // Make checkbox interactive
    shareCheckboxBg.setInteractive({ useHandCursor: true });
    shareCheckboxBg.on('pointerdown', () => {
      const isChecked = !shareCheckboxBg.getData('checked');
      shareCheckboxBg.setData('checked', isChecked);
      checkmark.setVisible(isChecked);

      if (isChecked) {
        shareCheckboxBg.setFillStyle(0x0066cc, 1);
      } else {
        shareCheckboxBg.setFillStyle(0x555555, 1);
      }
    });

    this.publishContainer.add([sharingTitle, shareCheckboxBg, checkmark, shareLabel]);
  }

  /**
   * Create the success message after publishing
   */
  private createSuccessMessage(): void {
    // Create container for success message
    const successContent = this.scene.add.container(0, 0);

    // Success panel with gradient background
    const successBg = this.scene.add.graphics();
    successBg.fillGradientStyle(0x224433, 0x224433, 0x112211, 0x112211, 1);
    successBg.fillRoundedRect(-250, -150, 500, 300, 16);
    successBg.lineStyle(2, 0x00aa44, 1);
    successBg.strokeRoundedRect(-250, -150, 500, 300, 16);

    // Add glow effect around the panel
    const glowEffect = this.scene.add.graphics();
    glowEffect.fillStyle(0x00ff66, 0.2);
    glowEffect.fillRoundedRect(-260, -160, 520, 320, 20);

    // Success icon with pulsing animation
    const iconContainer = this.scene.add.container(0, -100);
    const iconBackground = this.scene.add.circle(0, 0, 40, 0x00aa44);
    const successIcon = this.scene.add
      .text(0, 0, '✓', {
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#004422',
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    iconContainer.add([iconBackground, successIcon]);

    // Add pulse animation to icon
    this.scene.tweens.add({
      targets: iconContainer,
      scale: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Success title with glow effect
    const successTitle = this.scene.add
      .text(0, -40, 'LEVEL PUBLISHED!', {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#00aa44',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Level info with styled container
    const levelInfoBg = this.scene.add.graphics();
    levelInfoBg.fillStyle(0x001100, 0.4);
    levelInfoBg.fillRoundedRect(-200, -5, 400, 30, 6);
    levelInfoBg.lineStyle(1, 0x00aa44, 0.6);
    levelInfoBg.strokeRoundedRect(-200, -5, 400, 30, 6);

    const levelInfo = this.scene.add
      .text(0, 10, `"${this.levelName}" by ${this.levelAuthor}`, {
        fontSize: '18px',
        color: '#33ff99',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // Sharing info if sharing is enabled
    const sharingEnabled = isFeatureEnabled('ENABLE_BUILD_MODE_SHARING');
    const sharingInfo = this.scene.add
      .text(
        0,
        50,
        sharingEnabled
          ? 'Your level is now available for other players to enjoy!'
          : 'Your level has been finalized and saved to your collection.',
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 400 },
        }
      )
      .setOrigin(0.5);

    // Create new level button container
    const newLevelBtnContainer = this.scene.add.container(0, 100);

    // Button background with gradient
    const newLevelBtnBg = this.scene.add.graphics();
    newLevelBtnBg.fillGradientStyle(0x0088cc, 0x0077aa, 0x006699, 0x0077aa, 1);
    newLevelBtnBg.fillRoundedRect(-100, -20, 200, 40, 8);
    newLevelBtnBg.lineStyle(2, 0x44aaff, 1);
    newLevelBtnBg.strokeRoundedRect(-100, -20, 200, 40, 8);

    // Button text
    const newLevelBtnText = this.scene.add
      .text(0, 0, 'CREATE NEW LEVEL', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add components to button container
    newLevelBtnContainer.add([newLevelBtnBg, newLevelBtnText]);

    // Make button interactive with hover effects
    newLevelBtnBg
      .setInteractive(new Phaser.Geom.Rectangle(-100, -20, 200, 40), Phaser.Geom.Rectangle.Contains)
      .on('pointerover', () => {
        newLevelBtnBg.clear();
        newLevelBtnBg.fillGradientStyle(0x44aaff, 0x0088cc, 0x0077bb, 0x0088cc, 1);
        newLevelBtnBg.fillRoundedRect(-100, -20, 200, 40, 8);
        newLevelBtnBg.lineStyle(2, 0x88ccff, 1);
        newLevelBtnBg.strokeRoundedRect(-100, -20, 200, 40, 8);
      })
      .on('pointerout', () => {
        newLevelBtnBg.clear();
        newLevelBtnBg.fillGradientStyle(0x0088cc, 0x0077aa, 0x006699, 0x0077aa, 1);
        newLevelBtnBg.fillRoundedRect(-100, -20, 200, 40, 8);
        newLevelBtnBg.lineStyle(2, 0x44aaff, 1);
        newLevelBtnBg.strokeRoundedRect(-100, -20, 200, 40, 8);
      })
      .on('pointerdown', () => {
        // Add click animation
        this.scene.tweens.add({
          targets: newLevelBtnContainer,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true,
          onComplete: () => {
            this.scene.scene.start('BuildModeScene');
          },
        });
      });

    // Add everything to success content container
    successContent.add([
      glowEffect,
      successBg,
      iconContainer,
      successTitle,
      levelInfoBg,
      levelInfo,
      sharingInfo,
      newLevelBtnContainer,
    ]);

    // Add to main success container
    this.successContainer.add(successContent);

    // Add sharing button if enabled
    if (sharingEnabled && this.publishId) {
      // Create share button container
      const shareBtnContainer = this.scene.add.container(0, 150);

      // Button background with gradient
      const shareBtnBg = this.scene.add.graphics();
      shareBtnBg.fillGradientStyle(0x00aa44, 0x008833, 0x007722, 0x008833, 1);
      shareBtnBg.fillRoundedRect(-80, -20, 160, 40, 8);
      shareBtnBg.lineStyle(2, 0x00cc66, 1);
      shareBtnBg.strokeRoundedRect(-80, -20, 160, 40, 8);

      // Share icon
      const shareIcon = this.scene.add
        .text(-60, 0, '↗', {
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // Button text
      const shareBtnText = this.scene.add
        .text(0, 0, 'SHARE LEVEL', {
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // Add components to button container
      shareBtnContainer.add([shareBtnBg, shareIcon, shareBtnText]);

      // Make button interactive with hover effects
      shareBtnBg
        .setInteractive(
          new Phaser.Geom.Rectangle(-80, -20, 160, 40),
          Phaser.Geom.Rectangle.Contains
        )
        .on('pointerover', () => {
          shareBtnBg.clear();
          shareBtnBg.fillGradientStyle(0x00cc66, 0x00aa44, 0x009933, 0x00aa44, 1);
          shareBtnBg.fillRoundedRect(-80, -20, 160, 40, 8);
          shareBtnBg.lineStyle(2, 0x00ff88, 1);
          shareBtnBg.strokeRoundedRect(-80, -20, 160, 40, 8);
        })
        .on('pointerout', () => {
          shareBtnBg.clear();
          shareBtnBg.fillGradientStyle(0x00aa44, 0x008833, 0x007722, 0x008833, 1);
          shareBtnBg.fillRoundedRect(-80, -20, 160, 40, 8);
          shareBtnBg.lineStyle(2, 0x00cc66, 1);
          shareBtnBg.strokeRoundedRect(-80, -20, 160, 40, 8);
        })
        .on('pointerdown', () => {
          // Add click animation
          this.scene.tweens.add({
            targets: shareBtnContainer,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 50,
            yoyo: true,
            onComplete: () => this.shareLevel(),
          });
        });

      // Add to success container with scale animation
      successContent.add(shareBtnContainer);
    }
  }

  /**
   * Create navigation buttons between steps
   */
  private createStepNavigation(): void {
    // Navigation container
    const navContainer = this.scene.add.container(0, 0);

    // Back button (to Test step) with container for better styling
    const backBtnContainer = this.scene.add.container(
      this.scene.scale.width - 180,
      this.scene.scale.height - 40
    );

    // Back button background with gradient
    const backBtnBg = this.scene.add.graphics();
    backBtnBg.fillGradientStyle(0x666699, 0x555577, 0x444466, 0x555577, 1);
    backBtnBg.fillRoundedRect(-80, -15, 160, 30, 6);
    backBtnBg.lineStyle(2, 0x8888aa, 1);
    backBtnBg.strokeRoundedRect(-80, -15, 160, 30, 6);

    // Back button text
    const backBtnText = this.scene.add
      .text(0, 0, '< Back to Test', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add to back button container
    backBtnContainer.add([backBtnBg, backBtnText]);

    // Make back button interactive with hover effects
    backBtnBg
      .setInteractive(new Phaser.Geom.Rectangle(-80, -15, 160, 30), Phaser.Geom.Rectangle.Contains)
      .on('pointerover', () => {
        backBtnBg.clear();
        backBtnBg.fillGradientStyle(0x8888aa, 0x777799, 0x666688, 0x777799, 1);
        backBtnBg.fillRoundedRect(-80, -15, 160, 30, 6);
        backBtnBg.lineStyle(2, 0xaaaacc, 1);
        backBtnBg.strokeRoundedRect(-80, -15, 160, 30, 6);
      })
      .on('pointerout', () => {
        backBtnBg.clear();
        backBtnBg.fillGradientStyle(0x666699, 0x555577, 0x444466, 0x555577, 1);
        backBtnBg.fillRoundedRect(-80, -15, 160, 30, 6);
        backBtnBg.lineStyle(2, 0x8888aa, 1);
        backBtnBg.strokeRoundedRect(-80, -15, 160, 30, 6);
      })
      .on('pointerdown', () => {
        // Add click animation
        this.scene.tweens.add({
          targets: backBtnContainer,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true,
          onComplete: () => {
            // Change to Test step
            this.scene.events.emit('step:change', 'test', this.levelId);
          },
        });
      });

    // Main menu button with container for better styling
    const menuBtnContainer = this.scene.add.container(
      this.scene.scale.width - 60,
      this.scene.scale.height - 40
    );

    // Menu button background with gradient
    const menuBtnBg = this.scene.add.graphics();
    menuBtnBg.fillGradientStyle(0x0088cc, 0x0077aa, 0x006699, 0x0077aa, 1);
    menuBtnBg.fillRoundedRect(-60, -15, 120, 30, 6);
    menuBtnBg.lineStyle(2, 0x44aaff, 1);
    menuBtnBg.strokeRoundedRect(-60, -15, 120, 30, 6);

    // Menu button text
    const menuBtnText = this.scene.add
      .text(0, 0, 'Main Menu', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add to menu button container
    menuBtnContainer.add([menuBtnBg, menuBtnText]);

    // Make menu button interactive with hover effects
    menuBtnBg
      .setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains)
      .on('pointerover', () => {
        menuBtnBg.clear();
        menuBtnBg.fillGradientStyle(0x44aaff, 0x0088cc, 0x0077bb, 0x0088cc, 1);
        menuBtnBg.fillRoundedRect(-60, -15, 120, 30, 6);
        menuBtnBg.lineStyle(2, 0x88ccff, 1);
        menuBtnBg.strokeRoundedRect(-60, -15, 120, 30, 6);
      })
      .on('pointerout', () => {
        menuBtnBg.clear();
        menuBtnBg.fillGradientStyle(0x0088cc, 0x0077aa, 0x006699, 0x0077aa, 1);
        menuBtnBg.fillRoundedRect(-60, -15, 120, 30, 6);
        menuBtnBg.lineStyle(2, 0x44aaff, 1);
        menuBtnBg.strokeRoundedRect(-60, -15, 120, 30, 6);
      })
      .on('pointerdown', () => {
        // Add click animation
        this.scene.tweens.add({
          targets: menuBtnContainer,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true,
          onComplete: () => {
            // Change to main menu
            this.scene.scene.start('MainMenu');
          },
        });
      });

    // Add buttons to navigation container
    navContainer.add([backBtnContainer, menuBtnContainer]);

    // Add to main container
    this.container.add(navContainer);
  }

  /**
   * Publish the level
   */
  private publishLevel(): void {
    if (!this.levelId) {
      console.error('[PublishStep] Cannot publish level: No level ID');
      this.showToast('Error: No level selected', 'error');
      return;
    }

    console.log(`[PublishStep] Publishing level ${this.levelId}`);

    // Show loading indicator
    const loadingOverlay = this.createLoadingOverlay('Publishing your level...');
    this.container.add(loadingOverlay);

    // Add loading animation
    const progressBar = loadingOverlay.getByName('progressBar') as Phaser.GameObjects.Graphics;
    const progressValue = { value: 0 };
    const progressTween = this.scene.tweens.add({
      targets: progressValue,
      value: 100,
      duration: 1500,
      onUpdate: () => {
        progressBar.clear();
        progressBar.fillStyle(0x4444ff, 1);
        progressBar.fillRect(-100, -8, 200 * (progressValue.value / 100), 16);
      },
    });

    // Publish the level
    this.service
      .publishLevel(this.levelId)
      .then((publishId) => {
        console.log(`[PublishStep] Level published with ID ${publishId}`);
        this.isPublished = true;
        this.publishId = publishId;

        // Complete loading animation
        progressTween.complete();

        // Show success animation
        this.scene.tweens.add({
          targets: loadingOverlay,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            // Remove loading overlay
            loadingOverlay.destroy();

            // Show success message
            this.publishContainer.setVisible(false);

            // Show success toast
            this.showToast('Level published successfully!', 'success');

            // Create and show success container with scale animation
            this.createSuccessMessage();
            this.successContainer.setVisible(true);
            this.successContainer.setScale(0.8);

            // Add reveal animation for success container
            this.scene.tweens.add({
              targets: this.successContainer,
              scaleX: 1,
              scaleY: 1,
              duration: 300,
              ease: 'Back.easeOut',
            });
          },
        });
      })
      .catch((error) => {
        console.error('[PublishStep] Failed to publish level:', error);

        // Stop and remove loading overlay
        progressTween.stop();
        this.scene.tweens.add({
          targets: loadingOverlay,
          alpha: 0,
          duration: 300,
          onComplete: () => loadingOverlay.destroy(),
        });

        // Show error toast
        this.showToast('Failed to publish level: ' + error.message, 'error');
      });
  }

  // (Removed unused saveLevel/exportLevel helper methods to satisfy type-check)

  /**
   * Share the level (when sharing is enabled)
   */
  private shareLevel(): void {
    if (!this.publishId) {
      console.error('[PublishStep] Cannot share level: No publish ID');
      this.showToast('Error: Level has not been published yet', 'error');
      return;
    }

    console.log(`[PublishStep] Sharing level with ID ${this.publishId}`);

    // Generate sharing URL
    const shareUrl = `https://galaxyexplorer.game/play?level=${this.publishId}`;

    // Try to use the Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: `Play ${this.levelName} in Galaxy Explorer`,
          text: `Check out my level "${this.levelName}" in Galaxy Explorer!`,
          url: shareUrl,
        })
        .catch((error) => {
          console.error('[PublishStep] Failed to share level:', error);
          this.showToast('Failed to share level', 'error');
        });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          this.showToast('Share URL copied to clipboard!', 'success');
          console.log('[PublishStep] Share URL copied to clipboard');
        })
        .catch((error) => {
          console.error('[PublishStep] Failed to copy share URL:', error);
          this.showToast('Failed to copy share URL', 'error');
        });
    }
  } /**
   * Create loading overlay with progress bar
   * @param message The loading message to display
   * @returns The loading overlay container
   */
  private createLoadingOverlay(message: string): Phaser.GameObjects.Container {
    // Create container for loading overlay
    const overlay = this.scene.add.container(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2
    );

    // Semi-transparent background
    const bg = this.scene.add.rectangle(
      0,
      0,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0.7
    );
    bg.setOrigin(0.5, 0.5);

    // Loading message
    const text = this.scene.add
      .text(0, -50, message, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Progress bar background
    const progressBg = this.scene.add.rectangle(0, 0, 200, 16, 0x333333);
    progressBg.setStrokeStyle(2, 0x4444ff);

    // Progress bar (initially empty)
    const progressBar = this.scene.add.graphics();
    progressBar.setName('progressBar');

    // Add components to overlay
    overlay.add([bg, text, progressBg, progressBar]);

    return overlay;
  }

  /**
   * Show toast notification
   * @param message The message to display
   * @param type The type of toast (success, error, info)
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

    // Add icon based on type
    let icon = '!';
    if (type === 'success') {
      icon = '✓';
    } else if (type === 'error') {
      icon = '✗';
    }

    const toastIcon = this.scene.add
      .text(-170, 0, icon, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add components to toast
    toast.add([toastBg, toastText, toastIcon]);

    // Add toast to scene
    this.container.add(toast);

    // Set initial state (off screen)
    toast.setY(this.scene.scale.height + 50);

    // Slide in animation
    this.scene.tweens.add({
      targets: toast,
      y: this.scene.scale.height - 100,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Auto-hide after delay
        this.scene.time.delayedCall(3000, () => {
          // Slide out animation
          this.scene.tweens.add({
            targets: toast,
            y: this.scene.scale.height + 50,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }

  /**
   * Create background star particles for visual effect
   */
  /**
   * Create background stars for visual effect
   */
  private createBackgroundStars(): void {
    // Add small stars
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.scene.scale.width;
      const y = 60 + Math.random() * (this.scene.scale.height - 120);
      const size = 1 + Math.random() * 2;
      const alpha = 0.3 + Math.random() * 0.7;

      const star = this.scene.add.circle(x, y, size, 0xffffff, alpha);

      // Add subtle twinkling animation
      this.scene.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: 1000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.container.add(star);
    }

    // Add a few larger stars
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * this.scene.scale.width;
      const y = 60 + Math.random() * (this.scene.scale.height - 120);
      const size = 2 + Math.random() * 3;
      const alpha = 0.5 + Math.random() * 0.5;

      const star = this.scene.add.circle(x, y, size, 0xaaddff, alpha);

      // Add subtle twinkling animation
      this.scene.tweens.add({
        targets: star,
        alpha: 0.2,
        scale: 0.7,
        duration: 1500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.container.add(star);
    }
  }
}
