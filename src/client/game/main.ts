import * as Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { CustomizationScene } from './scenes/CustomizationScene';
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
  scene: [Boot, MainMenu, StarshipScene, GameOver, CustomizationScene],
};

const StartGame = (parent: string, customConfig?: Record<string, unknown>) => {
  const game = new Phaser.Game({ ...config, parent });

  if (customConfig && Object.keys(customConfig).length > 0) {
    console.log('[StartGame] Setting backgroundConfig in registry:', customConfig);
    game.registry.set('backgroundConfig', customConfig);
  }

  return game;
};

export default StartGame;
