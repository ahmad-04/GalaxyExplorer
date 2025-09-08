import StartGame from './game/main';

// It's important to declare the Devvit type for TypeScript
interface DevvitClient {
  init: (callback: (context?: unknown) => void | Promise<void>) => void;
  getProps: <T = unknown>() => Promise<T>;
}
declare const Devvit: DevvitClient;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded. Initializing Devvit context...');

  // Check if the Devvit object is available
  if (typeof Devvit !== 'undefined') {
    Devvit.init(async (context: unknown) => {
      console.log('Devvit context initialized:', context);
      if (context) {
        const props = await Devvit.getProps<Record<string, unknown>>();
        console.log('Props received from Devvit:', props);
        StartGame('game-container', props);
      } else {
        console.log('No Devvit context, starting game without props.');
        StartGame('game-container');
      }
    });
  } else {
    // Fallback for local development outside of Reddit
    console.log('Devvit object not found. Running in fallback mode.');
    StartGame('game-container');
  }
});
