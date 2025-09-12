/**
 * TestStep.ts
 * Third step in the Build Mode workflow
 * Allows the user to playtest the level they've created
 */

import * as Phaser from 'phaser';
import { BuildModeManager } from '../../entities/BuildModeManager';
import BuildModeService from '../../services/BuildModeService';

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
  
  // Test state
  private isPlaying: boolean = false;
  private testStartTime: number = 0;
  private testStats = {
    timePlayed: 0,
    enemiesDefeated: 0,
    playerDeaths: 0,
    powerupsCollected: 0,
    score: 0
  };
  
  // Level ID
  private levelId?: string;
  
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
    this.levelId = levelId;
    
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
      0, 0,
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
   * Create the controls panel
   */
  private createControlsPanel(): void {
    // Controls container
    this.controlsContainer = this.scene.add.container(
      this.scene.scale.width / 2, 
      100
    );
    this.container.add(this.controlsContainer);
    
    // Panel background
    const panelBg = this.scene.add.rectangle(
      0, 0,
      400, 120,
      0x333333
    );
    panelBg.setOrigin(0.5, 0.5);
    panelBg.setStrokeStyle(1, 0x555555);
    this.controlsContainer.add(panelBg);
    
    // Title
    const title = this.scene.add.text(
      0, -40,
      'TEST YOUR LEVEL',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.controlsContainer.add(title);
    
    // Start button
    const startButton = this.scene.add.text(
      -80, 20,
      'START TEST',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#00aa00',
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });
    startButton.on('pointerdown', () => {
      this.startTest();
    });
    
    // Stop button (hidden initially)
    const stopButton = this.scene.add.text(
      80, 20,
      'STOP TEST',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#aa0000',
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5);
    stopButton.setInteractive({ useHandCursor: true });
    stopButton.on('pointerdown', () => {
      this.stopTest();
    });
    
    // Add buttons to container
    this.controlsContainer.add([startButton, stopButton]);
    
    // Initially hide the stop button
    stopButton.setVisible(false);
    
    // Store references to buttons for later use
    this.controlsContainer.setData('startButton', startButton);
    this.controlsContainer.setData('stopButton', stopButton);
  }
  
  /**
   * Create the feedback panel
   */
  private createFeedbackPanel(): void {
    // Feedback container
    this.feedbackContainer = this.scene.add.container(
      this.scene.scale.width / 2, 
      300
    );
    this.container.add(this.feedbackContainer);
    
    // Panel background
    const panelBg = this.scene.add.rectangle(
      0, 0,
      500, 300,
      0x333333
    );
    panelBg.setOrigin(0.5, 0.5);
    panelBg.setStrokeStyle(1, 0x555555);
    this.feedbackContainer.add(panelBg);
    
    // Title
    const title = this.scene.add.text(
      0, -130,
      'TEST RESULTS',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Create stat displays
    const createStatRow = (label: string, value: string, y: number) => {
      const row = this.scene.add.container(0, y);
      
      // Label
      const labelText = this.scene.add.text(
        -220, 0,
        label,
        {
          fontSize: '16px',
          color: '#aaaaaa',
          align: 'right'
        }
      ).setOrigin(0, 0.5);
      
      // Value
      const valueText = this.scene.add.text(
        -100, 0,
        value,
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'left'
        }
      ).setOrigin(0, 0.5);
      
      // Add to row
      row.add([labelText, valueText]);
      
      // Store reference to value text for updating
      row.setData('valueText', valueText);
      
      return row;
    };
    
    // Create rows for each stat
    const timeRow = createStatRow('Time Played:', '0:00', -90);
    const enemiesRow = createStatRow('Enemies Defeated:', '0', -60);
    const deathsRow = createStatRow('Player Deaths:', '0', -30);
    const powerupsRow = createStatRow('Powerups Collected:', '0', 0);
    const scoreRow = createStatRow('Score:', '0', 30);
    
    // Difficulty assessment
    const difficultyTitle = this.scene.add.text(
      0, 70,
      'DIFFICULTY ASSESSMENT',
      {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Difficulty indicator (placeholder)
    const difficultyText = this.scene.add.text(
      0, 100,
      'Not yet evaluated',
      {
        fontSize: '16px',
        color: '#aaaaaa'
      }
    ).setOrigin(0.5);
    
    // Add everything to the container
    this.feedbackContainer.add([
      title, 
      timeRow, 
      enemiesRow, 
      deathsRow, 
      powerupsRow, 
      scoreRow,
      difficultyTitle,
      difficultyText
    ]);
    
    // Store references for updating
    this.feedbackContainer.setData('timeRow', timeRow);
    this.feedbackContainer.setData('enemiesRow', enemiesRow);
    this.feedbackContainer.setData('deathsRow', deathsRow);
    this.feedbackContainer.setData('powerupsRow', powerupsRow);
    this.feedbackContainer.setData('scoreRow', scoreRow);
    this.feedbackContainer.setData('difficultyText', difficultyText);
    
    // Initially hide the feedback panel
    this.feedbackContainer.setVisible(false);
  }
  
  /**
   * Create navigation buttons between steps
   */
  private createStepNavigation(): void {
    // Back button (to Design step)
    const backButton = this.scene.add.text(
      this.scene.scale.width - 200, 
      this.scene.scale.height - 40,
      '< Back to Design',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0, 0.5);
    
    // Make button interactive
    backButton.setInteractive({ useHandCursor: true });
    
    // Navigate to Design step
    backButton.on('pointerdown', () => {
      // Change to Design step
      this.scene.events.emit('step:change', 'design', this.levelId);
    });
    
    // Next button (to Publish step)
    const nextButton = this.scene.add.text(
      this.scene.scale.width - 80, 
      this.scene.scale.height - 40,
      'Publish Level >',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0, 0.5);
    
    // Make button interactive
    nextButton.setInteractive({ useHandCursor: true });
    
    // Navigate to Publish step
    nextButton.on('pointerdown', () => {
      // Change to Publish step
      this.scene.events.emit('step:change', 'publish', this.levelId);
    });
    
    this.container.add([backButton, nextButton]);
  }
  
  /**
   * Set up the test environment
   */
  private setupTestEnvironment(): void {
    // To be implemented - prepare the level for testing
  }
  
  /**
   * Start the test
   */
  private startTest(): void {
    console.log('[TestStep] Starting test');
    this.isPlaying = true;
    this.testStartTime = this.scene.time.now;
    
    // Reset test stats
    this.testStats = {
      timePlayed: 0,
      enemiesDefeated: 0,
      playerDeaths: 0,
      powerupsCollected: 0,
      score: 0
    };
    
    // Hide start button, show stop button
    const startButton = this.controlsContainer.getData('startButton') as Phaser.GameObjects.Text;
    const stopButton = this.controlsContainer.getData('stopButton') as Phaser.GameObjects.Text;
    startButton.setVisible(false);
    stopButton.setVisible(true);
    
    // Hide feedback panel
    this.feedbackContainer.setVisible(false);
    
    // Start the actual test
    // To be implemented - start the game in test mode
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
    const startButton = this.controlsContainer.getData('startButton') as Phaser.GameObjects.Text;
    const stopButton = this.controlsContainer.getData('stopButton') as Phaser.GameObjects.Text;
    startButton.setVisible(true);
    stopButton.setVisible(false);
    
    // Update feedback panel
    this.updateFeedbackPanel();
    
    // Show feedback panel
    this.feedbackContainer.setVisible(true);
    
    // Stop the actual test
    // To be implemented - stop the test game
  }
  
  /**
   * Update the feedback panel with current stats
   */
  private updateFeedbackPanel(): void {
    // Format time played as mm:ss
    const minutes = Math.floor(this.testStats.timePlayed / 60);
    const seconds = Math.floor(this.testStats.timePlayed % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update each stat row
    const timeRow = this.feedbackContainer.getData('timeRow') as Phaser.GameObjects.Container;
    const timeValueText = timeRow.getData('valueText') as Phaser.GameObjects.Text;
    timeValueText.setText(timeString);
    
    const enemiesRow = this.feedbackContainer.getData('enemiesRow') as Phaser.GameObjects.Container;
    const enemiesValueText = enemiesRow.getData('valueText') as Phaser.GameObjects.Text;
    enemiesValueText.setText(this.testStats.enemiesDefeated.toString());
    
    const deathsRow = this.feedbackContainer.getData('deathsRow') as Phaser.GameObjects.Container;
    const deathsValueText = deathsRow.getData('valueText') as Phaser.GameObjects.Text;
    deathsValueText.setText(this.testStats.playerDeaths.toString());
    
    const powerupsRow = this.feedbackContainer.getData('powerupsRow') as Phaser.GameObjects.Container;
    const powerupsValueText = powerupsRow.getData('valueText') as Phaser.GameObjects.Text;
    powerupsValueText.setText(this.testStats.powerupsCollected.toString());
    
    const scoreRow = this.feedbackContainer.getData('scoreRow') as Phaser.GameObjects.Container;
    const scoreValueText = scoreRow.getData('valueText') as Phaser.GameObjects.Text;
    scoreValueText.setText(this.testStats.score.toString());
    
    // Update difficulty assessment
    const difficultyText = this.feedbackContainer.getData('difficultyText') as Phaser.GameObjects.Text;
    
    // Simple difficulty assessment logic
    let difficultyAssessment = '';
    let difficultyColor = '#ffffff';
    
    if (this.testStats.playerDeaths > 3) {
      difficultyAssessment = 'Too Difficult';
      difficultyColor = '#ff5555';
    } else if (this.testStats.playerDeaths > 0) {
      difficultyAssessment = 'Challenging';
      difficultyColor = '#ffaa55';
    } else if (this.testStats.enemiesDefeated > 20) {
      difficultyAssessment = 'Well Balanced';
      difficultyColor = '#55ff55';
    } else {
      difficultyAssessment = 'Too Easy';
      difficultyColor = '#55aaff';
    }
    
    difficultyText.setText(difficultyAssessment);
    difficultyText.setColor(difficultyColor);
  }
  
  /**
   * Update function called by the scene
   * @param time Current time
   * @param delta Time since last update
   */
  update(time: number, delta: number): void {
    // Update test stats if playing
    if (this.isPlaying) {
      // Update time played
      this.testStats.timePlayed = (time - this.testStartTime) / 1000;
      
      // Update other stats from the actual test
      // To be implemented
    }
  }
}
