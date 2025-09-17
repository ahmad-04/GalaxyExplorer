import { StarshipScene } from './StarshipScene';

export class EndlessScene extends StarshipScene {
  constructor() {
    super({ key: 'EndlessScene' });
  }

  // Override create to force endless spawning behavior
  override create(): void {
    // Mark in registry so GameOver can route back appropriately
    this.registry.set('lastRunMode', 'endless');
    // Force endless behavior in base logic
    this.registry.set('forceEndless', true);
    // Ensure flags that affect completion testing are disabled
    this.registry.set('buildModeTest', false);
    this.registry.set('testMode', false);
    this.registry.set('customLevelPlaythrough', false);

    // Call base create
    super.create();

    // If custom level data was preloaded in registry, ignore it in Endless runs
    // by restarting spawns and clearing any completion monitors
    this.events.off('enemy:removed');
  }
}
