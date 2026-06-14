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

export interface JournalItem {
    id: string;        
    name: string;      
    texture: string;   
}

export default class JournalScene extends Phaser.Scene {
    private parentSceneKey!: string;
    private itemsList: JournalItem[] = [];
    private unlockedItems: string[] = [];

    private bgOverlay!: Phaser.GameObjects.Rectangle;
    private uiContainer!: Phaser.GameObjects.Container;
    private wipeBtn!: Phaser.GameObjects.Text;
    private closeBtn!: Phaser.GameObjects.Text;

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
        super('JournalScene');
    }

    init(data: { parentScene: string, items: JournalItem[] }) {
        this.parentSceneKey = data.parentScene;
        this.itemsList = data.items || [];
        this.interactables = [];
    }

    create() {
        const { width, height } = this.scale.gameSize;

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

        this.bgOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);

        const savedData = localStorage.getItem('journalUnlocks');
        this.unlockedItems = savedData ? JSON.parse(savedData) : [];

        let discoveredCount = 0;
        this.itemsList.forEach(item => {
            if (this.unlockedItems.includes(item.id)) discoveredCount++;
        });

        this.uiContainer = this.add.container(width / 2, 0);

        const titleText = this.add.text(0, 80, 'BioLog', {
            fontSize: '48px', color: '#00ffff', fontStyle: 'bold', letterSpacing: 2
        }).setOrigin(0.5);

        const subtitleText = this.add.text(0, 140, `Discovered: ${discoveredCount} / ${this.itemsList.length}`, {
            fontSize: '28px', color: discoveredCount === this.itemsList.length ? '#4caf50' : '#ffffff'
        }).setOrigin(0.5);

        this.uiContainer.add([titleText, subtitleText]);

        const startX = -400;  
        const startY = 280;   
        const spacingX = 400;
        const spacingY = 180; 
        const cols = 3;

        this.itemsList.forEach((item, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = startX + (col * spacingX);
            const y = startY + (row * spacingY);

            this.createEntryCard(this.uiContainer, x, y, item);
        });

        this.closeBtn = this.add.text(40, 40, '✖ CLOSE', {
            fontSize: '24px', 
            color: '#aaaaaa', 
            backgroundColor: '#222222', 
            padding: { x: 15, y: 10 }
        }).setOrigin(0, 0); 

        this.makeInteractive(this.closeBtn,
            () => this.closeBtn.setStyle({ color: '#ffffff', backgroundColor: '#444444' }),
            () => this.closeBtn.setStyle({ color: '#aaaaaa', backgroundColor: '#222222' }),
            () => this.closeJournal()
        );

        let confirmWipe = false;
        this.wipeBtn = this.add.text(width / 2, height - 80, '[ ERASE DATA ]', {
            fontSize: '24px', color: '#ffaa00', backgroundColor: '#331100', padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.makeInteractive(this.wipeBtn,
            () => {
                if (!confirmWipe) this.wipeBtn.setStyle({ backgroundColor: '#552200' });
                else this.wipeBtn.setStyle({ backgroundColor: '#ff3333' });
            },
            () => {
                if (!confirmWipe) this.wipeBtn.setStyle({ backgroundColor: '#331100' });
                else this.wipeBtn.setStyle({ backgroundColor: '#ff0000' });
            },
            () => {
                if (!confirmWipe) {
                    confirmWipe = true;
                    this.wipeBtn.setText('[ ARE YOU SURE? ]');
                    this.wipeBtn.setStyle({ color: '#ffffff', backgroundColor: '#ff0000' });
                    
                    this.time.delayedCall(3000, () => {
                        if (this.scene.isActive()) {
                            confirmWipe = false;
                            this.wipeBtn.setText('[ ERASE DATA ]');
                            this.wipeBtn.setStyle({ color: '#ffaa00', backgroundColor: '#331100' });
                        }
                    });
                } else {
                    localStorage.removeItem('journalUnlocks');
                    this.scene.restart({ parentScene: this.parentSceneKey, items: this.itemsList });
                }
            }
        );

        this.input.keyboard!.on('keydown-I', () => this.closeJournal());
        this.input.keyboard!.on('keydown-ESC', () => this.closeJournal());

        this.scene.bringToTop();

        const handleResize = (gameSize: Phaser.Structs.Size) => {
            const newW = gameSize.width;
            const newH = gameSize.height;

            this.bgOverlay.setSize(newW, newH);
            this.uiContainer.setX(newW / 2);
            this.wipeBtn.setPosition(newW / 2, newH - 80);
        };

        this.scale.on('resize', handleResize);
        this.events.on('shutdown', () => {
            this.game.canvas.style.cursor = 'default';
            this.scale.off('resize', handleResize);
            window.removeEventListener('mousemove', this.onMouseMove);
            window.removeEventListener('mousedown', this.onMouseDown);
            window.removeEventListener('mouseup', this.onMouseUp);
        });

        handleResize(this.scale.gameSize);
    }

    private createEntryCard(container: Phaser.GameObjects.Container, x: number, y: number, item: JournalItem) {
        const isUnlocked = this.unlockedItems.includes(item.id);

        const cardBg = this.add.rectangle(x, y, 350, 140, 0x111111, 0.8)
            .setStrokeStyle(2, isUnlocked ? 0x4caf50 : 0x333333);

        const icon = this.add.sprite(x - 90, y, item.texture);
        icon.setDisplaySize(100, 100);

        let nameText = "???";
        let titleColor = '#555555';

       if (isUnlocked) {
            nameText = item.name;
            titleColor = '#ffffff';
            icon.clearTint(); 
            icon.setAlpha(1);
        } else {
            icon.setTintFill(0x555555); 
            icon.setAlpha(0.9); 
        }

        const nameLabel = this.add.text(x - 20, y, nameText, {
            fontSize: '28px', color: titleColor, fontStyle: 'bold',
            wordWrap: { width: 200 }
        }).setOrigin(0, 0.5); 

        container.add([cardBg, icon, nameLabel]);
    }

    private closeJournal() {
        this.scene.resume(this.parentSceneKey);
        this.scene.stop();
    }

    public static unlockItem(scene: Phaser.Scene, itemId: string, discoverables: JournalItem[]) {
        const savedData = localStorage.getItem('journalUnlocks');
        let unlockedItems: string[] = savedData ? JSON.parse(savedData) : [];

        if (!unlockedItems.includes(itemId)) {
            unlockedItems.push(itemId);
            localStorage.setItem('journalUnlocks', JSON.stringify(unlockedItems));
            
            const itemDef = discoverables.find(i => i.id === itemId);
            if (itemDef) {
                JournalScene.showUnlockNotification(scene, itemDef);
            }
        }
    }

    private static showUnlockNotification(scene: Phaser.Scene, item: JournalItem) {
        const { width, height } = scene.scale;

        const notifContainer = scene.add.container(width - 200, height + 100);
        notifContainer.setDepth(2000); 
        notifContainer.setScrollFactor(0); 

        const bgWidth = 320;
        const bgHeight = 80;
        const bg = scene.add.rectangle(0, 0, bgWidth, bgHeight, 0x112233, 0.95)
            .setStrokeStyle(2, 0x4caf50);

        const icon = scene.add.sprite(-110, 0, item.texture);
        icon.setDisplaySize(50, 50); 

        const titleText = scene.add.text(-70, -20, 'NEW DATA LOG', { 
            fontSize: '16px', color: '#4caf50', fontStyle: 'bold' 
        });

        const nameText = scene.add.text(-70, 0, item.name, { 
            fontSize: '20px', color: '#ffffff' 
        });

        notifContainer.add([bg, icon, titleText, nameText]);

        scene.tweens.add({
            targets: notifContainer,
            y: height - 80, 
            duration: 600,
            ease: 'Back.easeOut', 
            onComplete: () => {
                scene.time.delayedCall(3500, () => {
                    scene.tweens.add({
                        targets: notifContainer,
                        y: height + 100,
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            notifContainer.destroy(); 
                        }
                    });
                });
            }
        });
    }

    update(time: number, delta: number) {
        let hoveredElement: InteractiveElement | null = null;
        let isAnyMouseHovering = false;

        const inputMode = this.registry.get('inputMode') || localStorage.getItem('inputMode');
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