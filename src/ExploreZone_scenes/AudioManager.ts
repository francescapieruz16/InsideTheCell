import Phaser from 'phaser';

export default class AudioManager {
    private static instance: Phaser.Sound.BaseSound | null = null;
    private static currentKey: string = ''; 

    public static playMusic(scene: Phaser.Scene, key: string) {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

            // 0. Pulizia sicura: se l'istanza è morta (il suo nodo audio è null), dimentichiamola
            if (this.instance && !(this.instance as any).volumeNode) {
                this.instance = null;
            }

            // 1. C'è già una musica attiva e integra?
            if (this.instance) {
                if (this.currentKey === key) {
                    (this.instance as any).setVolume(targetVolume);
                    if (!this.instance.isPlaying) this.instance.play();
                    return;
                } else {
                    // SE LA CHIAVE È DIVERSA: Ferma e distruggi la musica vecchia
                    this.instance.stop();
                    this.instance.destroy();
                    this.instance = null;
                }
            }

            // 2. Controlliamo se Phaser ha un "fantasma" in memoria
            let existingMusic = scene.sound.get(key) as Phaser.Sound.BaseSound;

            if (existingMusic) {
                // Se il fantasma ha il nodo distrutto, rimuoviamolo dal SoundManager
                if (!(existingMusic as any).volumeNode) {
                    scene.sound.remove(existingMusic);
                } else {
                    this.instance = existingMusic;
                    this.currentKey = key;
                    (this.instance as any).setVolume(targetVolume);
                    if (!this.instance.isPlaying) this.instance.play();
                    return;
                }
            }

            // 3. Creiamo la nuova musica da zero
            this.instance = scene.sound.add(key, { loop: true, volume: targetVolume });
            this.currentKey = key;
            this.instance.play();

        } catch (e) {
            console.warn("Audio Manager Error:", e);
        }
    }

    public static stopMusic() {
        try {
            // Controlla sempre che il nodo sia valido prima di interagire
            if (this.instance && (this.instance as any).volumeNode) {
                this.instance.stop();
            }
        } catch (e) {
            console.warn("Audio Stop Error:", e);
        }
    }

    public static setVolume(volume: number) {
        try {
            if (this.instance && (this.instance as any).volumeNode) {
                (this.instance as any).setVolume(volume);
            }
        } catch (e) {
            console.warn("Audio Volume Error:", e);
        }
    }

    public static duckMusic(scene: Phaser.Scene, ducking: boolean) {
        try {
            //  Applica il tween SOLO se la musica sta effettivamente suonando ed è integra
            if (this.instance && this.instance.isPlaying && (this.instance as any).volumeNode) {
                const savedSettings = localStorage.getItem('gameSettings');
                const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

                if (targetVolume === 0) return;

                const duckedVolume = Math.min(0.1, targetVolume);
                
                scene.tweens.add({
                    targets: this.instance,
                    volume: ducking ? duckedVolume : targetVolume,
                    duration: 500
                });
            }
        } catch (e) {
            console.warn("Audio Ducking Error:", e);
        }
    }
}