import * as Phaser from 'phaser';
import { BuildModeManager } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';
import { LevelSettings } from '../../../../shared/types/buildMode';

/**
 * First step in the Build Mode workflow
 * Handles setup of basic level properties and template selection
 */
export class SetupStep {
  private scene: Phaser.Scene;
  private manager: BuildModeManager;
  private service: BuildModeService;
  
  // UI components
  private container!: Phaser.GameObjects.Container;
  private templateButtons: Phaser.GameObjects.Container[] = [];
  private nameInput!: HTMLInputElement;
  private descriptionInput!: HTMLTextAreaElement;
  private difficultySlider!: HTMLInputElement;
  
  // Templates
  private templates = [
    { id: 'empty', name: 'Empty Level', description: 'Start from scratch' },
    { id: 'basic', name: 'Basic Level', description: 'Simple level with essentials' },
    { id: 'asteroid', name: 'Asteroid Field', description: 'Navigate through asteroids' },
    { id: 'boss', name: 'Boss Battle', description: 'Epic boss encounter' },
  ];
  
  // Selected template
  private selectedTemplate: string = 'empty';
  
  // Current level data
  private levelId?: string;
  private levelSettings: LevelSettings = {
    name: 'Untitled Level',
    author: 'Anonymous',
    difficulty: 1,
    backgroundSpeed: 1,
    backgroundTexture: 'stars',
    musicTrack: 'default',
    version: '1.0.0',
  };
  
  constructor(scene: Phaser.Scene, manager: BuildModeManager, service: BuildModeService) {
    this.scene = scene;
    this.manager = manager;
    this.service = service;
  }
  
  /**
   * Activate this step
   * @param levelId Optional level ID to load
   */
  activate(levelId?: string) {
    console.log(`[SetupStep] Activating with levelId: ${levelId || 'none'}`);
    this.levelId = levelId;
    
    // If we have a level ID, load it
    if (levelId) {
      const levelData = this.service.loadLevel(levelId);
      if (levelData) {
        this.levelSettings = { ...levelData.settings };
      }
    }
    
    // Create UI
    this.createUI();
  }
  
  /**
   * Deactivate this step
   */
  deactivate() {
    console.log('[SetupStep] Deactivating');
    
    // Clean up UI
    if (this.container) {
      this.container.destroy();
    }
    
    // Remove DOM elements
    this.removeInputElements();
  }
  
  /**
   * Create the UI for this step
   */
  private createUI() {
    // Main container
    this.container = this.scene.add.container(0, 60);
    
    // Background with gradient effect
    const bg = this.scene.add.rectangle(
      0, 0, 
      this.scene.scale.width, 
      this.scene.scale.height - 60, 
      0x1e1e2f
    );
    bg.setOrigin(0, 0);
    this.container.add(bg);
    
    // Add a decorative header bar
    const headerBar = this.scene.add.rectangle(0, 0, this.scene.scale.width, 80, 0x3a3a5a);
    headerBar.setOrigin(0, 0);
    this.container.add(headerBar);
    
    // Title with shadow
    const titleShadow = this.scene.add.text(33, 33, 'Level Setup', {
      fontSize: '32px',
      color: '#000000',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    });
    titleShadow.setAlpha(0.4);
    this.container.add(titleShadow);
    
    const title = this.scene.add.text(30, 30, 'Level Setup', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    });
    this.container.add(title);
    
    // Instructions with improved readability
    const instructions = this.scene.add.text(30, 90, 'Configure your level settings and select a template to get started.', {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'Arial',
      lineSpacing: 6
    });
    this.container.add(instructions);
    
    // Create template selection
    this.createTemplateSelection();
    
    // Create level settings form
    this.createSettingsForm();
    
