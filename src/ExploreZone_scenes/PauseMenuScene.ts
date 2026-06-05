import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';

interface MenuButton {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Rectangle;
    baseYOffset: number;
    isMouseHovered: boolean;
    isHandHovered: boolean; 
    simulateOver: () => void;
    simulateOut: () => void;
    simulateDown: () => void;
    setCurrentScale: (scale: number) => void;
}
export default class PauseMenuScene extends Phaser.Scene {
    private parentSceneKey!: string;

    private bgRect!: Phaser.GameObjects.Rectangle;
    private titleText!: Phaser.GameObjects.Text;
    private buttons: MenuButton[] = [];
    
    private previousPinchState: boolean = false;

    constructor() {
        super('PauseMenuScene');
    }

    init(data: { parentScene: string }) {
        this.parentSceneKey = data.parentScene;
        this.buttons = [];
    }

    create() {
        const { width, height } = this.scale.gameSize;

        // 1. Sfondo nero con trasparenza
        this.bgRect = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);

        // 2. Titolo del menu
        this.titleText = this.add.text(width / 2, height / 2 - 200, 'GAME PAUSED', {
            fontSize: '46px',
            color: '#4caf50',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#4caf50', blur: 15, fill: true }
        }).setOrigin(0.5);

        // --- FUNZIONE HELPER AVANZATA PER CREARE BOTTONI (CON TWEENS E CONTAINER) ---
        const createAdvancedButton = (baseYOffset: number, text: string, callback: () => void, isSpecial: boolean = false) => {
            const baseFill = isSpecial ? 0x112233 : 0x1a1a1a;
            const baseStroke = isSpecial ? 0x00ffff : 0x4caf50; 
            const hoverFill = isSpecial ? 0x114466 : 0x2e5c31;
            const hoverStroke = isSpecial ? 0xffffff : 0x81c784;

            const btnContainer = this.add.container(width / 2, height / 2 + baseYOffset);
            
            const bgWidth = isSpecial ? 380 : 340;
            const bgHeight = isSpecial ? 70 : 60;
            const bg = this.add.rectangle(0, 0, bgWidth, bgHeight, baseFill, 0.7)
                .setStrokeStyle(2, baseStroke);

            const txt = this.add.text(0, 0, text, {
                fontSize: isSpecial ? '26px' : '22px',
                color: isSpecial ? '#00ffff' : '#ffffff',
                fontStyle: isSpecial ? 'bold' : 'normal',
                letterSpacing: 2
            }).setOrigin(0.5);

            btnContainer.add([bg, txt]);

            bg.setInteractive({ useHandCursor: true });

            let currentBaseScale = 1;

            // --- FUNZIONI DI SIMULAZIONE (Pura animazione, senza logica di stato) ---
            const simulateOver = () => {
                bg.setFillStyle(hoverFill, 0.9);
                bg.setStrokeStyle(3, hoverStroke);
                txt.setColor('#ffffff');
                this.tweens.killTweensOf(btnContainer); 
                this.tweens.add({ targets: btnContainer, scaleX: currentBaseScale * 1.15, scaleY: currentBaseScale * 1.15, duration: 150, ease: 'Power2' });
            };

            const simulateOut = () => {
                bg.setFillStyle(baseFill, 0.7);
                bg.setStrokeStyle(2, baseStroke);
                txt.setColor(isSpecial ? '#00ffff' : '#ffffff');
                this.tweens.killTweensOf(btnContainer); 
                this.tweens.add({ targets: btnContainer, scaleX: currentBaseScale, scaleY: currentBaseScale, duration: 150, ease: 'Power2' });
            };

            const simulateDown = () => {
                this.tweens.killTweensOf(btnContainer);
                this.tweens.add({
                    targets: btnContainer, scaleX: currentBaseScale * 0.95, scaleY: currentBaseScale * 0.95, duration: 50, yoyo: true
                });
                this.time.delayedCall(50, callback);
            };

            const btnObj: MenuButton = {
                container: btnContainer,
                bg: bg,
                baseYOffset: baseYOffset,
                isMouseHovered: false, // <--- Aggiornato
                isHandHovered: false,  // <--- Aggiornato
                simulateOver,
                simulateOut,
                simulateDown,
                setCurrentScale: (scale: number) => {
                    currentBaseScale = scale;
                    const isHovered = btnObj.isMouseHovered || btnObj.isHandHovered;
                    btnContainer.setScale(isHovered ? scale * 1.15 : scale);
                }
            };

            // --- EVENTI MOUSE INTELLIGENTI ---
            bg.on('pointerover', () => { 
                btnObj.isMouseHovered = true;
                // Si ingrandisce solo se non era già ingrandito dalla mano
                if (!btnObj.isHandHovered) simulateOver(); 
            });
            
            bg.on('pointerout', () => { 
                btnObj.isMouseHovered = false;
                // Si rimpicciolisce solo se anche la mano è lontana
                if (!btnObj.isHandHovered) simulateOut(); 
            });
            
            bg.on('pointerdown', () => { 
                simulateDown(); 
            });

            this.buttons.push(btnObj);
        };

