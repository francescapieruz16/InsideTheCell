import Phaser from 'phaser';

export default class PauseMenuScene extends Phaser.Scene {
    private parentSceneKey!: string;

    constructor() {
        super('PauseMenuScene');
    }

    init(data: { parentScene: string }) {
        this.parentSceneKey = data.parentScene;
    }

    create() {
        const { width, height } = this.scale;

        // 1. Sfondo nero con maggiore trasparenza e un leggero gradiente (opzionale)
        this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);

        // 2. Titolo del menu - Più "Tech" e brillante
        this.add.text(width / 2, height / 2 - 200, 'GAME PAUSED', {
            fontSize: '46px',
            color: '#4caf50', // Richiama i terminali e i recettori del tuo gioco
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#4caf50', blur: 15, fill: true }
        }).setOrigin(0.5);

        // --- FUNZIONE HELPER AVANZATA PER CREARE BOTTONI (CON TWEENS E CONTAINER) ---
        const createAdvancedButton = (y: number, text: string, callback: () => void, isSpecial: boolean = false) => {
            
            // Definiamo i colori base e di hover (diverso se il tasto è speciale)
            const baseFill = isSpecial ? 0x112233 : 0x1a1a1a;
            const baseStroke = isSpecial ? 0x00ffff : 0x4caf50; // Ciano per lo speciale, verde per i normali
            const hoverFill = isSpecial ? 0x114466 : 0x2e5c31;
            const hoverStroke = isSpecial ? 0xffffff : 0x81c784;

            // Creiamo un Container. Sposteremo e animeremo questo, non i singoli elementi.
            const btnContainer = this.add.container(width / 2, y);

            // Sfondo visivo del bottone (Rettangolo con bordo colorato)
            const bgWidth = isSpecial ? 380 : 340;
            const bgHeight = isSpecial ? 70 : 60;
            const bg = this.add.rectangle(0, 0, bgWidth, bgHeight, baseFill, 0.7)
                .setStrokeStyle(2, baseStroke);

            // Testo centrato all'interno del rettangolo
            const txt = this.add.text(0, 0, text, {
                fontSize: isSpecial ? '26px' : '22px',
                color: isSpecial ? '#00ffff' : '#ffffff',
                fontStyle: isSpecial ? 'bold' : 'normal',
                letterSpacing: 2
            }).setOrigin(0.5);

            // Aggiungiamo elementi al container
            btnContainer.add([bg, txt]);

            // Rendiamo interattiva l'area del rettangolo
            bg.setInteractive({ useHandCursor: true });

            // --- ANIMAZIONI E FEEDBACK VISIVO ---
            bg.on('pointerover', () => {
                bg.setFillStyle(hoverFill, 0.9);
                bg.setStrokeStyle(3, hoverStroke);
                txt.setColor('#ffffff');
                // Ingrandisce fluidamente il container
                this.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Power2' });
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(baseFill, 0.7);
                bg.setStrokeStyle(2, baseStroke);
                txt.setColor(isSpecial ? '#00ffff' : '#ffffff');
                // Riporta alla dimensione originale
                this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Power2' });
            });

            bg.on('pointerdown', () => {
                // Effetto "click" meccanico: si schiaccia per un attimo, poi esegue l'azione
                this.tweens.add({
                    targets: btnContainer, 
                    scaleX: 0.95, 
                    scaleY: 0.95, 
                    duration: 50, 
                    yoyo: true,
                    onComplete: callback
                });
            });

            return btnContainer;
        };

        // 3. Generazione dei Bottoni
        
        let startY = height / 2 - 80;

        // Bottone: Riprendi
        createAdvancedButton(startY, 'Resume', () => {
            this.resumeGame();
        });

        // Bottone: Settings
        createAdvancedButton(startY + 80, 'Settings', () => {
            this.scene.start('SettingsScene', { parentScene: this.parentSceneKey });
        });

        // Bottone: Torna al Menu Principale
        createAdvancedButton(startY + 160, 'Return to Main Menu', () => {
            this.sound.stopAll();
            this.scene.stop(this.parentSceneKey);
            this.scene.stop('ControlsScene');
            this.scene.stop('ABIScene');
            this.scene.stop();
            this.scene.start('MenuPageScene');
        });

        const tutorialScenes = ['ExternalScene', 'Scene2_Membrane', 'Scene3_Internal'];

        // --- IL BOTTONE SPECIALE "LEVEL SELECTION" ---
        // Lo distanziamo ulteriormente in basso e gli passiamo "true" per lo stile speciale
        if (tutorialScenes.includes(this.parentSceneKey)) {
            createAdvancedButton(startY + 280, '► TUTORIAL LEVELS ◄', () => {
                this.scene.start('LevelSelectScene', { parentScene: this.parentSceneKey });
            }, true);
        }

        // 4. Input da tastiera (ESC)
        this.input.keyboard!.on('keydown-ESC', () => {
            this.resumeGame();
        });

        this.scene.bringToTop();

        this.events.on('shutdown', () => {
            this.scene.stop();
        });
    }

    private resumeGame() {
        this.scene.resume(this.parentSceneKey);
        this.scene.stop();
    }
}