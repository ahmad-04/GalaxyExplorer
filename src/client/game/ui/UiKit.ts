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
  // Keep UI stable regardless of camera scroll
  container.setScrollFactor(0);
  g.setScrollFactor(0);
  t.setScrollFactor(0);

  // Use a Zone for precise, transform-aware hit testing
  const hit = scene.add.zone(0, 0, width, height).setOrigin(0.5, 0.5);
  hit.setInteractive({ useHandCursor: true });
  hit.setScrollFactor(0);
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

// Pill-style button with variants and enabled state
export function createPillButton(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  label: string,
  opts?: {
    width?: number;
    height?: number;
    variant?: 'primary' | 'success' | 'danger' | 'neutral';
    disabled?: boolean;
    fontSize?: number;
  }
) {
  const width = opts?.width ?? 200;
  const height = opts?.height ?? 40;
  const fontSize = opts?.fontSize ?? 16;
  const variant = opts?.variant ?? 'neutral';

  const colors = {
    primary: { fill: 0x1d4ed8, stroke: 0x60a5fa },
    success: { fill: 0x065f46, stroke: 0x10b981 },
    danger: { fill: 0x991b1b, stroke: 0x7f1d1d },
    neutral: { fill: 0x111827, stroke: 0x2b3a4a },
    disabled: { fill: 0x1f2937, stroke: 0x374151 },
  } as const;

  const g = scene.add.graphics();
  const draw = (state: 'normal' | 'hover' | 'disabled') => {
    g.clear();
    const palette =
      state === 'disabled'
        ? colors.disabled
        : state === 'hover'
          ? { fill: colors[variant].fill + 0x001111, stroke: colors[variant].stroke }
          : colors[variant];
    g.fillStyle(palette.fill, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    g.lineStyle(1, palette.stroke, 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);
  };
  draw(opts?.disabled ? 'disabled' : 'normal');

  const t = scene.add.text(0, 0, label, {
    fontFamily: theme.fonts.body,
    fontSize: `${fontSize}px`,
    color: theme.palette.white,
  });
  t.setOrigin(0.5);

  const container = scene.add.container(cx, cy, [g, t]);
  container.setSize(width, height);
  // Keep on-screen relative to camera; prevents hit area drift
  container.setScrollFactor(0);
  g.setScrollFactor(0);
  t.setScrollFactor(0);
  // Add an invisible centered hit rectangle for reliable input mapping
  const hit = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0.001)
    .setOrigin(0.5, 0.5)
    .setScrollFactor(0);
  hit.setInteractive({ useHandCursor: true });
  container.add(hit);

  const setEnabled = (enabled: boolean) => {
    if (enabled) {
      draw('normal');
      hit.setInteractive({ useHandCursor: true });
      if (hit.input) hit.input.cursor = 'pointer';
      container.alpha = 1;
      container.setData('disabled', false);
    } else {
      draw('disabled');
      hit.disableInteractive();
      if (hit.input) hit.input.cursor = 'default';
      container.alpha = 0.9;
      container.setData('disabled', true);
    }
  };

  hit.on('pointerover', () => {
    if (container.getData('disabled')) return;
    draw('hover');
  });
  hit.on('pointerout', () => {
    if (container.getData('disabled')) return;
    draw('normal');
  });
  hit.on('pointerdown', () => {
    if (container.getData('disabled')) return;
    scene.tweens.add({ targets: container, scale: 0.96, duration: 60, yoyo: true });
    container.emit('pointerdown');
  });
  hit.on('pointerup', () => {
    if (container.getData('disabled')) return;
    container.emit('pointerup');
  });

  container.setData('disabled', !!opts?.disabled);
  return { container, background: g, label: t, setEnabled };
}

// Panel with optional header bar and centered title
export function createHeaderPanel(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  width: number,
  height: number,
  title?: string
) {
  const container = scene.add.container(cx, cy);
  const bg = scene.add.rectangle(0, 0, width, height, 0x1f2937, 0.98).setOrigin(0.5);
  bg.setStrokeStyle(1, 0x2b3a4a, 1);
  container.add(bg);
  let headerBg: Phaser.GameObjects.Rectangle | undefined;
  let titleText: Phaser.GameObjects.Text | undefined;
  if (title) {
    headerBg = scene.add.rectangle(0, -height / 2 + 24, width, 48, 0x111827, 1).setOrigin(0.5);
    titleText = scene.add
      .text(0, -height / 2 + 24, title, {
        fontFamily: theme.fonts.header,
        fontSize: '20px',
        color: theme.palette.white,
      })
      .setOrigin(0.5);
    container.add([headerBg, titleText]);
  }
  return { container, background: bg, headerBg, title: titleText };
}

