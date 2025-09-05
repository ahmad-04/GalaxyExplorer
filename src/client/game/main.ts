import * as Phaser from 'phaser';
import { MainMenu } from './scenes/MainMenu';
import { GameOver } from './scenes/GameOver';
import { StarshipScene } from './scenes/StarshipScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: true, // enable temporarily so we can see bodies move
    },
  },
  // Keep only the gameplay scene for now to eliminate side-effects.
  scene: [MainMenu, StarshipScene, GameOver],
};

const StartGame = (parent: string) => {
  console.log('Starting game with config:', config);
  const game = new Phaser.Game({ ...config, parent });
  console.log('Game instance created');
  return game;
};

export default StartGame;
