import * as Phaser from 'phaser';
import { theme } from '../../theme';

export class BackgroundManager {
  static ensureStars(scene: Phaser.Scene): string {
    if (scene.textures.exists('stars')) return 'stars';
    if (!scene.textures.exists('stars_navy')) {
      BackgroundManager.createStarsFallback(scene, 'stars_navy', 256, 256, 140);
    }
    return 'stars_navy';
  }

  static createStarsFallback(
    scene: Phaser.Scene,
    key: string,
    w: number,
    h: number,
    count: number
  ) {
    const g = scene.add.graphics();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#13222b');
      gradient.addColorStop(1, theme.palette.navy);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      scene.textures.addCanvas(key + '_bg', canvas);
    }
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, w - 1);
      const y = Phaser.Math.Between(0, h - 1);
      const r = Phaser.Math.FloatBetween(0.5, 2.2);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x, y, r);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
