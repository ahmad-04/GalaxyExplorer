/**
 * PublishStep.ts
 * Final step in the Build Mode workflow
 * Handles publishing and sharing the created level
 */

import * as Phaser from 'phaser';
import { BuildModeManager } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { isFeatureEnabled } from '../../../../shared/config';
import { publishLevelToReddit } from '../../api';

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
  private verifyContainer?: Phaser.GameObjects.Container;
  private verifyState: 'idle' | 'running' | 'passed' | 'failed' = 'idle';
  private detachVerifyListeners: (() => void) | undefined;
  private everPassed: boolean = false;
  private verifyOverlay?: Phaser.GameObjects.Container;
  private navBackBtn?: Phaser.GameObjects.Container;
  private navMenuBtn?: Phaser.GameObjects.Container;
  private verifyStatusText?: Phaser.GameObjects.Text;

  // Publish button visuals for enabled/disabled state
  private publishBtnBg?: Phaser.GameObjects.Graphics;
  private publishBtnContainer?: Phaser.GameObjects.Container;

  // Level data
  private levelId: string | undefined;
  private levelName: string = 'Untitled Level';
  private levelAuthor: string = 'Anonymous';

  // Publishing state
  private isPublished: boolean = false;
  private publishId: string | undefined;
  private permalink?: string;
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
          if (levelMetadata.permalink) this.permalink = levelMetadata.permalink;
        }
      }
    }

    // Create the UI
    this.createUI();

    // Invalidate verification when the current level is saved/changed
    this.service.on('level-saved', this.onLevelSaved);
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

    // Detach any verify listeners
    this.cleanupVerifyListeners();

    // Detach service listener
    this.service.off('level-saved', this.onLevelSaved);

    // Ensure StarshipScene is stopped if verification was running
    if (this.scene.scene.isActive('StarshipScene')) {
      const starship = this.scene.scene.get('StarshipScene');
      if (starship) starship.events.emit('test:stop');
      this.scene.scene.stop('StarshipScene');
    }
  }

  /**
   * Create the UI for this step
   */
  private createUI(): void {
    // Respect BuildMode header height like DesignStep
    const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarH = Math.max(48, headerH);
    this.container = this.scene.add.container(0, 0);

    // Cover any sticky UI from DesignStep at the top
    const headerCover = this.scene.add
      .rectangle(0, 0, this.scene.scale.width, topBarH, 0x0b1220, 1)
      .setOrigin(0, 0);
    headerCover.setScrollFactor(0);
    this.container.add(headerCover);

    const title = this.scene.add
      .text(16, Math.floor(topBarH / 2), 'PUBLISH YOUR LEVEL', {
        fontSize: '22px',
        color: '#e5e7eb',
        fontStyle: 'bold',
        shadow: { offsetX: 1, offsetY: 1, color: '#00000066', blur: 2, fill: true },
      })
      .setOrigin(0, 0.5);
    this.container.add(title);

    // Create publish form container
    this.publishContainer = this.scene.add.container(this.scene.scale.width / 2, topBarH + 220);
    this.container.add(this.publishContainer);

    // Create success container (hidden initially)
    this.successContainer = this.scene.add.container(this.scene.scale.width / 2, topBarH + 220);
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
    // Panel styled like DesignStep palette
    const panel = this.scene.add.rectangle(0, 0, 560, 400, 0x1f2937, 0.98).setOrigin(0.5);
    panel.setStrokeStyle(1, 0x2b3a4a);
    const headerBar = this.scene.add.rectangle(0, -180, 560, 48, 0x111827, 1).setOrigin(0.5);
    const formTitle = this.scene.add
      .text(0, -180, 'FINALIZE YOUR LEVEL', {
        fontSize: '20px',
        color: '#e5e7eb',
        fontStyle: 'bold',
        shadow: { offsetX: 1, offsetY: 1, color: '#00000066', blur: 2, fill: true },
      })
      .setOrigin(0.5);

    this.publishContainer.add([panel, headerBar, formTitle]);

    // Level info section
    const levelInfoTitle = this.scene.add
      .text(-220, -120, 'LEVEL INFORMATION', {
        fontSize: '14px',
        color: '#9ca3af',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Level name display
    const levelNameLabel = this.scene.add
      .text(-220, -80, 'Level Name:', { fontSize: '16px', color: '#e5e7eb' })
      .setOrigin(0, 0.5);

    const levelNameValue = this.scene.add
      .text(-100, -80, this.levelName, { fontSize: '16px', color: '#fbbf24' })
      .setOrigin(0, 0.5);
    const editNameBtn = this.scene.add
      .text(160, -80, '✎', { fontSize: '16px', color: '#93c5fd' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.promptEditName(levelNameValue));

    // Author display
    const authorLabel = this.scene.add
      .text(-220, -48, 'Author:', { fontSize: '16px', color: '#e5e7eb' })
      .setOrigin(0, 0.5);

    // Derive username from localStorage if available
    const userName = this.getCurrentUsername();
    this.levelAuthor = userName ? `u/${userName}` : this.levelAuthor;
    const authorValue = this.scene.add
      .text(-100, -48, this.levelAuthor, { fontSize: '16px', color: '#fbbf24' })
      .setOrigin(0, 0.5);
    const editAuthorBtn = this.scene.add
      .text(160, -48, '✎', { fontSize: '16px', color: '#93c5fd' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.promptEditAuthor(authorValue));

    // Sharing options section - only visible if sharing feature is enabled
    const sharingEnabled = isFeatureEnabled('ENABLE_BUILD_MODE_SHARING');

    // Buttons row: Verify (left) + Publish (right)
    const buttonsRow = this.scene.add.container(0, 80);
    this.publishContainer.add(buttonsRow);

    // Verify button
    const verifyBtnContainer = this.scene.add.container(-150, 0);
    const verifyBg = this.scene.add.graphics();
    verifyBg.fillStyle(0x065f46, 1);
    verifyBg.fillRoundedRect(-90, -20, 180, 40, 8);
    verifyBg.lineStyle(1, 0x10b981, 1);
    verifyBg.strokeRoundedRect(-90, -20, 180, 40, 8);
    const verifyText = this.scene.add
      .text(0, 0, 'VERIFY ▶', { fontSize: '16px', color: '#e5e7eb', fontStyle: 'bold' })
      .setOrigin(0.5);
    verifyBtnContainer.add([verifyBg, verifyText]);

    // Status text area under buttons (not cramped)
    const statusText = this.scene.add
      .text(0, 140, 'Verification required before publishing', {
        fontSize: '13px',
        color: '#9ca3af',
        align: 'center',
        wordWrap: { width: 480 },
      })
      .setOrigin(0.5);
    this.verifyContainer = this.scene.add.container(0, 0, [statusText]);
    this.verifyStatusText = statusText;
    this.publishContainer.add(this.verifyContainer);

    // Publish button (flat, disabled until verified)
    this.publishBtnContainer = this.scene.add.container(150, 0);
    this.publishBtnBg = this.scene.add.graphics();
    this.publishBtnBg.fillStyle(0x1d4ed8, 1);
    this.publishBtnBg.fillRoundedRect(-100, -20, 200, 40, 8);
    this.publishBtnBg.lineStyle(1, 0x60a5fa, 1);
    this.publishBtnBg.strokeRoundedRect(-100, -20, 200, 40, 8);

    const publishButtonText = this.scene.add
      .text(0, 0, 'PUBLISH LEVEL', { fontSize: '18px', color: '#e5e7eb', fontStyle: 'bold' })
      .setOrigin(0.5);

    const publishHit = this.scene.add.rectangle(0, 0, 200, 40, 0xffffff, 0.001).setOrigin(0.5);
    publishHit.setInteractive({ useHandCursor: true });

    this.publishBtnContainer.add([this.publishBtnBg, publishHit, publishButtonText]);

    // Add both buttons to row
    buttonsRow.add([verifyBtnContainer, this.publishBtnContainer]);

    publishHit.on('pointerover', () => {
      if (this.verifyState !== 'passed') return;
      this.publishBtnBg!.clear();
      this.publishBtnBg!.fillStyle(0x2563eb, 1);
      this.publishBtnBg!.fillRoundedRect(-100, -20, 200, 40, 8);
      this.publishBtnBg!.lineStyle(1, 0x93c5fd, 1);
      this.publishBtnBg!.strokeRoundedRect(-100, -20, 200, 40, 8);
    });
    publishHit.on('pointerout', () => {
      if (this.verifyState !== 'passed') return;
      this.publishBtnBg!.clear();
      this.publishBtnBg!.fillStyle(0x1d4ed8, 1);
      this.publishBtnBg!.fillRoundedRect(-100, -20, 200, 40, 8);
      this.publishBtnBg!.lineStyle(1, 0x60a5fa, 1);
      this.publishBtnBg!.strokeRoundedRect(-100, -20, 200, 40, 8);
    });
    publishHit.on('pointerdown', () => {
      if (this.verifyState !== 'passed') {
        this.showToast('Please verify your level before publishing', 'error');
        return;
      }
      this.scene.tweens.add({
        targets: this.publishBtnContainer,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 60,
        yoyo: true,
        onComplete: () => this.publishLevel(),
      });
    });

    // Verify button interactions
    verifyBg
      .setInteractive(new Phaser.Geom.Rectangle(-90, -20, 180, 40), Phaser.Geom.Rectangle.Contains)
      .on('pointerover', () => {
        verifyBg.clear();
        verifyBg.fillStyle(0x047857, 1);
        verifyBg.fillRoundedRect(-90, -20, 180, 40, 8);
        verifyBg.lineStyle(1, 0x34d399, 1);
        verifyBg.strokeRoundedRect(-90, -20, 180, 40, 8);
      })
      .on('pointerout', () => {
        verifyBg.clear();
        verifyBg.fillStyle(0x065f46, 1);
        verifyBg.fillRoundedRect(-90, -20, 180, 40, 8);
        verifyBg.lineStyle(1, 0x10b981, 1);
        verifyBg.strokeRoundedRect(-90, -20, 180, 40, 8);
      })
      .on('pointerdown', () => this.startVerification(statusText, verifyText));

    // Add disclaimer based on whether sharing is enabled
    const disclaimer = this.scene.add
      .text(
        0,
        180,
        sharingEnabled
          ? 'By publishing, you agree to share this level with other players.'
          : 'Publishing will save this level as complete in your local collection.',
        { fontSize: '13px', color: '#9ca3af', align: 'center', wordWrap: { width: 480 } }
      )
      .setOrigin(0.5);

    // Add everything to container
    this.publishContainer.add([
      levelInfoTitle,
      levelNameLabel,
      levelNameValue,
      editNameBtn,
      authorLabel,
      authorValue,
      editAuthorBtn,
      disclaimer,
    ]);

    // Add sharing options if enabled
    if (sharingEnabled) this.addSharingOptions();

    // Initialize publish button visual state
    this.updatePublishButtonState();
  }

  private updatePublishButtonState(): void {
    if (!this.publishBtnBg) return;
    const enabled = this.verifyState === 'passed';
    this.publishBtnBg.clear();
    if (enabled) {
      this.publishBtnBg.fillStyle(0x1d4ed8, 1);
      this.publishBtnBg.fillRoundedRect(-100, -20, 200, 40, 8);
      this.publishBtnBg.lineStyle(1, 0x60a5fa, 1);
      this.publishBtnBg.strokeRoundedRect(-100, -20, 200, 40, 8);
    } else {
      this.publishBtnBg.fillStyle(0x1f3a8a, 0.6);
      this.publishBtnBg.fillRoundedRect(-100, -20, 200, 40, 8);
      this.publishBtnBg.lineStyle(1, 0x3b82f6, 0.5);
      this.publishBtnBg.strokeRoundedRect(-100, -20, 200, 40, 8);
    }
  }

  // Launch a verification run; player must beat the level without dying
  private startVerification(
    statusText: Phaser.GameObjects.Text,
    verifyText: Phaser.GameObjects.Text
  ): void {
    if (!this.levelId) {
      this.showToast('No level to verify. Save your level first.', 'error');
      return;
    }
    if (this.verifyState === 'running') return;
    // Reset to running; preserve everPassed flag only for messaging
    this.verifyState = 'running';
    statusText.setText('Running verification... defeat all enemies without dying');
    statusText.setColor('#dddddd');
    verifyText.setText('VERIFYING...');

    const levelData = this.service.loadLevel(this.levelId);
    if (!levelData) {
      this.verifyState = 'failed';
      statusText.setText('Verification failed: could not load level');
      statusText.setColor('#ff7777');
      verifyText.setText('VERIFY ▶');
      this.showToast('Failed to load level for verification', 'error');
      return;
    }

    // Ensure clean StarshipScene
    if (this.scene.scene.isActive('StarshipScene')) {
      const starship = this.scene.scene.get('StarshipScene');
      if (starship) starship.events.emit('test:stop');
      this.scene.scene.stop('StarshipScene');
    }

    // Hide publish form and bottom navigation; show a small top-center overlay
    this.publishContainer.setVisible(false);
    this.navBackBtn?.setVisible(false);
    this.navMenuBtn?.setVisible(false);
    this.showVerifyOverlay();

    // Attach listeners
    const onCompleted = () => {
      // Only allow pass if a fail didn't happen first during this run
      if (this.verifyState === 'failed') {
        // Ignore late success
        return;
      }
      this.verifyState = 'passed';
      this.everPassed = true;
      statusText.setText(
        this.everPassed ? 'Verification passed! You can publish now.' : 'Verification passed.'
      );
      statusText.setColor('#66ff99');
      verifyText.setText('RE-RUN ▶');
      this.updatePublishButtonState();
      this.cleanupVerifyListeners();
      if (this.scene.scene.isActive('StarshipScene')) this.scene.scene.stop('StarshipScene');
      this.hideVerifyOverlay();
      this.publishContainer.setVisible(true);
      this.navBackBtn?.setVisible(true);
      this.navMenuBtn?.setVisible(true);
    };
    const onFailed = () => {
      this.verifyState = 'failed';
      statusText.setText('Verification failed. Adjust your level and retry.');
      statusText.setColor('#ff7777');
      verifyText.setText('RE-RUN ▶');
      this.updatePublishButtonState();
      this.cleanupVerifyListeners();
      if (this.scene.scene.isActive('StarshipScene')) this.scene.scene.stop('StarshipScene');
      this.hideVerifyOverlay();
      this.publishContainer.setVisible(true);
      this.navBackBtn?.setVisible(true);
      this.navMenuBtn?.setVisible(true);
    };
    const onStats = (_stats: unknown) => {
      // optional future: show live counters
    };

    this.scene.events.once('test:completed', onCompleted);
    this.scene.events.once('test:failed', onFailed);
    this.scene.events.on('test:stats', onStats);
    this.detachVerifyListeners = () => {
      this.scene.events.off('test:completed', onCompleted);
      this.scene.events.off('test:failed', onFailed);
      this.scene.events.off('test:stats', onStats);
    };

    // Set flags and launch StarshipScene
    this.scene.registry.set('testMode', true);
    this.scene.registry.set('buildModeTest', true);
    this.scene.registry.set('testLevelData', levelData);
    this.scene.registry.set('enemiesDefeated', 0);
    this.scene.registry.set('playerDeaths', 0);
    this.scene.registry.set('powerupsCollected', 0);

    this.scene.scene.launch('StarshipScene', {
      testMode: true,
      buildModeTest: true,
      levelData,
    });
    // Ensure UI (overlay/stop) is on top of gameplay for clicks
    this.scene.scene.bringToTop('BuildModeScene');
  }

  private showVerifyOverlay(): void {
    const headerH = (this.scene.data && this.scene.data.get('headerHeight')) || 0;
    const topBarH = Math.max(48, headerH);
    const panelWidth = Math.min(this.scene.scale.width - 32, 640);
    const stopWidth = 110;
    const overlayY = topBarH + 28;

    if (!this.verifyOverlay) {
      const overlay = this.scene.add.container(this.scene.scale.width / 2, overlayY);
      const bg = this.scene.add
        .rectangle(0, 0, panelWidth, 44, 0x111827, 0.95)
        .setOrigin(0.5)
        .setName('verifyBg');
      bg.setStrokeStyle(1, 0x2b3a4a, 1);
      const text = this.scene.add
        .text(0, 0, 'Verification running — beat the level without dying', {
          fontSize: '14px',
          color: '#e5e7eb',
          wordWrap: { width: panelWidth - stopWidth - 36 },
          align: 'left',
        })
        .setOrigin(0, 0.5)
        .setName('verifyText');
      const textX = -panelWidth / 2 + 12;
      text.setX(textX);
      const stopBtn = this.scene.add
        .container(panelWidth / 2 - (stopWidth / 2 + 12), 0)
        .setName('verifyStop');
      const stopBg = this.scene.add.rectangle(0, 0, stopWidth, 28, 0x991b1b, 1).setOrigin(0.5);
      stopBg.setStrokeStyle(1, 0x7f1d1d, 1);
      const stopTxt = this.scene.add
        .text(0, 0, 'Stop ■', { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0.5);
      stopBg.setInteractive({ useHandCursor: true });
      stopBg.on('pointerover', () => stopBg.setFillStyle(0xb91c1c, 1));
      stopBg.on('pointerout', () => stopBg.setFillStyle(0x991b1b, 1));
      stopBg.on('pointerdown', () => this.resetVerification('Verification cancelled'));
      stopBtn.add([stopBg, stopTxt]);
      overlay.add([bg, text, stopBtn]);
      overlay.setDepth(10000);
      this.container.add(overlay);
      this.verifyOverlay = overlay;
    } else {
      // Update existing overlay layout and bring to top
      const overlay = this.verifyOverlay;
      overlay.setPosition(this.scene.scale.width / 2, overlayY);
      const bg = overlay.getByName('verifyBg') as Phaser.GameObjects.Rectangle;
      const text = overlay.getByName('verifyText') as Phaser.GameObjects.Text;
      const stopBtn = overlay.getByName('verifyStop') as Phaser.GameObjects.Container;
      if (bg) {
        bg.width = panelWidth;
        bg.height = 44;
      }
      if (text) {
        text.setText('Verification running — beat the level without dying');
        text.setWordWrapWidth(panelWidth - stopWidth - 36, true);
        text.setX(-panelWidth / 2 + 12);
      }
      if (stopBtn) {
        stopBtn.setX(panelWidth / 2 - (stopWidth / 2 + 12));
      }
      overlay.setVisible(true);
      overlay.setDepth(10000);
    }
    // Ensure this scene is on top for input processing
    this.scene.scene.bringToTop('BuildModeScene');
  }

  private hideVerifyOverlay(): void {
    if (this.verifyOverlay) this.verifyOverlay.setVisible(false);
  }

  private promptEditName(targetText: Phaser.GameObjects.Text): void {
    const input = window.prompt('Enter level name:', this.levelName);
    if (input && input.trim().length > 0) {
      this.levelName = input.trim();
      targetText.setText(this.levelName);
      this.persistLevelSettings();
    }
  }

  private promptEditAuthor(targetText: Phaser.GameObjects.Text): void {
    const input = window.prompt(
      'Enter author name (will display as u/<name>):',
      this.levelAuthor.replace(/^u\//, '')
    );
    if (input && input.trim().length > 0) {
      const cleaned = input.trim().replace(/^u\//, '');
      this.levelAuthor = `u/${cleaned}`;
      targetText.setText(this.levelAuthor);
      // Persist a plain username for reuse
      try {
        localStorage.setItem('galaxy-explorer:username', cleaned);
      } catch {
        /* ignore storage errors */
      }
      this.persistLevelSettings();
    }
  }

  private getCurrentUsername(): string | undefined {
    try {
      return localStorage.getItem('galaxy-explorer:username') || undefined;
    } catch {
      return undefined;
    }
  }

  private persistLevelSettings(): void {
    if (!this.levelId) return;
    const data = this.service.loadLevel(this.levelId);
    if (!data) return;
    data.settings.name = this.levelName;
    data.settings.author = this.levelAuthor;
    this.service.saveLevel(data, { id: this.levelId });
  }

  private cleanupVerifyListeners(): void {
    if (this.detachVerifyListeners) {
      this.detachVerifyListeners();
      this.detachVerifyListeners = undefined;
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

    // External actions for the created Reddit post
    if (this.permalink) {
      const makeLinkBtn = (x: number, y: number, label: string, onClick: () => void) => {
        const c = this.scene.add.container(x, y);
        const bg = this.scene.add.rectangle(0, 0, 160, 36, 0x111827, 0.95).setOrigin(0.5);
        bg.setStrokeStyle(1, 0x2b3a4a);
        const txt = this.scene.add
          .text(0, 0, label, { fontSize: '16px', color: '#e5e7eb' })
          .setOrigin(0.5);
        const hit = this.scene.add.rectangle(0, 0, 160, 36, 0xffffff, 0.001).setOrigin(0.5);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => bg.setFillStyle(0x0f172a));
        hit.on('pointerout', () => bg.setFillStyle(0x111827));
        hit.on('pointerdown', onClick);
        c.add([bg, txt, hit]);
        return c;
      };

      const openBtn = makeLinkBtn(-90, 190, 'Open Post', () => {
        try {
          const w = window.open(this.permalink!, '_blank');
          if (!w) {
            // Pop-up blocked; fallback to copying link
            navigator.clipboard
              .writeText(this.permalink!)
              .then(() => this.showToast('Pop-up blocked. Link copied!', 'info'))
              .catch(() => this.showToast('Pop-up blocked. Copy failed.', 'error'));
          }
        } catch {
          this.showToast('Unable to open post. Copying link...', 'info');
          navigator.clipboard
            .writeText(this.permalink!)
            .then(() => this.showToast('Post link copied!', 'success'))
            .catch(() => this.showToast('Failed to copy link', 'error'));
        }
      });
      const copyBtn = makeLinkBtn(90, 190, 'Copy Post Link', () => {
        navigator.clipboard
          .writeText(this.permalink!)
          .then(() => this.showToast('Post link copied!', 'success'))
          .catch(() => this.showToast('Failed to copy link', 'error'));
      });

      successContent.add([openBtn, copyBtn]);
    }
  }

  /**
   * Create navigation buttons between steps
   */
  private createStepNavigation(): void {
    const navY = this.scene.scale.height - 36;

    const makePillButton = (
      centerX: number,
      centerY: number,
      width: number,
      label: string,
      onClick: () => void
    ) => {
      const btn = this.scene.add.container(centerX, centerY);
      btn.setScrollFactor(0);
      const bg = this.scene.add.rectangle(0, 0, width, 28, 0x111827, 1).setOrigin(0.5);
      bg.setStrokeStyle(1, 0x2b3a4a);
      const txt = this.scene.add
        .text(0, 0, label, { fontSize: '14px', color: '#e5e7eb' })
        .setOrigin(0.5);
      btn.add([bg, txt]);

      const hit = this.scene.add.rectangle(0, 0, width, 28, 0xffffff, 0.001).setOrigin(0.5);
      hit.setInteractive({ useHandCursor: true });
      btn.add(hit);

      hit.on('pointerover', () => bg.setFillStyle(0x0f172a));
      hit.on('pointerout', () => bg.setFillStyle(0x111827));
      hit.on('pointerdown', onClick);

      return btn;
    };

    const rightMargin = 20;
    const menuWidth = 80;
    const backWidth = 170;
    const menuX = this.scene.scale.width - (rightMargin + menuWidth / 2);
    const backX = menuX - (menuWidth / 2 + 12 + backWidth / 2);

    const backBtn = makePillButton(backX, navY, backWidth, '◀ Back to Design', () => {
      this.resetVerification('Returned to design');
      this.scene.events.emit('step:change', 'design', this.levelId);
    });
    const menuBtn = makePillButton(menuX, navY, menuWidth, 'Menu', () => {
      this.resetVerification('Returned to menu');
      this.scene.scene.start('MainMenu');
    });

    this.navBackBtn = backBtn;
    this.navMenuBtn = menuBtn;
    this.container.add([backBtn, menuBtn]);
  }

  private onLevelSaved = (savedId: unknown) => {
    if (typeof savedId === 'string' && this.levelId && savedId === this.levelId) {
      this.resetVerification('Level changed');
    }
  };

  private resetVerification(reason?: string): void {
    // Stop running verification if any
    if (this.scene.scene.isActive('StarshipScene')) {
      const starship = this.scene.scene.get('StarshipScene');
      if (starship) starship.events.emit('test:stop');
      this.scene.scene.stop('StarshipScene');
    }
    this.cleanupVerifyListeners();
    this.verifyState = 'idle';
    this.everPassed = false;
    this.hideVerifyOverlay();
    this.publishContainer?.setVisible(true);
    this.navBackBtn?.setVisible(true);
    this.navMenuBtn?.setVisible(true);
    if (this.verifyStatusText) {
      const base = 'Verification required before publishing';
      this.verifyStatusText.setText(reason ? `${base} — ${reason}` : base);
      this.verifyStatusText.setColor('#9ca3af');
    }
    this.updatePublishButtonState();
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

    // Publish via server API
    const data = this.service.loadLevel(this.levelId);
    if (!data) {
      this.showToast('Failed to load level for publishing', 'error');
      return;
    }
    const clientPublishToken = `${this.levelId}:${data.metadata.lastModified}`;

    publishLevelToReddit({
      levelId: this.levelId,
      name: this.levelName,
      ...(data.settings.description ? { description: data.settings.description } : {}),
      authorDisplay: this.levelAuthor,
      levelData: data,
      clientPublishToken,
    })
      .then((resp) => {
        console.log(`[PublishStep] Level published with ID ${resp.postId}`);
        this.isPublished = true;
        this.publishId = resp.postId;
        this.permalink = resp.permalink;

        // Persist metadata update in saved levels list
        const levels = this.service.getLevelList();
        const idx = levels.findIndex((l) => l.id === this.levelId);
        if (idx >= 0) {
          levels[idx] = {
            ...levels[idx]!,
            isPublished: true,
            publishId: resp.postId,
            permalink: resp.permalink,
          };
          localStorage.setItem('galaxy-explorer:levels', JSON.stringify(levels));
        }

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

  // Background stars removed to match editor visual style
}