        // 3. Generazione dei Bottoni
        createAdvancedButton(-80, 'Resume', () => { this.resumeGame(); });
        createAdvancedButton(0, 'Settings', () => { this.scene.start('SettingsScene', { parentScene: this.parentSceneKey }); });
        createAdvancedButton(80, 'Return to Main Menu', () => {
            this.sound.stopAll();
            this.scene.stop(this.parentSceneKey);
            this.scene.stop('ControlsScene');
            this.scene.stop('ABIScene');
            this.scene.stop();
            this.scene.start('MenuPageScene');
        });

        const tutorialScenes = ['ExternalScene', 'Scene2_Membrane', 'Scene3_Internal'];
        if (tutorialScenes.includes(this.parentSceneKey)) {
            createAdvancedButton(200, '► TUTORIAL LEVELS ◄', () => {
                this.scene.start('LevelSelectScene', { parentScene: this.parentSceneKey });
            }, true);
        }

        // 4. Input da tastiera (ESC)
        this.input.keyboard!.on('keydown-ESC', () => { this.resumeGame(); });

        this.scene.bringToTop();

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive()) return;

            const newW = gameSize.width;
            const newH = gameSize.height;

            this.cameras.main.setSize(newW, newH);
            this.bgRect.setSize(newW, newH);

            const scaleFactor = newW / 1920;
            const uiScale = Phaser.Math.Clamp(scaleFactor, 1, 1.3);

            this.titleText.setPosition(newW / 2, newH / 2 - (200 * uiScale));
            this.titleText.setScale(uiScale);

            this.buttons.forEach(btn => {
                btn.container.setPosition(newW / 2, newH / 2 + (btn.baseYOffset * uiScale));
                btn.setCurrentScale(uiScale);
            });
        };

        this.scale.on('resize', onResize);
        onResize(this.scale.gameSize);

        this.events.on('shutdown', () => {
            this.scale.off('resize', onResize);
            this.tweens.killAll();
        });
    }

    update(time: number, delta: number) {
        const inputMode = this.registry.get('inputMode') || localStorage.getItem('inputMode');

        if (inputMode === 'hand') {

            const tracker = HandTrackingController.getInstance();
            const px = tracker.targetX * this.scale.gameSize.width;
            const py = tracker.targetY * this.scale.gameSize.height;
            const currentPinch = tracker.isClicked;

            let hoveredButton: MenuButton | null = null;

            this.buttons.forEach(btn => {
                const bounds = btn.bg.getBounds();
                const isHandHovering = bounds.contains(px, py);

                // Se la MANO entra nel bottone
                if (isHandHovering && !btn.isHandHovered) {
                    btn.isHandHovered = true;
                    if (!btn.isMouseHovered) btn.simulateOver();
                } 
                // Se la MANO esce dal bottone
                else if (!isHandHovering && btn.isHandHovered) {
                    btn.isHandHovered = false;
                    if (!btn.isMouseHovered) btn.simulateOut();
                }

                // Consideriamo il bottone "puntato" se c'è sopra il mouse o la mano
                if (isHandHovering || btn.isMouseHovered) {
                    hoveredButton = btn;
                }
            });

            if (currentPinch && !this.previousPinchState) {
                if (hoveredButton) {
                    (hoveredButton as MenuButton).simulateDown();
                }
            }

            this.previousPinchState = currentPinch;
        }
    }

    private resumeGame() {
        this.scene.resume(this.parentSceneKey);
        this.scene.stop();
    }
}