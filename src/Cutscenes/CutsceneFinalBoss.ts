import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';
import ABI from '../classes/abi';
import defaultDialogues from '../../assets/default_dialogues.json';

export default class CutsceneFinalBoss extends Phaser.Scene {
    private bgHTML!: HTMLImageElement;
    private abi!: ABI;
    private fadeOverlay!: Phaser.GameObjects.Rectangle;

    private boss!: Phaser.GameObjects.Image;
    private bossFloatingTween?: Phaser.Tweens.Tween;

    private currentDialogueIndex: number = 0;
    private isTransitioning: boolean = false;
    private previousPinchState: boolean = false;

    private dialogues = [
        { speaker: 'ABI', text: 'Stop...' },
        { speaker: 'ABI', text: 'I know this signal.' },
        { speaker: 'ABI', text: 'The infection is coming from him.' },
        { speaker: 'VIRUS', text: 'Welcome, little human.' },
        { speaker: 'VIRUS', text: 'You have cleaned my cells... answered my questions... and defeated my servants.' },
        { speaker: 'VIRUS', text: 'But I am the source.' },
        { speaker: 'ABI', text: "Don't be afraid. Every answer brought you closer to the cure." },
        { speaker: 'VIRUS', text: 'Cure? I am not something you cure. I am something you survive.' },
        { speaker: 'ABI', text: 'This is it. The final battle begins now.' },
        { speaker: 'VIRUS', text: 'Then come closer... and face the king of infection!' }
    ];

    constructor() {
        super('CutsceneFinalBoss');
    }

    preload() {
        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png');
        this.load.image('boss_normal', '/assets/finale/sprite_normal.png');
    }

    create() {
        this.currentDialogueIndex = 0;
        this.isTransitioning = false;
        this.previousPinchState = false;

        this.loadDialogues();

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

        const pauseBtn = document.createElement('button');
        pauseBtn.className = 'Back';
        pauseBtn.innerText = 'PAUSE';

        const wrapper = document.createElement('div');
        wrapper.className = 'phaser-dom-container';
        wrapper.appendChild(pauseBtn);

        const pauseBtnDom = this.add.dom(
            this.scale.gameSize.width - 80,
            40,
            wrapper
        );

        pauseBtn.addEventListener('click', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        const { width, height } = this.scale.gameSize;

        this.bgHTML = document.getElementById('background') as HTMLImageElement;
        if (this.bgHTML) {
            this.bgHTML.src = '/assets/finale/background_final_game.png';
            this.bgHTML.style.objectFit = 'fill';
        }

        this.textures.get('boss_normal').setFilter(Phaser.Textures.FilterMode.NEAREST);

        this.createBoss(width, height);

        this.fadeOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0);
        this.fadeOverlay.setDepth(100);

        this.abi = new ABI(this);
        this.abi.MoveDialogueY(0);

        this.input.on('pointerdown', this.handleContinueInput, this);

        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', this.handleContinueInput, this);
        }

        this.tweens.add({
            targets: this.fadeOverlay,
            alpha: 0,
            duration: 700,
            onComplete: () => {
                this.showCurrentDialogue();
            }
        });

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;

            const newW = gameSize.width;
            const newH = gameSize.height;

            this.cameras.main.setSize(newW, newH);
            pauseBtnDom.setPosition(newW - 80, 40);

            if (this.fadeOverlay) {
                this.fadeOverlay.setSize(newW, newH);
            }

