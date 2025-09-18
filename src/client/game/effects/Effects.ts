import * as Phaser from 'phaser';
import { theme } from '../../theme';

export function screenFlash(scene: Phaser.Scene, color = theme.colors.orange, duration = 120) {
  scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
}