    // Create navigation buttons
    this.createNavigationButtons();
  }
  
  /**
   * Create template selection UI
   */
  private createTemplateSelection() {
    const title = this.scene.add.text(30, 150, 'Select a Template', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.container.add(title);
    
    // Create template buttons
    this.templates.forEach((template, index) => {
      const x = 30 + (index % 2) * 350;
      const y = 200 + Math.floor(index / 2) * 180;
      
      const templateContainer = this.scene.add.container(x, y);
      
      // Template button background
      const bg = this.scene.add.rectangle(0, 0, 320, 150, 0x444444);
      bg.setOrigin(0, 0);
      bg.setInteractive({ useHandCursor: true });
      
      // Add rounded corners and shadow effect
      bg.setStrokeStyle(2, 0x555555);
      
      // Highlight if selected
      if (this.selectedTemplate === template.id) {
        bg.setStrokeStyle(4, 0x4a90e2);
        bg.fillColor = 0x2a3a4a; // Slightly blue tint when selected
      }
      
      // Template name
      const name = this.scene.add.text(20, 20, template.name, {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial'
      });
      
      // Template description
      const description = this.scene.add.text(20, 60, template.description, {
        fontSize: '16px',
        color: '#cccccc',
        wordWrap: { width: 280 },
        fontFamily: 'Arial'
      });
      
      // Add all elements to container
      templateContainer.add([bg, name, description]);
      
      // Handle selection
      bg.on('pointerdown', () => {
        this.selectTemplate(template.id);
      });
      
      this.templateButtons.push(templateContainer);
      this.container.add(templateContainer);
    });
  }
  
  /**
   * Create level settings form
   */
  private createSettingsForm() {
    const formTitle = this.scene.add.text(30, 400, 'Level Settings', {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.container.add(formTitle);
    
    // Create DOM elements for input
    this.createInputElements();
  }
  
  /**
   * Create HTML input elements for the form
   */
  private createInputElements() {
    // Name input
    const nameLabel = this.scene.add.text(30, 450, 'Level Name:', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.container.add(nameLabel);
    
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.value = this.levelSettings.name;
    this.nameInput.className = 'build-mode-input';
    this.nameInput.style.position = 'absolute';
    this.nameInput.style.left = '150px';
    this.nameInput.style.top = '510px';
    this.nameInput.style.width = '300px';
    document.body.appendChild(this.nameInput);
    
    // Description input
    const descLabel = this.scene.add.text(30, 490, 'Description:', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.container.add(descLabel);
    
    this.descriptionInput = document.createElement('textarea');
    this.descriptionInput.value = this.levelSettings.description || '';
    this.descriptionInput.className = 'build-mode-input build-mode-textarea';
    this.descriptionInput.style.position = 'absolute';
    this.descriptionInput.style.left = '150px';
    this.descriptionInput.style.top = '550px';
    this.descriptionInput.style.width = '300px';
    this.descriptionInput.style.height = '100px';
    document.body.appendChild(this.descriptionInput);
    
    // Difficulty slider
    const diffLabel = this.scene.add.text(30, 600, 'Difficulty:', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.container.add(diffLabel);
    
    this.difficultySlider = document.createElement('input');
    this.difficultySlider.type = 'range';
    this.difficultySlider.className = 'build-mode-slider';
    this.difficultySlider.min = '1';
    this.difficultySlider.max = '10';
    this.difficultySlider.value = this.levelSettings.difficulty.toString();
    this.difficultySlider.style.position = 'absolute';
    this.difficultySlider.style.left = '150px';
    this.difficultySlider.style.top = '660px';
    this.difficultySlider.style.width = '200px';
    document.body.appendChild(this.difficultySlider);
    
    // Create difficulty indicator container
    const diffValueContainer = this.scene.add.container(370, 600);
    const diffValueBg = this.scene.add.rectangle(0, 0, 40, 30, 0x2a2a2a);
    diffValueBg.setStrokeStyle(1, 0x444444);
    diffValueBg.setOrigin(0, 0);
    
    const diffValue = this.scene.add.text(20, 15, this.levelSettings.difficulty.toString(), {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    diffValue.setOrigin(0.5);
    
    diffValueContainer.add([diffValueBg, diffValue]);
    this.container.add(diffValueContainer);
    
    // Update difficulty display when slider changes with color indication
    this.difficultySlider.addEventListener('input', () => {
      const value = parseInt(this.difficultySlider.value);
      diffValue.setText(value.toString());
      
      // Change color based on difficulty
      if (value <= 3) {
        diffValue.setColor('#4aff4a'); // Easy - green
      } else if (value <= 7) {
        diffValue.setColor('#ffff4a'); // Medium - yellow
      } else {
        diffValue.setColor('#ff4a4a'); // Hard - red
      }
    });
  }
  
  /**
   * Remove HTML input elements
   */
  private removeInputElements() {
    if (this.nameInput && this.nameInput.parentNode) {
      this.nameInput.parentNode.removeChild(this.nameInput);
    }
    
    if (this.descriptionInput && this.descriptionInput.parentNode) {
      this.descriptionInput.parentNode.removeChild(this.descriptionInput);
    }
    
    if (this.difficultySlider && this.difficultySlider.parentNode) {
      this.difficultySlider.parentNode.removeChild(this.difficultySlider);
    }
  }
  
  /**
   * Create navigation buttons
   */
  private createNavigationButtons() {
    // Create navigation container with gradient background
    const navBg = this.scene.add.rectangle(0, this.scene.scale.height - 100, this.scene.scale.width, 100, 0x222222);
    navBg.setOrigin(0, 0);
    navBg.setAlpha(0.8);
    this.container.add(navBg);
    
    // Back button
    const backButton = this.scene.add.container(30, this.scene.scale.height - 70);
    const backBg = this.scene.add.rectangle(0, 0, 150, 50, 0x555555);
    backBg.setOrigin(0, 0);
    backBg.setInteractive({ useHandCursor: true });
    backBg.on('pointerover', () => backBg.fillColor = 0x666666);
    backBg.on('pointerout', () => backBg.fillColor = 0x555555);
    
    const backText = this.scene.add.text(75, 25, 'Back to Menu', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    backText.setOrigin(0.5);
    
    backButton.add([backBg, backText]);
    backBg.on('pointerdown', () => {
      this.scene.scene.start('MainMenu');
    });
    this.container.add(backButton);
    
    // Next button
    const nextButton = this.scene.add.container(this.scene.scale.width - 180, this.scene.scale.height - 70);
    const nextBg = this.scene.add.rectangle(0, 0, 150, 50, 0x2ecc71);
    nextBg.setOrigin(0, 0);
    nextBg.setInteractive({ useHandCursor: true });
    nextBg.on('pointerover', () => nextBg.fillColor = 0x3edd81);
    nextBg.on('pointerout', () => nextBg.fillColor = 0x2ecc71);
    
    const nextText = this.scene.add.text(75, 25, 'Next: Design', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    nextText.setOrigin(0.5);
    
    nextButton.add([nextBg, nextText]);
    nextBg.on('pointerdown', () => {
      this.proceedToDesign();
    });
    this.container.add(nextButton);
  }
  
  /**
   * Select a template
   * @param templateId The ID of the template to select
   */
  private selectTemplate(templateId: string) {
    console.log(`[SetupStep] Selected template: ${templateId}`);
    
    // Update selected template
    this.selectedTemplate = templateId;
    
    // Update UI to show selection
    this.templates.forEach((template, index) => {
      const container = this.templateButtons[index];
      
      if (container && container.getAt) {
        const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
        
        if (template.id === templateId) {
          bg.setStrokeStyle(4, 0x3498db);
          bg.fillColor = 0x2a3a4a; // Slightly blue tint when selected
        } else {
          bg.setStrokeStyle(2, 0x555555);
          bg.fillColor = 0x444444; // Reset to default color
        }
      }
    });
  }
  
  /**
   * Proceed to the design step
   */
  private proceedToDesign() {
    // Update level settings from form
    this.levelSettings.name = this.nameInput.value;
    this.levelSettings.description = this.descriptionInput.value;
    this.levelSettings.difficulty = parseInt(this.difficultySlider.value);
    
    console.log('[SetupStep] Proceeding to design with settings:', this.levelSettings);
    
    // Create or update level
    let levelData;
    if (this.levelId) {
      // Load existing level and update settings
      levelData = this.service.loadLevel(this.levelId);
      if (levelData) {
        levelData.settings = this.levelSettings;
      } else {
        // Fallback if level can't be loaded
        levelData = this.service.createLevelFromTemplate(this.selectedTemplate, this.levelSettings);
      }
    } else {
      // Create new level from template
      levelData = this.service.createLevelFromTemplate(this.selectedTemplate, this.levelSettings);
    }
    
    // Save level
    const levelId = this.service.saveLevel(levelData);
    
    // Update manager with current level ID
    this.manager.setCurrentLevelId(levelId);
    
    // Transition to design step
    this.scene.events.emit('step:change', 'design');
  }
  
  /**
   * Update method called every frame
   * @param _time Current time
   * @param _delta Time since last frame
   */
  update(_time: number, _delta: number) {
    // No continuous updates needed for this step
  }
}