            if (this.boss && this.boss.active) {
                this.boss.setPosition(newW / 2, newH * 0.38);
                const bossSize = Math.min(newW, newH) * 0.31;
                this.boss.setDisplaySize(bossSize, bossSize);
                this.startBossFloating();
            }
        };

        this.scale.on('resize', onResize);
        onResize(this.scale.gameSize);

        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
            this.input.off('pointerdown', this.handleContinueInput, this);

            if (this.input.keyboard) {
                this.input.keyboard.off('keydown-SPACE', this.handleContinueInput, this);
            }

            if (this.bossFloatingTween) {
                this.bossFloatingTween.stop();
                this.bossFloatingTween = undefined;
            }

            this.tweens.killAll();
            pauseBtnDom.destroy();
            wrapper.remove();
            style.remove();
        });
    }

    update() {
        const inputMode = this.registry.get('inputMode') || localStorage.getItem('inputMode');
        if (inputMode !== 'hand') return;

        const tracker = HandTrackingController.getInstance();
        const currentPinch = tracker.isClicked;

        if (currentPinch && !this.previousPinchState) {
            this.handleContinueInput();
        }

        this.previousPinchState = currentPinch;
    }

    private createBoss(width: number, height: number) {
        this.boss = this.add.image(width / 2, height * 0.38, 'boss_normal');
        this.boss.setOrigin(0.5);
        this.boss.setDepth(10);

        const bossSize = Math.min(width, height) * 0.31;
        this.boss.setDisplaySize(bossSize, bossSize);

        this.startBossFloating();
    }

    private startBossFloating() {
        if (!this.boss || !this.boss.active) return;

        if (this.bossFloatingTween) {
            this.bossFloatingTween.stop();
        }

        this.bossFloatingTween = this.tweens.add({
            targets: this.boss,
            y: this.boss.y - 24,
            duration: 1500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    private loadDialogues() {
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

        const finalBossDialogues = allDialogues?.cutscenes?.cutscene_final_boss;
        if (!finalBossDialogues) return;

        this.dialogues[0].text = finalBossDialogues.dialogue_1 || this.dialogues[0].text;
        this.dialogues[1].text = finalBossDialogues.dialogue_2 || this.dialogues[1].text;
        this.dialogues[2].text = finalBossDialogues.dialogue_3 || this.dialogues[2].text;
        this.dialogues[3].text = finalBossDialogues.dialogue_4 || this.dialogues[3].text;
        this.dialogues[4].text = finalBossDialogues.dialogue_5 || this.dialogues[4].text;
        this.dialogues[5].text = finalBossDialogues.dialogue_6 || this.dialogues[5].text;
        this.dialogues[6].text = finalBossDialogues.dialogue_7 || this.dialogues[6].text;
        this.dialogues[7].text = finalBossDialogues.dialogue_8 || this.dialogues[7].text;
        this.dialogues[8].text = finalBossDialogues.dialogue_9 || this.dialogues[8].text;
        this.dialogues[9].text = finalBossDialogues.dialogue_10 || this.dialogues[9].text;
    }

    private showCurrentDialogue() {
        if (this.currentDialogueIndex >= this.dialogues.length) {
            this.finishCutscene();
            return;
        }

        const currentDialogue = this.dialogues[this.currentDialogueIndex];
        this.isTransitioning = false;

        const isVirusSpeaking = currentDialogue.speaker === 'VIRUS';

        if (isVirusSpeaking) {
            // Effetto tremolio quando parla il boss
            this.cameras.main.shake(250, 0.005);
            
            // Usiamo il nuovo metodo dedicato!
            this.abi.showBossDialogue(
                currentDialogue.text,
                currentDialogue.speaker,
                () => {
                    this.currentDialogueIndex++;
                    this.showCurrentDialogue();
                }
            );
        } else {
            // Dialogo normale di A.B.I.
            this.abi.showDialogue(
                currentDialogue.speaker,
                currentDialogue.text,
                () => {
                    this.currentDialogueIndex++;
                    this.showCurrentDialogue();
                }
            );
        }
    }

    private handleContinueInput() {
        if (this.isTransitioning) return;

        if (this.abi && this.abi.isTalking) {
            this.abi.nextDialoguePage();
        }
    }

    private finishCutscene() {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        this.abi.hideDialogue();

        this.cameras.main.shake(700, 0.01);

        this.time.delayedCall(700, () => {
            this.tweens.add({
                targets: this.fadeOverlay,
                alpha: 1,
                duration: 1000,
                onComplete: () => {
                    this.scene.start('FinalBoss');
                }
            });
        });
    }
}