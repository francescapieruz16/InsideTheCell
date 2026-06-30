import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';

interface InteractiveElement {
    obj: Phaser.GameObjects.GameObject & { getBounds: () => Phaser.Geom.Rectangle };
    isMouseHovered: boolean;
    isHandHovered: boolean;
    simulateOver: () => void;
    simulateOut: () => void;
    simulateDown: () => void;
}

export default class LevelSelectScene extends Phaser.Scene {
    private parentSceneKey: string | null = null;

    private interactables: InteractiveElement[] = [];
    private previousPinchState: boolean = false;
    private customMouseX: number = -1;
    private customMouseY: number = -1;
    private isCustomMouseDown: boolean = false;
    private previousMouseClickState: boolean = false;

    private onMouseMove!: (e: MouseEvent) => void;
    private onMouseDown!: () => void;
    private onMouseUp!: () => void;

    constructor() {
        super('LevelSelectScene');
    }

    init(data: any) {
        if (data && data.parentScene) {
            this.parentSceneKey = data.parentScene;
        } else {
            this.parentSceneKey = null;
        }
        this.interactables = [];
    }

    create() {
        this.scene.bringToTop();

        const { width, height } = this.scale;

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

        this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0);

        this.add.text(width / 2, 120, 'LEVEL SELECTION', {
            fontSize: '46px',
            color: '#00ffff', 
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 15, fill: true }
        }).setOrigin(0.5);

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

            const btnContainer = this.add.container(width / 2, startY);

            const bgWidth = 500;
            const bgHeight = 70;

            const baseFill = isUnlocked ? 0x112233 : 0x1a1a1a;
            const baseStroke = isUnlocked ? 0x4caf50 : 0x333333; 
            const hoverFill = 0x2e5c31;
            const hoverStroke = 0x81c784;
            const textAlpha = isUnlocked ? 1 : 0.4; 

            const bg = this.add.rectangle(0, 0, bgWidth, bgHeight, baseFill, isUnlocked ? 0.8 : 0.6)
                .setStrokeStyle(2, baseStroke);

            const btnText = this.add.text(0, 0, level.name, {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: isUnlocked ? 'bold' : 'normal',
                letterSpacing: 1
            }).setOrigin(0.5).setAlpha(textAlpha);

            btnContainer.add([bg, btnText]);

            if (isUnlocked) {
                this.makeInteractive(bg, 
                    () => { 
                        bg.setFillStyle(hoverFill, 0.9);
                        bg.setStrokeStyle(3, hoverStroke);
                        this.tweens.killTweensOf(btnContainer);
                        this.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Power2' });
                    },
                    () => { 
                        bg.setFillStyle(baseFill, 0.8);
                        bg.setStrokeStyle(2, baseStroke);
                        this.tweens.killTweensOf(btnContainer);
                        this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Power2' });
                    },
                    () => { 
                        this.tweens.killTweensOf(btnContainer);
                        this.tweens.add({
                            targets: btnContainer, 
                            scaleX: 0.95, 
                            scaleY: 0.95, 
                            duration: 50, 
                            yoyo: true,
                            onComplete: () => {
                                const warmupUtterance = new SpeechSynthesisUtterance(' ');
                                warmupUtterance.volume = 0; 
                                warmupUtterance.rate = 1.0; 
                                warmupUtterance.pitch = 1.0; 
                                window.speechSynthesis.speak(warmupUtterance);
                                if (this.parentSceneKey) {
                                    this.scene.stop(this.parentSceneKey);
                                }
                                this.scene.start(level.sceneKey, { incomingTexture: 'nav_front' });
                            }
                        });
                    }
                );
            } else {
                const lockIcon = this.add.text(bgWidth / 2 - 40, 0, "🔒", { fontSize: '24px' })
                    .setOrigin(0.5)
                    .setAlpha(0.5);
                btnContainer.add(lockIcon);
            }

            startY += 100; 
        });

        const backText = this.parentSceneKey ? '< Resume Game' : '< MAIN MENU';
        
        const backBtn = this.add.text(60, 60, backText, {
            fontSize: '22px',
            color: '#ffeb3b',
            fontStyle: 'bold'
        });

        this.makeInteractive(backBtn,
            () => backBtn.setColor('#ffffff').setScale(1.05),
            () => backBtn.setColor('#ffeb3b').setScale(1),
            () => {
                if (this.parentSceneKey) {
                    this.scene.resume(this.parentSceneKey);
                    this.scene.stop();
                } else {
                    this.scene.start('MenuPageScene');
                }
            }
        );

        this.events.on('shutdown', () => {
            this.game.canvas.style.cursor = 'default';
            this.tweens.killAll();
            window.removeEventListener('mousemove', this.onMouseMove);
            window.removeEventListener('mousedown', this.onMouseDown);
            window.removeEventListener('mouseup', this.onMouseUp);
        });
    }

    update(time: number, delta: number) {
        let hoveredElement: InteractiveElement | null = null;
        let isAnyMouseHovering = false;

        const inputMode = this.registry.get('inputMode');
        const isHandActive = inputMode === 'hand';

        let handX = -1;
        let handY = -1;
        let currentPinch = false;

        if (isHandActive) {
            const tracker = HandTrackingController.getInstance();
            handX = tracker.targetX * this.scale.gameSize.width;
            handY = tracker.targetY * this.scale.gameSize.height;
            currentPinch = tracker.isClicked;
        }

        this.interactables.forEach(el => {
            const bounds = Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(el.obj.getBounds()), 15, 15);

            let isHandHovering = false;
            if (isHandActive && handX !== -1) {
                isHandHovering = Phaser.Geom.Rectangle.Contains(bounds, handX, handY);
            }

            const isMouseHovering = Phaser.Geom.Rectangle.Contains(bounds, this.customMouseX, this.customMouseY);

            if (isHandHovering && !el.isHandHovered) {
                el.isHandHovered = true;
                if (!el.isMouseHovered) el.simulateOver();
            } else if (!isHandHovering && el.isHandHovered) {
                el.isHandHovered = false;
                if (!el.isMouseHovered) el.simulateOut();
            }

            if (isMouseHovering && !el.isMouseHovered) {
                el.isMouseHovered = true;
                if (!el.isHandHovered) el.simulateOver();
            } else if (!isMouseHovering && el.isMouseHovered) {
                el.isMouseHovered = false;
                if (!el.isHandHovered) el.simulateOut();
            }

            if (isHandHovering || isMouseHovering) {
                hoveredElement = el;
            }
            if (isMouseHovering) isAnyMouseHovering = true;
        });

        if (!isAnyMouseHovering) {
            this.game.canvas.style.cursor = 'default';
        }

        if (isHandActive && currentPinch && !this.previousPinchState) {
            if (hoveredElement) (hoveredElement as InteractiveElement).simulateDown();
        }
        if (isHandActive) {
            this.previousPinchState = currentPinch;
        }

        if (this.isCustomMouseDown && !this.previousMouseClickState) {
            if (hoveredElement) (hoveredElement as InteractiveElement).simulateDown();
        }
        this.previousMouseClickState = this.isCustomMouseDown;
    }

    private makeInteractive(
        obj: Phaser.GameObjects.GameObject & { getBounds: () => Phaser.Geom.Rectangle },
        onOver: () => void,
        onOut: () => void,
        onDown: () => void
    ) {
        const interactable: InteractiveElement = {
            obj, 
            isMouseHovered: false, 
            isHandHovered: false, 
            simulateOver: () => {
                this.game.canvas.style.cursor = 'pointer';
                onOver();
            }, 
            simulateOut: () => {
                this.game.canvas.style.cursor = 'default';
                onOut();
            }, 
            simulateDown: onDown
        };
        this.interactables.push(interactable);
    }
}