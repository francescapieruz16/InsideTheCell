import Phaser from 'phaser';

export default class LevelSelectScene extends Phaser.Scene {
    private parentSceneKey: string | null = null;

    constructor() {
        super('LevelSelectScene');
    }

    init(data: any) {
        if (data && data.parentScene) {
            this.parentSceneKey = data.parentScene;
        } else {
            this.parentSceneKey = null;
        }
    }

    create() {
        this.scene.bringToTop();

        const { width, height } = this.scale;

        // Sfondo nero semitrasparente
        this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0);

        // --- TITOLO CON EFFETTO NEON/TECH ---
        this.add.text(width / 2, 120, 'LEVEL SELECTION', {
            fontSize: '46px',
            color: '#00ffff', // Ciano brillante
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 15, fill: true }
        }).setOrigin(0.5);

        // Lettura progresso
        const savedProgress = localStorage.getItem('maxUnlockedLevel');
        const maxUnlocked = savedProgress ? parseInt(savedProgress, 10) : 1;

        const levels = [
            { id: 1, name: "Level 1: External Membrane", sceneKey: "ExternalScene" },
            { id: 2, name: "Level 2: Membrane Crossing", sceneKey: "Scene2_Membrane" },
            { id: 3, name: "Level 3: Cytoplasm", sceneKey: "Scene3_Internal" }
        ];

        let startY = 280;

        levels.forEach((level) => {
            const isUnlocked = level.id <= maxUnlocked;

            // Creiamo un Container per gestire sfondo, testo e lucchetto come un unico blocco
            const btnContainer = this.add.container(width / 2, startY);

            const bgWidth = 500;
            const bgHeight = 70;

            // --- PALETTE COLORI CONDIZIONALE ---
            const baseFill = isUnlocked ? 0x112233 : 0x1a1a1a;
            const baseStroke = isUnlocked ? 0x4caf50 : 0x333333; 
            const hoverFill = 0x2e5c31;
            const hoverStroke = 0x81c784;
            const textAlpha = isUnlocked ? 1 : 0.4; // I livelli bloccati sono sbiaditi

            // Sfondo del bottone
            const bg = this.add.rectangle(0, 0, bgWidth, bgHeight, baseFill, isUnlocked ? 0.8 : 0.6)
                .setStrokeStyle(2, baseStroke);

            // Testo del bottone
            const btnText = this.add.text(0, 0, level.name, {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: isUnlocked ? 'bold' : 'normal',
                letterSpacing: 1
            }).setOrigin(0.5).setAlpha(textAlpha);

            btnContainer.add([bg, btnText]);

            if (isUnlocked) {
                bg.setInteractive({ useHandCursor: true });

                // --- EFFETTI HOVER E CLICK ---
                bg.on('pointerover', () => {
                    bg.setFillStyle(hoverFill, 0.9);
                    bg.setStrokeStyle(3, hoverStroke);
                    this.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Power2' });
                });

                bg.on('pointerout', () => {
                    bg.setFillStyle(baseFill, 0.8);
                    bg.setStrokeStyle(2, baseStroke);
                    this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Power2' });
                });

                bg.on('pointerdown', () => {
                    // Animazione di pressione fisica del bottone
                    this.tweens.add({
                        targets: btnContainer, 
                        scaleX: 0.95, 
                        scaleY: 0.95, 
                        duration: 50, 
                        yoyo: true,
                        onComplete: () => {
                            // WARM-UP SINTESI VOCALE
                            const warmupUtterance = new SpeechSynthesisUtterance(' ');
                            warmupUtterance.volume = 0; 
                            warmupUtterance.rate = 1.0;  // Previene crash in contentScript.js
                            warmupUtterance.pitch = 1.0; // Previene crash in contentScript.js
                            window.speechSynthesis.speak(warmupUtterance);
                            if (this.parentSceneKey) {
                                this.scene.stop(this.parentSceneKey);
                            }
                            this.scene.start(level.sceneKey, { incomingTexture: 'nav_front' });
                        }
                    });
                });
            } else {
                // --- STILE LIVELLO BLOCCATO ---
                // Posizioniamo il lucchetto pulito all'estremità destra del rettangolo
                const lockIcon = this.add.text(bgWidth / 2 - 40, 0, "🔒", { fontSize: '24px' })
                    .setOrigin(0.5)
                    .setAlpha(0.5);
                btnContainer.add(lockIcon);
            }

            startY += 100; // Spaziatura verticale
        });

        // --- TASTO INDIETRO DINAMICO ---
        const backText = this.parentSceneKey ? '< Resume Game' : '< MAIN MENU';
        
        const backBtn = this.add.text(60, 60, backText, {
            fontSize: '22px',
            color: '#ffeb3b',
            fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true });

        // Aggiunto hover effect semplice anche per il tasto indietro
        backBtn.on('pointerover', () => backBtn.setColor('#ffffff').setScale(1.05));
        backBtn.on('pointerout', () => backBtn.setColor('#ffeb3b').setScale(1));

        backBtn.on('pointerdown', () => {
            if (this.parentSceneKey) {
                this.scene.resume(this.parentSceneKey);
                this.scene.stop();
            } else {
                window.location.href = '/menu_page.html';
            }
        });
    }
}