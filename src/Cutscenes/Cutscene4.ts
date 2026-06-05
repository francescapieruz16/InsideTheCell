import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';

export default class Cutscene4 extends Phaser.Scene {
    private slides = [
        {
            imagePath: '/assets/Cutscenes/Cutscene4_1.png',
            text: "A new challenge begins inside the cell. The viral replication process is unstable, and hidden biological signals must be identified."
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene4_4.png',
            text: "Some cards represent genetic bases: Adenine, Cytosine, Guanine, and Uracil. These are part of the information carried by genetic material."
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene4_2.png',
            text: "Other cards show key replication elements, such as Polymerase and Viral RNA. These help the virus copy and spread its genetic instructions."
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene4_3.png',
            text: "Be careful: Genome Mutation and Replication Error are dangerous signals. Match the cards and reveal the hidden patterns before your moves run out."
        }
    ];

    private currentSlideIndex: number = 0;
    private bgHTML!: HTMLImageElement;

    private storyText!: Phaser.GameObjects.Text;
    private uiContainer!: Phaser.GameObjects.Container;
    private textBoxBg!: Phaser.GameObjects.Rectangle;
    private promptText!: Phaser.GameObjects.Text;

    private fadeOverlay!: Phaser.GameObjects.Rectangle;
    private overlay!: Phaser.GameObjects.Rectangle;

    private controlsTitle!: Phaser.GameObjects.Text;
    private controlsText!: Phaser.GameObjects.Text;
    private controlsPrompt!: Phaser.GameObjects.Text;

    private isTransitioning: boolean = false;
    private isShowingControls: boolean = false;
    private previousPinchState: boolean = false;

    private readonly boxHeight = 250;

    constructor() {
        super('Cutscene4');
    }

    preload() {
        // Non servono icone in questa cutscene:
        // il memory si controlla con mouse/touchpad o pinch.
    }

    create() {
        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
            }

            button {
                pointer-events: auto !important;
                padding: 12px 24px;
                font-size: 1.2rem;
                font-weight: bold;
                cursor: pointer;
                border: 2px solid #333;
                border-radius: 8px;
                background-color: rgba(255, 255, 255, 0.8);
                transition: background-color 0.2s, transform 0.1s;
            }

            button:hover {
                background-color: rgba(255, 255, 255, 1);
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);

        const backBtn = document.createElement('button');
        backBtn.className = 'Back';
        backBtn.innerText = 'PAUSE';

        const wrapper = document.createElement('div');
        wrapper.className = 'phaser-dom-container';
        wrapper.appendChild(backBtn);

        const backBtnDom = this.add.dom(this.scale.gameSize.width - 80, 40, wrapper);

        backBtn.addEventListener('click', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        const { width, height } = this.scale.gameSize;

        this.bgHTML = document.getElementById('background') as HTMLImageElement;
        if (this.bgHTML) {
            this.bgHTML.src = this.slides[0].imagePath;
            this.bgHTML.style.objectFit = 'fill';
        }

        this.fadeOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0);
        this.fadeOverlay.setDepth(0);

        this.uiContainer = this.add.container(0, height - this.boxHeight);
        this.uiContainer.setDepth(10);

        this.textBoxBg = this.add
            .rectangle(0, 0, width, this.boxHeight, 0x000000, 0.85)
            .setOrigin(0)
            .setStrokeStyle(4, 0x00ffff);

