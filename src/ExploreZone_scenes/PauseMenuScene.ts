import Phaser from 'phaser';

export default class PauseMenuScene extends Phaser.Scene {
    private parentSceneKey!: string;

    constructor() {
        super('PauseMenuScene');
    }

    init(data: { parentScene: string }) {
        // Memorizziamo quale scena ha chiamato la pausa per poterla "s-pausare"
        this.parentSceneKey = data.parentScene;
    }

    create() {
        const { width, height } = this.scale;

        // 1. Sfondo nero semitrasparente
        this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0);

        // 2. Titolo del menu
        this.add.text(width / 2, height / 2 - 150, 'GAME PAUSED', {
            fontSize: '40px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // --- FUNZIONE HELPER PER CREARE BOTTONI ---
        // Ti permette di aggiungere nuove voci al menu in modo ordinato
        const createButton = (y: number, text: string, callback: () => void) => {
            const btn = this.add.text(width / 2, y, text, {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#444444',
                padding: { x: 20, y: 10 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true }); // Fa apparire la manina del mouse

            // Effetti grafici al passaggio del mouse
            btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#666666', color: '#ffff00' }));
            btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#444444', color: '#ffffff' }));
            
            // Azione al click
            btn.on('pointerdown', callback);
        };

        // 3. I Bottoni del Menu

        // Bottone: Riprendi
        createButton(height / 2 - 40, 'Resume the Game', () => {
            this.resumeGame();
        });

        // Bottone: Altro (WIP)
        createButton(height / 2 + 30, 'Settings (WIP)', () => {
            console.log("Qui in futuro aprirai il menu delle opzioni!");
        });

        // Bottone: Torna al Menu Principale
        createButton(height / 2 + 100, 'Return to Main Menu', () => {
            // Ferma definitivamente il livello che era in pausa
            this.sound.stopAll();
            this.scene.stop(this.parentSceneKey);
            // Ferma questa scena di pausa
            this.scene.stop();
            
            // Lancia la scena iniziale. 
            // ATTENZIONE: Sostituisci 'MainMenu' con il nome reale della tua scena iniziale!
            window.location.href = '/menu_page.html'; 
        });

        // 4. Permetti di togliere la pausa ri-premendo ESC
        this.input.keyboard!.on('keydown-ESC', () => {
            this.resumeGame();
        });
    }

    private resumeGame() {
        this.scene.resume(this.parentSceneKey);
        this.scene.stop();
    }
}