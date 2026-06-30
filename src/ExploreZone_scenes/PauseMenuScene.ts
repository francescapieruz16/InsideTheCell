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

    private customMouseX: number = -1;
    private customMouseY: number = -1;
    private isCustomMouseDown: boolean = false;
    private previousMouseClickState: boolean = false;

    private onMouseMove!: (e: MouseEvent) => void;
    private onMouseDown!: () => void;
    private onMouseUp!: () => void;

    constructor() {
        super('PauseMenuScene');
    }

    init(data: { parentScene: string }) {
        this.parentSceneKey = data.parentScene;
        this.buttons = [];
    }

    create() {
        const { width, height } = this.scale.gameSize;

        this.bgRect = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);

        this.titleText = this.add.text(width / 2, height / 2 - 200, 'GAME PAUSED', {
            fontSize: '46px',
            color: '#4caf50',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#4caf50', blur: 15, fill: true }
        }).setOrigin(0.5);

        this.onMouseMove = (e: MouseEvent) => {
            const canvas = this.game.canvas;
            const rect = canvas.getBoundingClientRect();
            
            const xRel = e.clientX - rect.left;
            const yRel = e.clientY - rect.top;
            
            const scaleX = this.scale.gameSize.width / rect.width;
            const scaleY = this.scale.gameSize.height / rect.height;
            
            this.customMouseX = (xRel * scaleX) + this.cameras.main.scrollX;
            this.customMouseY = (yRel * scaleY) + this.cameras.main.scrollY;
        };

        this.onMouseDown = () => { this.isCustomMouseDown = true; };
        this.onMouseUp = () => { this.isCustomMouseDown = false; };

        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);

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

            let currentBaseScale = 1;

            const simulateOver = () => {
                bg.setFillStyle(hoverFill, 0.9);
                bg.setStrokeStyle(3, hoverStroke);
                txt.setColor('#ffffff');
                this.game.canvas.style.cursor = 'pointer';
                this.tweens.killTweensOf(btnContainer); 
                this.tweens.add({ targets: btnContainer, scaleX: currentBaseScale * 1.15, scaleY: currentBaseScale * 1.15, duration: 150, ease: 'Power2' });
            };

            const simulateOut = () => {
                bg.setFillStyle(baseFill, 0.7);
                bg.setStrokeStyle(2, baseStroke);
                txt.setColor(isSpecial ? '#00ffff' : '#ffffff');
                this.game.canvas.style.cursor = 'default';
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
                isMouseHovered: false,
                isHandHovered: false,
                simulateOver,
                simulateOut,
                simulateDown,
                setCurrentScale: (scale: number) => {
                    currentBaseScale = scale;
                    const isHovered = btnObj.isMouseHovered || btnObj.isHandHovered;
                    btnContainer.setScale(isHovered ? scale * 1.15 : scale);
                }
            };

            this.buttons.push(btnObj);
        };

        createAdvancedButton(-80, 'Resume', () => { this.resumeGame(); });
        createAdvancedButton(0, 'Settings', () => { this.scene.start('SettingsScene', { parentScene: this.parentSceneKey }); });
        createAdvancedButton(80, 'Return to Main Menu', () => {
            this.sound.stopAll();
            this.game.canvas.style.cursor = 'default';
            this.scene.stop(this.parentSceneKey);
            this.scene.stop('ControlsScene');
            this.scene.sleep('ABIScene');
            this.scene.stop();
            this.scene.start('MenuPageScene');
        });

        const tutorialScenes = ['ExternalScene', 'Scene2_Membrane', 'Scene3_Internal'];
        if (tutorialScenes.includes(this.parentSceneKey)) {
            createAdvancedButton(200, '► TUTORIAL LEVELS ◄', () => {
                this.game.canvas.style.cursor = 'default';
                this.scene.start('LevelSelectScene', { parentScene: this.parentSceneKey });
            }, true);
        }

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
            this.game.canvas.style.cursor = 'default';
            this.scale.off('resize', onResize);
            this.tweens.killAll();
            window.removeEventListener('mousemove', this.onMouseMove);
            window.removeEventListener('mousedown', this.onMouseDown);
            window.removeEventListener('mouseup', this.onMouseUp);
        });
    }

    update(time: number, delta: number) {
        const inputMode = this.registry.get('inputMode');
        
        let hoveredButton: MenuButton | null = null;
        let isAnyMouseHovering = false;

        const tracker = HandTrackingController.getInstance();
        const handX = tracker.targetX * this.scale.gameSize.width;
        const handY = tracker.targetY * this.scale.gameSize.height;
        const currentPinch = tracker.isClicked;
        const isHandActive = inputMode === 'hand' && tracker.targetX !== -1;

        this.buttons.forEach(btn => {
            const bounds = btn.container.getBounds();
            
            let isHandHovering = false;
            if (isHandActive) {
                isHandHovering = bounds.contains(handX, handY);
            }

            const isMouseHovering = bounds.contains(this.customMouseX, this.customMouseY);

            // --- HOVER MANO ---
            if (isHandHovering && !btn.isHandHovered) {
                btn.isHandHovered = true;
                if (!btn.isMouseHovered) btn.simulateOver();
            } else if (!isHandHovering && btn.isHandHovered) {
                btn.isHandHovered = false;
                if (!btn.isMouseHovered) btn.simulateOut();
            }

            // --- HOVER MOUSE CUSTOM ---
            if (isMouseHovering && !btn.isMouseHovered) {
                btn.isMouseHovered = true;
                if (!btn.isHandHovered) btn.simulateOver();
            } else if (!isMouseHovering && btn.isMouseHovered) {
                btn.isMouseHovered = false;
                if (!btn.isHandHovered) btn.simulateOut();
            }

            if (isHandHovering || isMouseHovering) {
                hoveredButton = btn;
            }
            
            if (isMouseHovering) isAnyMouseHovering = true;
        });

        if (!isAnyMouseHovering) {
            this.game.canvas.style.cursor = 'default';
        }

        if (isHandActive && currentPinch && !this.previousPinchState) {
            if (hoveredButton) (hoveredButton as MenuButton).simulateDown();
        }
        this.previousPinchState = currentPinch;

        if (this.isCustomMouseDown && !this.previousMouseClickState) {
            if (hoveredButton) (hoveredButton as MenuButton).simulateDown();
        }
        this.previousMouseClickState = this.isCustomMouseDown;
    }

    private resumeGame() {
        this.game.canvas.style.cursor = 'default';
        this.scene.resume(this.parentSceneKey);
        this.scene.stop();
    }
}