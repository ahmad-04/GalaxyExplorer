import * as Phaser from 'phaser';
import { LoadingScene } from './scenes/LoadingScene';
import { MainMenu } from './scenes/MainMenu';
import { CustomizationScene } from './scenes/CustomizationScene';
import { GameOver } from './scenes/GameOver';
import { StarshipScene } from './scenes/StarshipScene';
import { EndlessScene } from './scenes/EndlessScene';
import { CustomLevelScene } from './scenes/CustomLevelScene';
import { BuildModeScene } from './scenes/BuildModeScene';
import { isFeatureEnabled } from '../../shared/config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#0b1220',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: import.meta.env?.DEV === true,
    },
  },
  dom: { createContainer: true },
  scene: [
    LoadingScene,
    MainMenu,
    StarshipScene,
    EndlessScene,
    CustomLevelScene,
    GameOver,
    CustomizationScene,
    ...(isFeatureEnabled('ENABLE_BUILD_MODE') ? [BuildModeScene] : []),
  ],
};

const StartGame = (parent: string, customConfig?: Record<string, unknown>) => {
  const game = new Phaser.Game({ ...config, parent });

  // Try to load saved configurations from localStorage
  try {
    // Load background config
    const savedBgConfig = localStorage.getItem('galaxyExplorer_backgroundConfig');
    if (savedBgConfig) {
      const bgConfig = JSON.parse(savedBgConfig);
      console.log('[StartGame] Loading background config from localStorage:', bgConfig);
      game.registry.set('backgroundConfig', bgConfig);
    }

    // Load ship config
    const savedShipConfig = localStorage.getItem('galaxyExplorer_shipConfig');
    if (savedShipConfig) {
      const shipConfig = JSON.parse(savedShipConfig);
      console.log('[StartGame] Loading ship config from localStorage:', shipConfig);
      game.registry.set('shipConfig', shipConfig);
    }
  } catch (e) {
    console.error('[StartGame] Error loading saved configurations:', e);
  }

  // Override with custom config if provided (e.g. from URL parameters)
  if (customConfig && Object.keys(customConfig).length > 0) {
    console.log('[StartGame] Setting backgroundConfig from URL params:', customConfig);
    game.registry.set('backgroundConfig', customConfig);
  }

  return game;
};

export default StartGame;
