import Phaser from 'phaser';

export default class AudioManager {
    private static instance: Phaser.Sound.BaseSound | null = null;

    public static playMusic(scene: Phaser.Scene, key: string) {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

            // 1. Chiediamo a Phaser se esiste già una traccia con questo nome sicura in memoria
            let existingMusic = scene.sound.get(key) as Phaser.Sound.BaseSound;

            if (existingMusic) {
                this.instance = existingMusic; // Aggiorna il nostro riferimento
                
                // Aggiorniamo il volume e la facciamo ripartire se era ferma
                (this.instance as any).setVolume(targetVolume);
                if (!this.instance.isPlaying) {
                    this.instance.play();
                }
                return;
            }

            // 2. Se non esiste (es. primo avvio o spazzata via), la creiamo da zero in totale sicurezza
            this.instance = scene.sound.add(key, { loop: true, volume: targetVolume });
            this.instance.play();
            
        } catch (e) {
            console.warn("Audio Manager Error (ignorato per non bloccare il gioco):", e);
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