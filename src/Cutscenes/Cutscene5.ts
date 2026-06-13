import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';
import ABI from '../classes/abi';
import defaultDialogues from '../../assets/default_dialogues.json';

export default class Cutscene5 extends Phaser.Scene {
    private abi!: ABI;

    private slides = [
        {
            imagePath: '/assets/Cutscenes/Cutscene5_1.png',
            text: ""
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene5_2.png',
            text: ""
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene5_3.png',
            text: ""
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene5_4.png',
            text: ""
        },
        {
            imagePath: '/assets/Cutscenes/Cutscene5_5.png',
            text: ""
        }
    ];

    private currentSlideIndex: number = 0;
    private bgHTML!: HTMLImageElement;

    private fadeOverlay!: Phaser.GameObjects.Rectangle;
    private overlay!: Phaser.GameObjects.Rectangle;

    private controlsTitle!: Phaser.GameObjects.Text;
    private controlsIcon!: Phaser.GameObjects.Image;
    private controlsText!: Phaser.GameObjects.Text;
    private controlsPrompt!: Phaser.GameObjects.Text;

    private isTransitioning: boolean = false;
    private isShowingControls: boolean = false;
    private previousPinchState: boolean = false;

    constructor() {
        super('Cutscene5');
    }

    preload() {
        this.load.image('icon_arrows', '/../assets/Cutscenes/Controls_Arrows_lateral.png');

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
                console.warn("Error reading saved dialogues. Using defaults.", e);
                allDialogues = defaultDialogues;
            }
        } else {
            allDialogues = defaultDialogues;
        }

        this.slides[0].text = allDialogues.cutscenes.cutscene_5.dialogue_1;
        this.slides[1].text = allDialogues.cutscenes.cutscene_5.dialogue_2;
        this.slides[2].text = allDialogues.cutscenes.cutscene_5.dialogue_3;
        this.slides[3].text = allDialogues.cutscenes.cutscene_5.dialogue_4;
        this.slides[4].text = allDialogues.cutscenes.cutscene_5.dialogue_5;

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

        this.textures.get('ABI_standard').setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

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

            if (this.controlsIcon) {
                this.controlsIcon.setPosition(
                    newW / 2 - 190 * uiScale,
                    newH / 2
                );

                this.controlsIcon.setDisplaySize(
                    130 * uiScale,
                    90 * uiScale
                );
            }

            if (this.controlsText) {
                this.controlsText.setPosition(
                    newW / 2 - 80 * uiScale,
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
        const inputMode =
            this.registry.get('inputMode') ||
            localStorage.getItem('inputMode');

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

        this.controlsIcon = this.add
            .image(
                width / 2 - 190 * uiScale,
                height / 2,
                'icon_arrows'
            )
            .setDepth(10);

        this.controlsIcon.setDisplaySize(
            130 * uiScale,
            90 * uiScale
        );

        const inputMode =
            this.registry.get('inputMode') ||
            localStorage.getItem('inputMode');

        const commands =
            inputMode === 'hand'
                ? 'Move YOUR HAND left and right\nPINCH to drop the component'
                : 'Press LEFT/RIGHT ARROW or A/D to move\nPress SPACE or DOWN ARROW to drop';

        this.controlsText = this.add
            .text(
                width / 2 - 80 * uiScale,
                height / 2,
                commands + '\n\nMerge identical components\nKeep the container below the danger line',
                {
                    fontSize: '28px',
                    color: '#ffffff',
                    align: 'left'
                }
            )
            .setOrigin(0, 0.5)
            .setScale(uiScale)
            .setDepth(10);

        this.controlsPrompt = this.add
            .text(
                width / 2,
                height - 150 * uiScale,
                'Press SPACE or PINCH to start the assembly challenge',
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
                this.scene.start('Level5');
            }
        });
    }
}