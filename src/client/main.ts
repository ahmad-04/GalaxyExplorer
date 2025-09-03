import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  const game = StartGame('game-container');
  console.log('Game instance created:', game);
});
