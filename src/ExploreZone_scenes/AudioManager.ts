export default class AudioManager {
    private static instance: Phaser.Sound.BaseSound;

    public static playMusic(scene: Phaser.Scene, key: string) {
        if (!this.instance) {
            // Leggi le impostazioni per avviare la musica al volume corretto
            const savedSettings = localStorage.getItem('gameSettings');
            const targetVolume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

            this.instance = scene.sound.add(key, { loop: true, volume: targetVolume });
            this.instance.play();
        }
    }
}