import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';
import ABI from '../classes/abi';
import defaultDialogues from '../../assets/default_dialogues.json';

export default class Cutscene2 extends Phaser.Scene {
    private slides = [
        {
            imagePath: '/assets/Cutscenes/Cutscene2_1.png',
            text: ''
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene2_4.png',
            text: ''
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene2_3.png',
            text: ''
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene2_2.png',
            text: ''
        }
    ];

    private currentSlideIndex: number = 0;
    private bgHTML!: HTMLImageElement;

    private abi!: ABI;

    private fadeOverlay!: Phaser.GameObjects.Rectangle;
    private overlay!: Phaser.GameObjects.Rectangle;

    private controlsTitle!: Phaser.GameObjects.Text;
    private controlsText!: Phaser.GameObjects.Text;
    private controlsPrompt!: Phaser.GameObjects.Text;

    private isTransitioning: boolean = false;
    private isShowingControls: boolean = false;
    private previousPinchState: boolean = false;

    constructor() {
        super('Cutscene2');
    }

    preload() {
        this.load.image(
            'ABI_standard',
            '/assets/tutorial/ABI/ABI_standard.png'
        );
    }

    create() {
        this.currentSlideIndex = 0;
        this.isTransitioning = false;
        this.isShowingControls = false;
        this.previousPinchState = false;

        const savedDialogues = localStorage.getItem('DIALOGUES_JSON');
        let allDialogues: any = null;

        if (savedDialogues) {
            try {
                allDialogues = JSON.parse(savedDialogues);
            } catch (e) {
                console.warn('Error reading saved dialogues. Using defaults.', e);
                allDialogues = defaultDialogues;
            }
        } else {
            allDialogues = defaultDialogues;
        }

        this.slides[0].text = allDialogues.cutscenes.cutscene_2.dialogue_1;
        this.slides[1].text = allDialogues.cutscenes.cutscene_2.dialogue_2;
        this.slides[2].text = allDialogues.cutscenes.cutscene_2.dialogue_3;
        this.slides[3].text = allDialogues.cutscenes.cutscene_2.dialogue_4;

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

        const backBtnDom = this.add.dom(
            this.scale.gameSize.width - 80,
            40,
            wrapper
        );

        backBtn.addEventListener('click', () => {
            backBtnDom.setVisible(false);

            this.scene.pause();
            this.scene.launch('PauseMenuScene', {
                parentScene: this.scene.key
            });
        });

        const { width, height } = this.scale.gameSize;

        this.bgHTML = document.getElementById('background') as HTMLImageElement;

        if (this.bgHTML) {
            this.bgHTML.src = this.slides[0].imagePath;
            this.bgHTML.style.objectFit = 'fill';
        }

        this.fadeOverlay = this.add
            .rectangle(0, 0, width, height, 0x000000, 1)
            .setOrigin(0);

        this.fadeOverlay.setDepth(0);

        this.abi = new ABI(this);
        this.abi.MoveDialogueY(0);

        this.input.on('pointerdown', this.handleContinueInput, this);

        this.input.keyboard!.on(
            'keydown-SPACE',
            this.handleContinueInput,
            this
        );

        this.showCurrentSlide();

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;

            const newW = gameSize.width;
            const newH = gameSize.height;

            this.cameras.main.setSize(newW, newH);

            const scaleFactor = newW / 1920;
            const uiScale = Phaser.Math.Clamp(scaleFactor, 0.75, 1.3);

            backBtnDom.setPosition(newW - 80, 40);

            if (this.fadeOverlay) {
                this.fadeOverlay.setSize(newW, newH);
            }

            if (this.overlay) {
                this.overlay.setSize(newW, newH);
            }

            if (this.controlsTitle) {
                this.controlsTitle.setPosition(
                    newW / 2,
                    newH / 2 - 150 * uiScale
                );

                this.controlsTitle.setScale(uiScale);
            }

            if (this.controlsText) {
                this.controlsText.setPosition(
                    newW / 2,
                    newH / 2
                );

                this.controlsText.setScale(uiScale);
            }

            if (this.controlsPrompt) {
                this.controlsPrompt.setPosition(
                    newW / 2,
                    newH - 150 * uiScale
                );

                this.controlsPrompt.setScale(uiScale);
            }
        };

