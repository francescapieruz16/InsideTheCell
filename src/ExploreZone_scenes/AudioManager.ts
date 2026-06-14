import Phaser from 'phaser';

export default class AudioManager {
    private static instance: Phaser.Sound.BaseSound | null = null;
    private static currentKey: string = ''; 
    
    private static volumeTween: Phaser.Tweens.Tween | null = null;

    public static playMusic(scene: Phaser.Scene, key: string) {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

            if (this.instance) {
                if (this.currentKey === key) {
                    this.killVolumeTween();
                    (this.instance as any).setVolume(targetVolume);
                    if (!this.instance.isPlaying) this.instance.play();
                    return;
                } else {
                    this.stopMusic();
                }
            }

            let existingMusic = scene.sound.get(key) as Phaser.Sound.BaseSound;

            if (existingMusic) {
                this.instance = existingMusic;
                this.currentKey = key;
                this.killVolumeTween();
                (this.instance as any).setVolume(targetVolume);
                if (!this.instance.isPlaying) this.instance.play();
                return;
            }

            this.instance = scene.sound.add(key, { loop: true, volume: targetVolume });
            this.currentKey = key;
            this.instance.play();

        } catch (e) {
            console.warn("Audio Manager Error:", e);
        }
    }

    public static stopMusic() {
        try {
            this.killVolumeTween();

            if (this.instance) {
                this.instance.stop();
                this.instance.destroy();
                this.instance = null;
                this.currentKey = '';
            }
        } catch (e) {
            console.warn("Audio Stop Error:", e);
        }
    }

    public static setVolume(volume: number) {
        try {
            this.killVolumeTween();

            if (this.instance) {
                (this.instance as any).setVolume(volume);
            }
        } catch (e) {
            console.warn("Audio Volume Error:", e);
        }
    }

    public static duckMusic(scene: Phaser.Scene, ducking: boolean) {
        try {
            if (this.instance) {
                const savedSettings = localStorage.getItem('gameSettings');
                const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;
                
                this.killVolumeTween();

                this.volumeTween = scene.tweens.add({
                    targets: this.instance,
                    volume: ducking ? 0.1 : targetVolume,
                    duration: 500,
                    onComplete: () => {
                        this.volumeTween = null;
                    }
                });
            }
        } catch (e) {
            console.warn("Audio Ducking Error:", e);
        }
    }

    private static killVolumeTween() {
        if (this.volumeTween) {
            this.volumeTween.stop();
            this.volumeTween.remove();
            this.volumeTween = null;
        }
    }
}