        this.storyText = this.add.text(width / 2, this.boxHeight / 2 - 20, '', {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 200 }
        }).setOrigin(0.5);

        this.promptText = this.add.text(width - 50, this.boxHeight - 40, 'Press SPACE or PINCH to continue ►', {
            fontSize: '20px',
            color: '#aaaaaa'
        }).setOrigin(1, 0.5);

        this.tweens.add({
            targets: this.promptText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.uiContainer.add([this.textBoxBg, this.storyText, this.promptText]);

        this.input.on('pointerdown', this.advanceSlide, this);
        this.input.keyboard!.on('keydown-SPACE', this.advanceSlide, this);

        this.showCurrentSlide();

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;

            const newW = gameSize.width;
            const newH = gameSize.height;

            this.cameras.main.setSize(newW, newH);

            const scaleFactor = newW / 1920;
            const uiScale = Phaser.Math.Clamp(scaleFactor, 0.75, 1.3);

            const currentBoxHeight = Math.max(140, 250 * uiScale);

            backBtnDom.setPosition(newW - 80, 40);

            if (this.fadeOverlay) {
                this.fadeOverlay.setSize(newW, newH);
            }

            if (this.uiContainer) {
                this.uiContainer.setPosition(0, newH - currentBoxHeight);
            }

            if (this.textBoxBg) {
                this.textBoxBg.setSize(newW, currentBoxHeight);
            }

            if (this.storyText) {
                this.storyText.setPosition(newW / 2, currentBoxHeight / 2 - 20);
                this.storyText.setWordWrapWidth((newW - 200) / uiScale);
                this.storyText.setScale(uiScale);
            }

            if (this.promptText) {
                this.promptText.setPosition(newW - 50, currentBoxHeight - 40);
                this.promptText.setScale(uiScale);
            }

            if (this.overlay) {
                this.overlay.setSize(newW, newH);
            }

            if (this.controlsTitle) {
                this.controlsTitle.setPosition(newW / 2, newH / 2 - (150 * uiScale));
                this.controlsTitle.setScale(uiScale);
            }

            if (this.controlsText) {
                this.controlsText.setPosition(newW / 2, newH / 2);
                this.controlsText.setScale(uiScale);
            }

            if (this.controlsPrompt) {
                this.controlsPrompt.setPosition(newW / 2, newH - (150 * uiScale));
                this.controlsPrompt.setScale(uiScale);
            }
        };

        this.scale.on('resize', onResize);
        onResize(this.scale.gameSize);

        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
            this.tweens.killAll();
        });
    }

    update() {
        const inputMode = this.registry.get('inputMode') || localStorage.getItem('inputMode');

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();
            const currentPinch = tracker.isClicked;

            if (currentPinch && !this.previousPinchState) {
                this.advanceSlide();
            }

            this.previousPinchState = currentPinch;
        }
    }

    private showCurrentSlide() {
        if (this.currentSlideIndex >= this.slides.length) {
            this.showControlsScreen();
            return;
        }

        const currentSlide = this.slides[this.currentSlideIndex];
        this.storyText.setText(currentSlide.text);

        this.isTransitioning = true;

        this.tweens.add({
            targets: this.fadeOverlay,
            alpha: 1,
            duration: 300,
            onComplete: () => {
                if (this.bgHTML) {
                    this.bgHTML.src = currentSlide.imagePath;
                }

                this.tweens.add({
                    targets: this.fadeOverlay,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        this.isTransitioning = false;
                    }
                });
            }
        });
    }

    private advanceSlide() {
        if (this.isTransitioning) return;

        if (this.isShowingControls) {
            this.finishCutscene();
            return;
        }

        this.currentSlideIndex++;
        this.showCurrentSlide();
    }

    private showControlsScreen() {
        this.isTransitioning = true;
        this.isShowingControls = true;

        this.uiContainer.setVisible(false);

        const { width, height } = this.scale.gameSize;

        this.overlay = this.add
            .rectangle(0, 0, width, height, 0x000000, 0)
            .setOrigin(0)
            .setDepth(5);

        this.tweens.add({
            targets: this.overlay,
            fillAlpha: 0.85,
            duration: 500,
            onComplete: () => {
                this.drawControlsUI(this.scale.gameSize.width, this.scale.gameSize.height);
                this.isTransitioning = false;
            }
        });
    }

    private drawControlsUI(width: number, height: number) {
        const scaleFactor = width / 1920;
        const uiScale = Phaser.Math.Clamp(scaleFactor, 0.75, 1.3);

        this.controlsTitle = this.add.text(width / 2, height / 2 - (150 * uiScale), 'MISSION CONTROLS', {
            fontSize: '48px',
            color: '#00ffff',
            fontStyle: 'bold',
            letterSpacing: 2
        }).setOrigin(0.5).setScale(uiScale).setDepth(10);

        const inputMode = this.registry.get('inputMode') || localStorage.getItem('inputMode');

        const commands = inputMode === 'hand'
            ? 'Move YOUR HAND over a card\nPINCH to flip it'
            : 'Use the MOUSE or TOUCHPAD to select cards\nCLICK to flip a card';

        this.controlsText = this.add.text(width / 2, height / 2, commands + '\n\nFlip two cards at a time\nFind all matching pairs before your moves run out', {
            fontSize: '28px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setScale(uiScale).setDepth(10);

        this.controlsPrompt = this.add.text(width / 2, height - (150 * uiScale), 'Press SPACE or PINCH to start the memory challenge', {
            fontSize: '26px',
            color: '#4caf50',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScale(uiScale).setDepth(10);

        this.tweens.add({
            targets: this.controlsPrompt,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    private finishCutscene() {
        this.isTransitioning = true;

        this.tweens.add({
            targets: this.fadeOverlay,
            alpha: 1,
            duration: 1000,
            onComplete: () => {
                this.scene.start('Level4');
            }
        });
    }
}