        this.scale.on('resize', onResize);
        onResize(this.scale.gameSize);

        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
            this.tweens.killAll();
        });

        if(this.input.keyboard){
            this.input.keyboard.on('keydown-ESC', () => {
                backBtnDom.setVisible(false);

                this.scene.pause();
                this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
            });
        }

        this.events.on('pause', () => {
            backBtnDom.setVisible(false);
        });

        this.events.on('resume', () => {
            backBtnDom.setVisible(true);
        });
    }

    update() {
        const inputMode = this.registry.get('inputMode')

        if (inputMode !== 'hand') return;

        const tracker = HandTrackingController.getInstance();
        const currentPinch = tracker.isClicked;

        if (currentPinch && !this.previousPinchState) {
            if (this.isShowingControls) {
                this.finishCutscene();
            }
        }

        this.previousPinchState = currentPinch;
    }

    private showCurrentSlide() {
        if (this.currentSlideIndex >= this.slides.length) {
            this.showControlsScreen();
            return;
        }

        const currentSlide = this.slides[this.currentSlideIndex];

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

                        this.abi.showDialogue(
                            'ABI',
                            currentSlide.text,
                            () => {
                                this.currentSlideIndex++;
                                this.showCurrentSlide();
                            }
                        );
                    }
                });
            }
        });
    }

    private handleContinueInput() {
        if (this.isTransitioning) return;

        if (this.isShowingControls) {
            this.finishCutscene();
            return;
        }

        if (this.abi && this.abi.isTalking) {
            this.abi.nextDialoguePage();
        }
    }

    private showControlsScreen() {
        this.isTransitioning = true;
        this.isShowingControls = true;
        this.abi.hideDialogue();

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
                this.drawControlsUI(
                    this.scale.gameSize.width,
                    this.scale.gameSize.height
                );

                this.isTransitioning = false;
            }
        });
    }

    private drawControlsUI(width: number, height: number) {
        const scaleFactor = width / 1920;
        const uiScale = Phaser.Math.Clamp(scaleFactor, 0.75, 1.3);

        this.controlsTitle = this.add
            .text(
                width / 2,
                height / 2 - 150 * uiScale,
                'MISSION CONTROLS',
                {
                    fontSize: '48px',
                    color: '#00ffff',
                    fontStyle: 'bold',
                    letterSpacing: 2
                }
            )
            .setOrigin(0.5)
            .setScale(uiScale)
            .setDepth(10);

        const inputMode = this.registry.get('inputMode')

        const commands =
            inputMode === 'hand'
                ? 'Move YOUR HAND to aim\nPINCH to shoot the viruses'
                : 'Use the MOUSE or TOUCHPAD to aim\nCLICK to shoot the viruses';

        this.controlsText = this.add
            .text(
                width / 2,
                height / 2,
                commands,
                {
                    fontSize: '28px',
                    color: '#ffffff',
                    align: 'center'
                }
            )
            .setOrigin(0.5)
            .setScale(uiScale)
            .setDepth(10);

        this.controlsPrompt = this.add
            .text(
                width / 2,
                height - 150 * uiScale,
                'Press SPACE or PINCH to initialize sequence',
                {
                    fontSize: '26px',
                    color: '#4caf50',
                    fontStyle: 'bold'
                }
            )
            .setOrigin(0.5)
            .setScale(uiScale)
            .setDepth(10);

        this.tweens.add({
            targets: this.controlsPrompt,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    private finishCutscene() {
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        this.tweens.add({
            targets: this.fadeOverlay,
            alpha: 1,
            duration: 1000,
            onComplete: () => {
                this.scene.start('Level2');
            }
        });
    }
}