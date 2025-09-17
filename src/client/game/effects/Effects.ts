import * as Phaser from 'phaser';
import { theme } from '../../theme';

export function shineSweep(scene: Phaser.Scene, y: number) {
  const rect = scene.add.rectangle(-80, y, 60, 70, theme.colors.white, 0.18);
  rect.setAngle(20);
  scene.tweens.add({
    targets: rect,
    x: scene.scale.width + 80,
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => rect.destroy(),
  });
}

export function screenFlash(scene: Phaser.Scene, color = theme.colors.orange, duration = 120) {
  scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
}
