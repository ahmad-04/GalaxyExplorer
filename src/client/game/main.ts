import * as Phaser from 'phaser';
import { Boot } from './scenes/Boot';
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
      debug: false,
    },
  },
  scene: [Boot, MainMenu, StarshipScene, GameOver],
};

const StartGame = (parent: string) => {
  const game = new Phaser.Game({ ...config, parent });
  return game;
};

export default StartGame;
