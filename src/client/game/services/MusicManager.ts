import * as Phaser from 'phaser';

export class MusicManager {
  static targetVolume = 0.6;
  static fadeMs = 350;

  private static getSound(scene: Phaser.Scene, key: string): Phaser.Sound.BaseSound | null {
    try {
      let s = scene.sound.get(key);
      if (!s) s = scene.sound.add(key, { loop: true, volume: this.targetVolume });
      return s;
    } catch {
      return null;
    }
  }

  private static fadeIn(
    scene: Phaser.Scene,
    sound: Phaser.Sound.BaseSound,
    toVol = MusicManager.targetVolume,
    duration = MusicManager.fadeMs
  ): void {
    try {
      // Start from zero if not playing
      if (!sound.isPlaying) {
        (sound as any).volume = 0; // set immediately before play
        sound.play();
      }
      scene.tweens.add({
        targets: sound as any,
        volume: toVol,
        duration,
        ease: 'Sine.easeInOut',
      });
    } catch {}
  }

  private static fadeOut(
    scene: Phaser.Scene,
    sound: Phaser.Sound.BaseSound,
    duration = MusicManager.fadeMs,
    stopAfter = true
  ): void {
    try {
      if (!sound.isPlaying) {
        if (stopAfter) sound.stop();
        return;
      }
      scene.tweens.add({
        targets: sound as any,
        volume: 0,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          try {
            if (stopAfter) sound.stop();
            (sound as any).volume = MusicManager.targetVolume; // reset default for next time
          } catch {}
        },
      });
    } catch {}
  }

  static crossFade(
    scene: Phaser.Scene,
    fromKey: string | undefined,
    toKey: string,
    duration = MusicManager.fadeMs
  ): void {
    try {
      const to = this.getSound(scene, toKey);
      const from = fromKey ? scene.sound.get(fromKey) : null;
      if (from && from.isPlaying) this.fadeOut(scene, from, duration, true);
      if (to) this.fadeIn(scene, to, this.targetVolume, duration);
    } catch {}
  }

  static ensureLoading(scene: Phaser.Scene): void {
    this.crossFade(scene, undefined, 'music_loading');
  }
}

export default MusicManager;
