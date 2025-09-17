import StartGame from './game/main';
import './style.css';
import './buildmode-ui.css';

// It's important to declare the Devvit type for TypeScript
interface DevvitClient {
  init: (callback: (context?: unknown) => void | Promise<void>) => void;
  getProps: <T = unknown>() => Promise<T>;
}
declare const Devvit: DevvitClient;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded. Initializing Devvit context...');
  // Failsafe: hide splash after 7s in case boot hangs
  const splashTimeout = window.setTimeout(() => {
    const el = document.getElementById('splash');
    if (el) el.classList.add('hidden');
  }, 7000);

  // Check if the Devvit object is available
  if (typeof Devvit !== 'undefined') {
    Devvit.init(async (context: unknown) => {
      console.log('Devvit context initialized:', context);
      if (context) {
        const props = await Devvit.getProps<Record<string, unknown>>();
        console.log('Props received from Devvit:', props);
        StartGame('game-container', props);
        window.clearTimeout(splashTimeout);
      } else {
        console.log('No Devvit context, starting game without props.');
        StartGame('game-container');
        window.clearTimeout(splashTimeout);
      }
    });
  } else {
    // Fallback for local development outside of Reddit
    console.log('Devvit object not found. Running in fallback mode.');
    StartGame('game-container');
    window.clearTimeout(splashTimeout);
  }
});
