import Phaser from 'phaser';
import { getLeaderboard } from '../api';

export class LeaderboardScene extends Phaser.Scene {
    private leaderboardContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'LeaderboardScene' });
    }

    create() {
        // Semi-transparent background overlay
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setOrigin(0);

        // Create main container for the leaderboard
        this.leaderboardContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
        
        // Create the leaderboard window with blue border
        const background = this.add.rectangle(0, 0, 500, 400, 0x000022, 0.9);
        background.setStrokeStyle(3, 0x0088ff, 1);
        
        // Close button
        const closeButton = this.add.text(220, -180, 'X', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5).setInteractive();
        
        closeButton.on('pointerover', () => closeButton.setTint(0xff0000));
        closeButton.on('pointerout', () => closeButton.clearTint());
        closeButton.on('pointerdown', () => this.scene.stop());
        
        // Title
        const title = this.add.text(0, -170, 'GALACTIC LEADERBOARD', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Headers
        const headerY = -120;
        const rankX = -180;
        const commanderX = 0;
        const scoreX = 180;
        
        // Blue header background
        const headerBg = this.add.rectangle(0, headerY, 460, 40, 0x0033aa, 0.7);
        headerBg.setStrokeStyle(1, 0x4466ff, 0.8);
        
        // Column headers
        this.add.text(rankX, headerY, 'RANK', { 
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px', 
            color: '#aaccff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        
        this.add.text(commanderX, headerY, 'COMMANDER', { 
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px', 
            color: '#aaccff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        
        this.add.text(scoreX, headerY, 'SCORE', { 
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px', 
            color: '#aaccff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Add loading text
        const loadingText = this.add.text(0, 0, 'LOADING LEADERBOARD...', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            color: '#4466ff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Add the main elements to the container
        this.leaderboardContainer.add([background, closeButton, title, headerBg, loadingText]);

        // Add all header texts
        this.leaderboardContainer.add([
            this.add.text(rankX, headerY, 'RANK', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#aaccff',
                fontStyle: 'bold',
            }).setOrigin(0.5),
            
            this.add.text(commanderX, headerY, 'COMMANDER', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#aaccff',
                fontStyle: 'bold',
            }).setOrigin(0.5),
            
            this.add.text(scoreX, headerY, 'SCORE', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#aaccff',
                fontStyle: 'bold',
            }).setOrigin(0.5)
        ]);

        // Separator line
        const separator = this.add.graphics();
        separator.lineStyle(1, 0x4466ff, 0.7);
        separator.beginPath();
        separator.moveTo(-230, headerY + 20);
        separator.lineTo(230, headerY + 20);
        separator.strokePath();
        this.leaderboardContainer.add(separator);

        // Keyboard handling
        this.input.keyboard?.on('keydown-ESC', () => {
            this.scene.stop();
        });

        // Load the leaderboard data
        this.loadLeaderboardData();
    }

    private async loadLeaderboardData() {
        try {
            // Fetch the leaderboard data
            const data = await getLeaderboard(10);
            
            // Remove loading text
            this.leaderboardContainer.getAll().forEach(child => {
                if (child instanceof Phaser.GameObjects.Text && child.text === 'LOADING LEADERBOARD...') {
                    child.destroy();
                }
            });

            // Check if we got data
            if (data.scores && data.scores.length > 0) {
                const startY = -80; // Start position for the first entry
                const rowHeight = 36;
                
                // Add each score entry
                data.scores.slice(0, 10).forEach((score, index) => {
                    const y = startY + (index * rowHeight);
                    const rankX = -180;
                    const commanderX = 0;
                    const scoreX = 180;
                    
                    // Row background color (alternating)
                    let rowBgColor = index % 2 === 0 ? 0x223366 : 0x112244;
                    // Special background for top 3
                    if (index < 3) {
                        const topColors = [0x664400, 0x555555, 0x553311];
                        rowBgColor = topColors[index] || rowBgColor;
                    }
                    
                    // Add row background
                    const rowBg = this.add.rectangle(0, y, 460, 32, rowBgColor, 0.3);
                    this.leaderboardContainer.add(rowBg);
                    
                    // For ranks 1-3, skip the rank number
                    if (index < 3) {
                        // Top 3 have special colors
                        const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                        const color = colors[index] || '#FFFFFF';
                        
                        // Add commander name with special color
                        this.leaderboardContainer.add(this.add.text(commanderX, y, score.username, {
                            fontFamily: 'Arial, sans-serif',
                            fontSize: '20px',
                            color: color,
                            fontStyle: 'bold',
                        }).setOrigin(0.5));
                        
                        // Add score with special color
                        this.leaderboardContainer.add(this.add.text(scoreX, y, score.score.toString(), {
                            fontFamily: 'Arial, sans-serif',
                            fontSize: '20px',
                            color: color,
                            fontStyle: 'bold',
                        }).setOrigin(0.5));
                    } else {
                        // For ranks 4-10, show rank number
                        this.leaderboardContainer.add(this.add.text(rankX, y, (index + 1).toString(), {
                            fontFamily: 'Arial, sans-serif',
                            fontSize: '20px',
                            color: '#ffffff',
                        }).setOrigin(0.5));
                        
                        // Add commander name
                        this.leaderboardContainer.add(this.add.text(commanderX, y, score.username, {
                            fontFamily: 'Arial, sans-serif',
                            fontSize: '20px',
                            color: '#ffffff',
                        }).setOrigin(0.5));
                        
                        // Add score
                        this.leaderboardContainer.add(this.add.text(scoreX, y, score.score.toString(), {
                            fontFamily: 'Arial, sans-serif',
                            fontSize: '20px',
                            color: '#ffffff',
                        }).setOrigin(0.5));
                    }
                });
            } else {
                // No scores available
                this.leaderboardContainer.add(this.add.text(0, 0, 'NO SCORES AVAILABLE', {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '24px',
                    color: '#ff6666',
                }).setOrigin(0.5));
            }
        } catch (error) {
            console.error('Error loading leaderboard data:', error);
            // Show error message
            this.leaderboardContainer.add(this.add.text(0, 0, 'ERROR LOADING LEADERBOARD', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                color: '#ff6666',
            }).setOrigin(0.5));
        }
    }
}
