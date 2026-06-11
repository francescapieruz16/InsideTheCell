import Phaser from 'phaser';

export default class AudioManager {
    private static instance: Phaser.Sound.BaseSound | null = null;
    private static currentKey: string = ''; // Ricorda quale traccia sta suonando

    public static playMusic(scene: Phaser.Scene, key: string) {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

            // 1. C'è già una musica attiva?
            if (this.instance) {
                // Se è la STESSA musica, aggiorniamo il volume e ci assicuriamo che suoni
                if (this.currentKey === key) {
                    (this.instance as any).setVolume(targetVolume);
                    if (!this.instance.isPlaying) {
                        this.instance.play();
                    }
                    return;
                } else {
                    // Se è una musica DIVERSA, la fermiamo e la distruggiamo
                    this.instance.stop();
                    this.instance.destroy();
                    this.instance = null;
                }
            }

            // 2. Controlliamo se Phaser ha in memoria la nuova traccia
            let existingMusic = scene.sound.get(key) as Phaser.Sound.BaseSound;

            if (existingMusic) {
                this.instance = existingMusic;
                this.currentKey = key;
                (this.instance as any).setVolume(targetVolume);
                if (!this.instance.isPlaying) {
                    this.instance.play();
                }
                return;
            }

            // 3. Creiamo la nuova musica da zero
            this.instance = scene.sound.add(key, { loop: true, volume: targetVolume });
            this.currentKey = key;
            this.instance.play();

        } catch (e) {
            console.warn("Audio Manager Error (ignorato per non bloccare il gioco):", e);
        }
    }

    // --- NUOVO: Ferma la musica attuale ---
    public static stopMusic() {
        try {
            if (this.instance) {
                this.instance.stop();
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
}