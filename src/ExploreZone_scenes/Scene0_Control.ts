import Phaser from 'phaser';

export default class ControlsScene extends Phaser.Scene {
    private parentSceneKey!: string;

    constructor() {
        super('ControlsScene');
    }

    // Riceve i dati dalla scena che l'ha chiamata
    init(data: { parentScene: string }) {
        // Salviamo il nome del livello da "s-pausare" dopo
        this.parentSceneKey = data.parentScene;
    }

    create() {
        // Prendi le dimensioni reali dello schermo/canvas
        const { width, height } = this.scale;

        // 1. Sfondo nero con trasparenza (0.8 = 80% opaco)
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        bg.setOrigin(0, 0); // Lo allineiamo in alto a sinistra

        // 2. Testo del Titolo
        this.add.text(width / 2, height / 2 - 120, 'COMANDI DI GIOCO', {
            fontSize: '36px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5); // Centrato

        // 3. Testo dei Comandi
        this.add.text(width / 2, height / 2, 
            'FRECCE DIREZIONALI : Pilotaggio Navicella\n\n' +
            'BARRA SPAZIATRICE : Interagisci / Avanti nei dialoghi', {
            fontSize: '24px',
            color: '#cccccc',
            align: 'center'
        }).setOrigin(0.5);

        // 4. Testo di interazione (Skippabile)
        const promptText = this.add.text(width / 2, height / 2 + 150, 'Premi [INVIO] per continuare', {
            fontSize: '20px',
            color: '#ffff00'
        }).setOrigin(0.5);

        // (Opzionale) Effetto pulsante per far lampeggiare il testo INVIO
        this.tweens.add({
            targets: promptText,
            alpha: 0.2, // Sfuma fino al 20%
            duration: 800, // In 0.8 secondi
            yoyo: true, // Torna indietro
            repeat: -1 // Ripeti all'infinito
        });

        // 5. Input: ascolta il tasto INVIO una sola volta
        this.input.keyboard!.once('keydown-ENTER', () => {
            // Riattiva il livello bloccato
            this.scene.resume(this.parentSceneKey);
            // Chiudi (distruggi) questa schermata di overlay
            this.scene.stop();
        });
    }
}