// Simple checkbox with label
export function createCheckbox(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  checked = true
) {
  const container = scene.add.container(x, y);
  const box = scene.add.rectangle(0, 0, 20, 20, 0x555555).setOrigin(0.5);
  box.setStrokeStyle(1, 0xaaaaaa, 1);
  const mark = scene.add.text(0, 0, '✓', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
  mark.setVisible(checked);
  const text = scene.add
    .text(16 + 6, 0, label, { fontFamily: theme.fonts.body, fontSize: '16px', color: '#ffffff' })
    .setOrigin(0, 0.5);
  const hit = scene.add.zone(0, 0, 20 + 6 + text.width, 24).setOrigin(0, 0.5);
  hit.setInteractive({ useHandCursor: true });
  container.add([box, mark, text, hit]);
  const setChecked = (v: boolean) => {
    mark.setVisible(v);
    container.setData('checked', v);
    box.setFillStyle(v ? 0x0066cc : 0x555555, 1);
  };
  setChecked(checked);
  hit.on('pointerdown', () => setChecked(!container.getData('checked')));
  return { container, setChecked, getChecked: () => !!container.getData('checked') };
}

// Top overlay bar with text and optional right-aligned button
export function createOverlayBar(
  scene: Phaser.Scene,
  text: string,
  opts?: { y?: number; width?: number; rightButtonLabel?: string; onRightClick?: () => void }
) {
  const width = opts?.width ?? Math.min(scene.scale.width - 32, 640);
  const y = opts?.y ?? 60;
  const container = scene.add.container(scene.scale.width / 2, y);
  const bg = scene.add.rectangle(0, 0, width, 44, 0x111827, 0.95).setOrigin(0.5);
  bg.setStrokeStyle(1, 0x2b3a4a, 1);
  const label = scene.add
    .text(-width / 2 + 12, 0, text, {
      fontFamily: theme.fonts.body,
      fontSize: '14px',
      color: '#e5e7eb',
      wordWrap: { width: width - 120 },
    })
    .setOrigin(0, 0.5);
  container.add([bg, label]);
  if (opts?.rightButtonLabel) {
    const btn = createPillButton(scene, width / 2 - 66, 0, opts.rightButtonLabel, {
      width: 110,
      height: 28,
      variant: 'danger',
      fontSize: 14,
    });
    if (opts.onRightClick) {
      btn.container.on('pointerdown', () => opts.onRightClick!());
    }
    container.add(btn.container);
  }
  container.setDepth(10000);
  return { container, background: bg };
}

// Toast notification helper
export function showToast(
  scene: Phaser.Scene,
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) {
  const c = scene.add.container(scene.scale.width / 2, scene.scale.height + 50);
  let color = 0x0088ff;
  if (type === 'success') color = 0x00aa44;
  else if (type === 'error') color = 0xaa0000;
  const bg = scene.add.graphics();
  bg.fillStyle(color, 0.9);
  bg.fillRoundedRect(-200, -25, 400, 50, 8);
  bg.lineStyle(2, 0xffffff, 0.5);
  bg.strokeRoundedRect(-200, -25, 400, 50, 8);
  const txt = scene.add
    .text(0, 0, message, {
      fontFamily: theme.fonts.body,
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 380 },
    })
    .setOrigin(0.5);
  const icon = scene.add
    .text(-170, 0, type === 'success' ? '✓' : type === 'error' ? '✗' : '!', {
      fontFamily: theme.fonts.body,
      fontSize: '24px',
      color: '#ffffff',
    })
    .setOrigin(0.5);
  c.add([bg, txt, icon]);
  c.setDepth(10000);
  scene.tweens.add({
    targets: c,
    y: scene.scale.height - 100,
    duration: 300,
    ease: 'Back.out',
    onComplete: () => {
      scene.time.delayedCall(3000, () => {
        scene.tweens.add({
          targets: c,
          y: scene.scale.height + 50,
          alpha: 0,
          duration: 300,
          ease: 'Back.in',
          onComplete: () => c.destroy(),
        });
      });
    },
  });
  return c;
}
