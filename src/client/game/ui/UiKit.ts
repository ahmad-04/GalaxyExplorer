import * as Phaser from 'phaser';
import { theme } from '../../theme';

export function titleText(scene: Phaser.Scene, x: number, y: number, text: string) {
  return scene.add
    .text(x, y, text, {
      fontFamily: theme.fonts.header,
      fontSize: '56px',
      color: theme.palette.white,
      stroke: '#F6733A',
      strokeThickness: theme.stroke.thick,
    })
    .setOrigin(0.5, 0.5);
}

export function bodyText(scene: Phaser.Scene, x: number, y: number, text: string, size = 22) {
  return scene.add
    .text(x, y, text, {
      fontFamily: theme.fonts.body,
      fontSize: `${size}px`,
      color: theme.palette.beige,
    })
    .setOrigin(0.5, 0.5);
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { fillAlpha?: number }
) {
  const g = scene.add.graphics();
  g.fillStyle(theme.colors.navy, options?.fillAlpha ?? theme.alpha.strong);
  g.lineStyle(theme.stroke.thick, theme.colors.green, 0.6);
  g.fillRoundedRect(x, y, w, h, theme.radii.lg);
  g.strokeRoundedRect(x, y, w, h, theme.radii.lg);
  return g;
}

export function createButton(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  label: string,
  opts?: { width?: number; height?: number }
) {
  const width = opts?.width ?? 200;
  const height = opts?.height ?? 44;
  const g = scene.add.graphics();
  g.fillStyle(theme.colors.green, 0.85);
  g.lineStyle(theme.stroke.thin, theme.colors.beige, 0.8);
  // Draw relative to (0,0); container will be positioned at (cx,cy)
  g.fillRoundedRect(-width / 2, -height / 2, width, height, theme.radii.md);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, theme.radii.md);
  const t = scene.add.text(0, 0, label, {
    fontFamily: theme.fonts.body,
    fontSize: '22px',
    color: theme.palette.white,
    stroke: '#1D313C',
    strokeThickness: 2,
  });
  t.setOrigin(0.5);
  const container = scene.add.container(cx, cy, [g, t]);
  container.setSize(width, height);

  // Use a Zone for precise, transform-aware hit testing
  const hit = scene.add.zone(0, 0, width, height).setOrigin(0.5, 0.5);
  hit.setInteractive({ useHandCursor: true });
  container.add(hit);

  // Smooth, non-conflicting scale tweens
  const tweenTo = (scale: number, duration = 120) => {
    if (!container.active) return;
    scene.tweens.killTweensOf(container);
    scene.tweens.add({ targets: container, scale, duration, ease: 'Sine.Out' });
  };

  hit.on('pointerover', () => tweenTo(1.06));
  hit.on('pointerout', () => tweenTo(1.0));
  hit.on('pointerdown', () => {
    tweenTo(0.96, 80);
    // Forward event to container to preserve external listeners
    container.emit('pointerdown');
  });
  hit.on('pointerup', () => {
    tweenTo(1.0);
    container.emit('pointerup');
  });
  hit.on('pointerupoutside', () => tweenTo(1.0));
  return { container, background: g, label: t };
}
