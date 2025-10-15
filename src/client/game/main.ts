import * as Phaser from 'phaser';
import { LoadingScene } from './scenes/LoadingScene';
import { MainMenu } from './scenes/MainMenu';
import { GameOver } from './scenes/GameOver';
import { LevelComplete } from './scenes/LevelComplete';
import { StarshipScene } from './scenes/StarshipScene';
import { EndlessScene } from './scenes/EndlessScene';
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
    LevelComplete,
    GameOver,
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
    console.log('[StartGame] Setting config from webview context:', customConfig);
    game.registry.set('backgroundConfig', customConfig);
    game.registry.set('webviewContext', customConfig);

    // Handle different launch modes based on webview context
    const mode = customConfig.mode as string;
    const blockType = customConfig.blockType as string;

    console.log('[StartGame] Detected mode:', mode, 'blockType:', blockType);
    console.log('[StartGame] Full custom config:', customConfig);

    // Store mode information for scenes to use
    game.registry.set('launchMode', mode);
    game.registry.set('launchBlockType', blockType);

    // Set up auto-start behavior based on mode
    if (mode === 'play') {
      console.log('[StartGame] Setting up play mode');
      game.registry.set('autoStartGame', true);

      // Handle different play types
      const gameType = customConfig.gameType as string;
      console.log('[StartGame] Game type:', gameType);

      if (gameType === 'campaign') {
        game.registry.set('gameType', 'campaign');
      } else if (gameType === 'community') {
        game.registry.set('gameType', 'community');
        game.registry.set('showLevelBrowser', true);
      } else if (gameType === 'challenge') {
        game.registry.set('gameType', 'challenge');
        game.registry.set('challengeMode', true);
      }
    } else if (mode === 'build') {
      console.log('[StartGame] Setting up build mode');
      game.registry.set('autoStartBuild', true);

      // Handle different build actions
      const action = customConfig.action as string;
      console.log('[StartGame] Build action:', action);
      game.registry.set('buildAction', action);

      if (action === 'tutorial') {
        game.registry.set('showBuildTutorial', true);
      }
    } else {
      console.log('[StartGame] No specific mode detected, using default behavior');
    }
  } else {
    console.log('[StartGame] No custom config provided, using defaults');
  }

  return game;
};

export default StartGame;
