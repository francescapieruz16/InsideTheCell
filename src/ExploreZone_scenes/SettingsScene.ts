import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';

export interface GameSettings {
    textSpeed: string; 
    masterVol: number; 
    voiceVol: number;
    sfxVol: number;
    musicVol: number;  
    previousVoiceVol: number;
}

interface InteractiveElement {
    obj: Phaser.GameObjects.GameObject & { getBounds: () => Phaser.Geom.Rectangle };
    isHovered: boolean;
    simulateOver: () => void;
    simulateOut: () => void;
    simulateDown: () => void;
}

export default class SettingsScene extends Phaser.Scene {
    private parentSceneKey: string | null = null;
    private settings!: GameSettings;

    private bgRect!: Phaser.GameObjects.Rectangle;
    private mainContainer!: Phaser.GameObjects.Container;
    
    private warningPopup!: Phaser.GameObjects.Container;
    private warningBoxContainer!: Phaser.GameObjects.Container;
    private warningOverlay!: Phaser.GameObjects.Rectangle;

    private interactables: InteractiveElement[] = [];
    private previousPinchState: boolean = false;

    constructor() {
        super('SettingsScene');
    }

    init(data: any) {
        this.parentSceneKey = data.parentScene || null;
        this.interactables = [];
    }

    create() {
        this.scene.bringToTop();
        const { width, height } = this.scale.gameSize;

        this.bgRect = this.add.rectangle(0, 0, width, height, 0x000000, 0.95).setOrigin(0);

        this.mainContainer = this.add.container(width / 2, height / 2);

        const title = this.add.text(0, -380, 'SYSTEM SETTINGS', {
            fontSize: '46px', color: '#00ffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 15, fill: true }
        }).setOrigin(0.5);
        this.mainContainer.add(title);

        this.loadSettings();

        // --- GENERATORE DI STEPPER E TOGGLE ---
        let startY = -250;
        const spacingY = 75;
        
        const speedOptions = ['Slow', 'Normal', 'Fast', 'Instant'];
        this.createStepper(startY, 'Text Speed', speedOptions, 
            () => this.settings.textSpeed, 
            (val) => { this.settings.textSpeed = val; this.saveSettings(); }
        );

        this.createVolumeStepper(startY + spacingY, 'Master Volume', 
            () => this.settings.masterVol, 
            (val) => { this.settings.masterVol = val; this.saveSettings(); }
        );

        this.createVolumeStepper(startY + (spacingY * 2), 'A.B.I. Voice Vol', 
            () => this.settings.voiceVol, 
            (val) => { 
                this.settings.voiceVol = val; 
                if (val > 0) this.settings.previousVoiceVol = val;
                this.saveSettings(); 
                
                if (val === 0 || (val === 10 && this.settings.voiceVol > 0)) {
                    this.scene.restart({ parentScene: this.parentSceneKey });
                }
            }
        );

        this.createMuteToggle(startY + (spacingY * 3));

        this.createVolumeStepper(startY + (spacingY * 4), 'Music Volume', 
            () => this.settings.musicVol, 
            (val) => { this.settings.musicVol = val; this.saveSettings(); }
        );

        // --- BOTTONI PRINCIPALI ---
        const saveBtnY = startY + (spacingY * 5.2);
        
        const saveBtn = this.add.text(0, saveBtnY, '💾 SAVE & CLOSE', {
            fontSize: '28px', color: '#000000', backgroundColor: '#4caf50', padding: { x: 40, y: 15 }
        }).setOrigin(0.5);
        
        this.makeInteractive(saveBtn, 
            () => saveBtn.setStyle({ backgroundColor: '#81c784', color: '#ffffff' }).setScale(1.1),
            () => saveBtn.setStyle({ backgroundColor: '#4caf50', color: '#000000' }).setScale(1),
            () => {
                if (this.parentSceneKey) this.scene.start('PauseMenuScene', { parentScene: this.parentSceneKey });
                else this.scene.start('MenuPageScene');
            }
        );
        this.mainContainer.add(saveBtn);

        // --- BOTTONI DI GESTIONE DATI ---
        const dataBtnY = startY + (spacingY * 6.8);

        const defaultBtn = this.add.text(-200, dataBtnY, '↻ DEFAULT SETTINGS', {
            fontSize: '24px', color: '#000000', backgroundColor: '#00ffff', padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.makeInteractive(defaultBtn,
            () => defaultBtn.setStyle({ backgroundColor: '#ffffff' }).setScale(1.1),
            () => defaultBtn.setStyle({ backgroundColor: '#00ffff' }).setScale(1),
            () => this.resetSettingsToDefault()
        );
        this.mainContainer.add(defaultBtn);

        const resetBtn = this.add.text(200, dataBtnY, '⚠ RESET PROGRESS', {
            fontSize: '24px', color: '#ff5555', backgroundColor: '#331111', padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.createWarningPopup();

        this.makeInteractive(resetBtn,
            () => resetBtn.setStyle({ color: '#ffffff', backgroundColor: '#ff0000' }).setScale(1.1),
            () => resetBtn.setStyle({ color: '#ff5555', backgroundColor: '#331111' }).setScale(1),
            () => this.warningPopup.setVisible(true)
        );
        this.mainContainer.add(resetBtn);

        // --- RESIZE LOGIC ---
        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;

            const newW = gameSize.width;
            const newH = gameSize.height;

            this.cameras.main.setSize(newW, newH);
            this.bgRect.setSize(newW, newH);

            const scaleFactor = newW / 1920;
            const uiScale = Phaser.Math.Clamp(scaleFactor, 0.6, 1.3);

            this.mainContainer.setPosition(newW / 2, newH / 2);
            this.mainContainer.setScale(uiScale);

            this.warningOverlay.setPosition(0, 0);
            this.warningOverlay.setSize(newW, newH);

            this.warningBoxContainer.setPosition(newW / 2, newH / 2);
            this.warningBoxContainer.setScale(uiScale);
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

            let hoveredElement: InteractiveElement | null = null;
            const isPopupOpen = this.warningPopup && this.warningPopup.visible;

            this.interactables.forEach(el => {
                const isElementInPopup = el.obj.parentContainer === this.warningBoxContainer;
                if ((isPopupOpen && !isElementInPopup) || (!isPopupOpen && isElementInPopup)) {
                    if (el.isHovered) {
                        el.isHovered = false;
                        el.simulateOut();
                    }
                    return;
                }

                const bounds = Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(el.obj.getBounds()), 15, 15);
                const isHovering = Phaser.Geom.Rectangle.Contains(bounds, px, py);

                if (isHovering && !el.isHovered) {
                    el.isHovered = true;
                    el.simulateOver();
                } else if (!isHovering && el.isHovered) {
                    el.isHovered = false;
                    el.simulateOut();
                }

                if (isHovering) hoveredElement = el;
            });

            if (currentPinch && !this.previousPinchState) {
                if (hoveredElement) {
                    (hoveredElement as InteractiveElement).simulateDown();
                }
            }

            this.previousPinchState = currentPinch;
        }
    }

    // =========================================================
    // --- HELPER LOGICA E INTERAZIONE ---
    // =========================================================

    private makeInteractive(
        obj: Phaser.GameObjects.GameObject & { getBounds: () => Phaser.Geom.Rectangle },
        onOver: () => void,
        onOut: () => void,
        onDown: () => void
    ) {
        obj.setInteractive({ useHandCursor: true });
        
        const interactable: InteractiveElement = {
            obj, isHovered: false, simulateOver: onOver, simulateOut: onOut, simulateDown: onDown
        };

        obj.on('pointerover', () => { interactable.isHovered = true; onOver(); });
        obj.on('pointerout', () => { interactable.isHovered = false; onOut(); });
        obj.on('pointerdown', () => { onDown(); }); 

        this.interactables.push(interactable);
    }

    private loadSettings() {
        const saved = localStorage.getItem('gameSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
            if (this.settings.previousVoiceVol === undefined) this.settings.previousVoiceVol = 100;
        } else {
            this.applyDefaultSettings();
        }
    }

    private saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(this.settings));
    }

