import Phaser from 'phaser';

export default class AudioManager {
    private static instance: Phaser.Sound.BaseSound | null = null;
    private static currentKey: string = ''; 

    public static playMusic(scene: Phaser.Scene, key: string) {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

            // 1. C'è già una musica attiva?
            if (this.instance) {
                if (this.currentKey === key) {
                    (this.instance as any).setVolume(targetVolume);
                    if (!this.instance.isPlaying) this.instance.play();
                    return;
                } else {
                    // SE LA CHIAVE È DIVERSA: Ferma e distruggi la musica vecchia!
                    this.instance.stop();
                    this.instance.destroy();
                    this.instance = null;
                }
            }

            // 2. Controlliamo se Phaser ha un "fantasma" in memoria
            let existingMusic = scene.sound.get(key) as Phaser.Sound.BaseSound;

            if (existingMusic) {
                this.instance = existingMusic;
                this.currentKey = key;
                (this.instance as any).setVolume(targetVolume);
                if (!this.instance.isPlaying) this.instance.play();
                return;
            }

            // 3. Creiamo la nuova musica
            this.instance = scene.sound.add(key, { loop: true, volume: targetVolume });
            this.currentKey = key;
            this.instance.play();

        } catch (e) {
            console.warn("Audio Manager Error:", e);
        }
    }

    public static stopMusic() {
        try {
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
            if (this.instance) {
                (this.instance as any).setVolume(volume);
            }
        } catch (e) {
            console.warn("Audio Volume Error:", e);
        }
    }

    // --- NUOVO: GESTISCE IL VOLUME DEI DIALOGHI SENZA CRASHARE ---
    public static duckMusic(scene: Phaser.Scene, ducking: boolean) {
        try {
            if (this.instance) {
                const savedSettings = localStorage.getItem('gameSettings');
                const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;
                
                scene.tweens.add({
                    targets: this.instance,
                    volume: ducking ? 0.1 : targetVolume,
                    duration: 500
                });
            }
        } catch (e) {
            console.warn("Audio Ducking Error:", e);
        }
    }
}