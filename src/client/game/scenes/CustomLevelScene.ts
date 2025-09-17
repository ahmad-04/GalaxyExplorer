import { StarshipScene } from './StarshipScene';

export class CustomLevelScene extends StarshipScene {
  constructor() {
    super({ key: 'CustomLevelScene' });
  }

  override create(): void {
    // Mark custom run
    this.registry.set('lastRunMode', 'custom');
    this.registry.set('customLevelPlaythrough', true);
    // Do not mark buildModeTest here; caller may set it when testing from editor
    // Ensure testMode flag is not used here unless upstream sets it

    // Base create handles setting up enemies; it will detect testLevelData and start completion monitor
    super.create();
  }
}