    private applyDefaultSettings() {
        this.settings = { textSpeed: 'Normal', masterVol: 100, voiceVol: 100, previousVoiceVol: 100, sfxVol: 100, musicVol: 100 };
    }

    private resetSettingsToDefault() {
        this.applyDefaultSettings();
        this.saveSettings();
        this.scene.restart({ parentScene: this.parentSceneKey });
    }

    // =========================================================
    // --- COSTRUTTORI UI ---
    // =========================================================

    private createStepper(y: number, label: string, options: string[], getVal: () => string, setVal: (val: string) => void) {
        const lblText = this.add.text(-250, y, label, { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0, 0.5);
        let currentIndex = options.indexOf(getVal());
        const valText = this.add.text(150, y, options[currentIndex], { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

        const leftBtn = this.add.text(50, y, '<', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5);
        const rightBtn = this.add.text(250, y, '>', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5);

        const updateDisplay = () => {
            valText.setText(options[currentIndex]);
            setVal(options[currentIndex]);
        };

        this.makeInteractive(leftBtn, 
            () => leftBtn.setColor('#ffffff').setScale(1.2), 
            () => leftBtn.setColor('#00ffff').setScale(1), 
            () => { currentIndex = (currentIndex - 1 + options.length) % options.length; updateDisplay(); }
        );

        this.makeInteractive(rightBtn, 
            () => rightBtn.setColor('#ffffff').setScale(1.2), 
            () => rightBtn.setColor('#00ffff').setScale(1), 
            () => { currentIndex = (currentIndex + 1) % options.length; updateDisplay(); }
        );

        this.mainContainer.add([lblText, valText, leftBtn, rightBtn]);
    }

    private createVolumeStepper(y: number, label: string, getVal: () => number, setVal: (val: number) => void) {
        const lblText = this.add.text(-250, y, label, { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0, 0.5);
        let currentVol = getVal();
        const valText = this.add.text(150, y, `${currentVol}%`, { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

        const leftBtn = this.add.text(50, y, '<', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5);
        const rightBtn = this.add.text(250, y, '>', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5);

        const updateDisplay = () => {
            valText.setText(`${currentVol}%`);
            setVal(currentVol);
        };

        this.makeInteractive(leftBtn, 
            () => leftBtn.setColor('#ffffff').setScale(1.2), 
            () => leftBtn.setColor('#00ffff').setScale(1), 
            () => { if (currentVol > 0) currentVol -= 10; updateDisplay(); }
        );

        this.makeInteractive(rightBtn, 
            () => rightBtn.setColor('#ffffff').setScale(1.2), 
            () => rightBtn.setColor('#00ffff').setScale(1), 
            () => { if (currentVol < 100) currentVol += 10; updateDisplay(); }
        );

        this.mainContainer.add([lblText, valText, leftBtn, rightBtn]);
    }

    private createMuteToggle(y: number) {
        const lblText = this.add.text(-250, y, 'Mute A.B.I.', { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0, 0.5);

        const isMuted = this.settings.voiceVol === 0;
        const boxColor = isMuted ? 0xff5555 : 0x333333;
        
        const box = this.add.rectangle(150, y, 40, 40, boxColor).setStrokeStyle(2, 0xffffff);
        const checkMark = this.add.text(150, y, isMuted ? 'X' : '', { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        this.makeInteractive(box,
            () => {
                box.setStrokeStyle(4, 0x00ffff).setScale(1.1);
                checkMark.setScale(1.1);
            },
            () => {
                box.setStrokeStyle(2, 0xffffff).setScale(1);
                checkMark.setScale(1);
            },
            () => {
                const isCurrentlyMuted = this.settings.voiceVol === 0;
                if (isCurrentlyMuted) this.settings.voiceVol = this.settings.previousVoiceVol > 0 ? this.settings.previousVoiceVol : 100;
                else {
                    this.settings.previousVoiceVol = this.settings.voiceVol;
                    this.settings.voiceVol = 0;
                }
                this.saveSettings();
                this.scene.restart({ parentScene: this.parentSceneKey });
            }
        );

        this.mainContainer.add([lblText, box, checkMark]);
    }

    private createWarningPopup() {
        this.warningPopup = this.add.container(0, 0);
        this.warningPopup.setDepth(100);
        this.warningPopup.setVisible(false); 

        this.warningOverlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.8).setOrigin(0).setInteractive(); 
        
        this.warningBoxContainer = this.add.container(0, 0);

        const box = this.add.rectangle(0, 0, 500, 300, 0x220000).setStrokeStyle(4, 0xff0000);
        const title = this.add.text(0, -80, 'WARNING', { fontSize: '36px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
        const msg = this.add.text(0, -10, 'This will permanently delete all\nyour unlocked levels. Are you sure?', { fontSize: '20px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

        const yesBtn = this.add.text(-100, 80, 'YES, DELETE', { fontSize: '22px', color: '#000000', backgroundColor: '#ff5555', padding: { x: 15, y: 10 } }).setOrigin(0.5);
        this.makeInteractive(yesBtn,
            () => yesBtn.setStyle({ backgroundColor: '#ff0000', color: '#ffffff' }).setScale(1.1),
            () => yesBtn.setStyle({ backgroundColor: '#ff5555', color: '#000000' }).setScale(1),
            () => {
                localStorage.removeItem('maxUnlockedLevel');
                this.warningPopup.setVisible(false);
                msg.setText('Progress erased.');
                setTimeout(() => msg.setText('This will permanently delete all\nyour unlocked levels. Are you sure?'), 2000);
            }
        );

        const noBtn = this.add.text(100, 80, 'CANCEL', { fontSize: '22px', color: '#ffffff', backgroundColor: '#444444', padding: { x: 15, y: 10 } }).setOrigin(0.5);
        this.makeInteractive(noBtn,
            () => noBtn.setStyle({ backgroundColor: '#888888', color: '#ffffff' }).setScale(1.1),
            () => noBtn.setStyle({ backgroundColor: '#444444', color: '#ffffff' }).setScale(1),
            () => this.warningPopup.setVisible(false)
        );
        
        this.warningBoxContainer.add([box, title, msg, yesBtn, noBtn]);
        this.warningPopup.add([this.warningOverlay, this.warningBoxContainer]);
    }
}