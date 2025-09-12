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
  private manager: BuildModeManager;
  private service: BuildModeService;
  
  // UI elements
  private container!: Phaser.GameObjects.Container;
  private publishContainer!: Phaser.GameObjects.Container;
  private successContainer!: Phaser.GameObjects.Container;
  
  // Level data
  private levelId?: string;
  private levelName: string = 'Untitled Level';
  private levelAuthor: string = 'Anonymous';
  
  // Publishing state
  private isPublished: boolean = false;
  private publishId?: string;
  
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
    
    // Background
    const bg = this.scene.add.rectangle(
      0, 0,
      this.scene.scale.width,
      this.scene.scale.height - 60,
      0x222222
    );
    bg.setOrigin(0, 0);
    this.container.add(bg);
    
    // Add header
    const headerBg = this.scene.add.rectangle(
      0, 0,
      this.scene.scale.width,
      60,
      0x333333
    );
    headerBg.setOrigin(0, 0);
    
    const title = this.scene.add.text(
      20, 30,
      'PUBLISH YOUR LEVEL',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0.5);
    
    this.container.add([headerBg, title]);
    
    // Create publish form container
    this.publishContainer = this.scene.add.container(
      this.scene.scale.width / 2,
      250
    );
    this.container.add(this.publishContainer);
    
    // Create success container (hidden initially)
    this.successContainer = this.scene.add.container(
      this.scene.scale.width / 2,
      250
    );
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
    // Form background
    const formBg = this.scene.add.rectangle(
      0, 0,
      500, 350,
      0x333333
    );
    formBg.setOrigin(0.5, 0.5);
    formBg.setStrokeStyle(1, 0x555555);
    this.publishContainer.add(formBg);
    
    // Form title
    const formTitle = this.scene.add.text(
      0, -150,
      'FINALIZE YOUR LEVEL',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.publishContainer.add(formTitle);
    
    // Level info section
    const levelInfoTitle = this.scene.add.text(
      -220, -100,
      'LEVEL INFORMATION',
      {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0.5);
    
    // Level name display
    const levelNameLabel = this.scene.add.text(
      -220, -60,
      'Level Name:',
      {
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0, 0.5);
    
    const levelNameValue = this.scene.add.text(
      -100, -60,
      this.levelName,
      {
        fontSize: '16px',
        color: '#ffff00'
      }
    ).setOrigin(0, 0.5);
    
    // Author display
    const authorLabel = this.scene.add.text(
      -220, -30,
      'Author:',
      {
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0, 0.5);
    
    const authorValue = this.scene.add.text(
      -100, -30,
      this.levelAuthor,
      {
        fontSize: '16px',
        color: '#ffff00'
      }
    ).setOrigin(0, 0.5);
    
    // Sharing options section - only visible if sharing feature is enabled
    const sharingEnabled = isFeatureEnabled('ENABLE_BUILD_MODE_SHARING');
    
    // Publish button
    const publishButton = this.scene.add.text(
      0, 100,
      'PUBLISH LEVEL',
      {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);
    
    // Make button interactive
    publishButton.setInteractive({ useHandCursor: true });
    
    // Publish level on click
    publishButton.on('pointerdown', () => {
      this.publishLevel();
    });
    
    // Add disclaimer based on whether sharing is enabled
    const disclaimer = this.scene.add.text(
      0, 150,
      sharingEnabled ? 
        'By publishing, you agree to share this level with other players.' :
        'Publishing will save this level as complete in your local collection.',
      {
        fontSize: '14px',
        color: '#aaaaaa',
        align: 'center',
        wordWrap: { width: 400 }
      }
    ).setOrigin(0.5);
    
    // Add everything to container
    this.publishContainer.add([
      levelInfoTitle,
      levelNameLabel,
      levelNameValue,
      authorLabel,
      authorValue,
      publishButton,
      disclaimer
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
    const sharingTitle = this.scene.add.text(
      -220, 20,
      'SHARING OPTIONS',
      {
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0.5);
    
    // Sharing checkbox
    const shareCheckboxBg = this.scene.add.rectangle(
      -210, 50,
      20, 20,
      0x555555
    );
    shareCheckboxBg.setOrigin(0.5);
    shareCheckboxBg.setStrokeStyle(1, 0xaaaaaa);
    
    // Checkmark (shown when selected)
    const checkmark = this.scene.add.text(
      -210, 50,
      '✓',
      {
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);
    
    // Initially checked
    shareCheckboxBg.setData('checked', true);
    
    // Label
    const shareLabel = this.scene.add.text(
      -190, 50,
      'Share with community leaderboards',
      {
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0, 0.5);
    
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
    // Success background
    const successBg = this.scene.add.rectangle(
      0, 0,
      500, 300,
      0x333333
    );
    successBg.setOrigin(0.5, 0.5);
    successBg.setStrokeStyle(1, 0x555555);
    this.successContainer.add(successBg);
    
    // Success icon
    const successIcon = this.scene.add.text(
      0, -100,
      '✓',
      {
        fontSize: '64px',
        color: '#00cc00'
      }
    ).setOrigin(0.5);
    
    // Success title
    const successTitle = this.scene.add.text(
      0, -40,
      'LEVEL PUBLISHED!',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Level info
    const levelInfo = this.scene.add.text(
      0, 10,
      `"${this.levelName}" by ${this.levelAuthor}`,
      {
        fontSize: '18px',
        color: '#ffff00'
      }
    ).setOrigin(0.5);
    
    // Sharing info if sharing is enabled
    const sharingEnabled = isFeatureEnabled('ENABLE_BUILD_MODE_SHARING');
    const sharingInfo = this.scene.add.text(
      0, 50,
      sharingEnabled ? 
        'Your level is now available for other players to enjoy!' :
        'Your level has been finalized and saved to your collection.',
      {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 400 }
      }
    ).setOrigin(0.5);
    
    // Button to create new level
    const newLevelButton = this.scene.add.text(
      0, 100,
      'CREATE NEW LEVEL',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5);
    
    // Make button interactive
    newLevelButton.setInteractive({ useHandCursor: true });
    
    // Create new level on click
    newLevelButton.on('pointerdown', () => {
      this.scene.scene.start('BuildModeScene');
    });
    
    // Add everything to container
    this.successContainer.add([
      successIcon,
      successTitle,
      levelInfo,
      sharingInfo,
      newLevelButton
    ]);
    
    // Add sharing button if enabled
    if (sharingEnabled && this.publishId) {
      const shareButton = this.scene.add.text(
        0, 150,
        'SHARE LEVEL',
        {
          fontSize: '18px',
          color: '#ffffff',
          backgroundColor: '#00aa00',
          padding: { x: 15, y: 8 }
        }
      ).setOrigin(0.5);
      
      // Make button interactive
      shareButton.setInteractive({ useHandCursor: true });
      
      // Share level on click
      shareButton.on('pointerdown', () => {
        this.shareLevel();
      });
      
      this.successContainer.add(shareButton);
    }
  }
  
  /**
   * Create navigation buttons between steps
   */
  private createStepNavigation(): void {
    // Back button (to Test step)
    const backButton = this.scene.add.text(
      this.scene.scale.width - 180, 
      this.scene.scale.height - 40,
      '< Back to Test',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0, 0.5);
    
    // Make button interactive
    backButton.setInteractive({ useHandCursor: true });
    
    // Navigate to Test step
    backButton.on('pointerdown', () => {
      // Change to Test step
      this.scene.events.emit('step:change', 'test', this.levelId);
    });
    
    // Main menu button
    const menuButton = this.scene.add.text(
      this.scene.scale.width - 60, 
      this.scene.scale.height - 40,
      'Main Menu',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0, 0.5);
    
    // Make button interactive
    menuButton.setInteractive({ useHandCursor: true });
    
    // Navigate to main menu
    menuButton.on('pointerdown', () => {
      // Change to main menu
      this.scene.scene.start('MainMenu');
    });
    
    this.container.add([backButton, menuButton]);
  }
  
  /**
   * Publish the level
   */
  private publishLevel(): void {
    if (!this.levelId) {
      console.error('[PublishStep] Cannot publish level: No level ID');
      return;
    }
    
    console.log(`[PublishStep] Publishing level ${this.levelId}`);
    
    // Publish the level
    this.service.publishLevel(this.levelId).then((publishId) => {
      console.log(`[PublishStep] Level published with ID ${publishId}`);
      this.isPublished = true;
      this.publishId = publishId;
      
      // Show success message
      this.publishContainer.setVisible(false);
      
      // Create and show success container
      this.createSuccessMessage();
      this.successContainer.setVisible(true);
    }).catch((error) => {
      console.error('[PublishStep] Failed to publish level:', error);
      // TODO: Show error message
    });
  }
  
  /**
   * Share the level (when sharing is enabled)
   */
  private shareLevel(): void {
    if (!this.publishId) {
      console.error('[PublishStep] Cannot share level: No publish ID');
      return;
    }
    
    console.log(`[PublishStep] Sharing level with ID ${this.publishId}`);
    
    // Generate sharing URL
    const shareUrl = `https://galaxyexplorer.game/play?level=${this.publishId}`;
    
    // Try to use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `Play ${this.levelName} in Galaxy Explorer`,
        text: `Check out my level "${this.levelName}" in Galaxy Explorer!`,
        url: shareUrl
      }).catch((error) => {
        console.error('[PublishStep] Failed to share level:', error);
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        // TODO: Show copy success message
        console.log('[PublishStep] Share URL copied to clipboard');
      }).catch((error) => {
        console.error('[PublishStep] Failed to copy share URL:', error);
      });
    }
  }
}
