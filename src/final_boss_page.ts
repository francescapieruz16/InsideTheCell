import Phaser from 'phaser';
import ABI from './classes/abi';
import { HandTrackingController } from '../src/handTracking/handTrackingController';

import defaultDialogues from '../assets/default_dialogues.json';
import defaultContent from '../assets/default_context_and_quizzes.json';

type QuizAnswer = {
    label: string;
    text: string;
    correct: boolean;
};

type QuizQuestion = {
    question: string;
    answers: QuizAnswer[];
    explanation: string;
};

export class FinalBoss extends Phaser.Scene {
    private boss!: Phaser.GameObjects.Image;

    private bossFloatingTween?: Phaser.Tweens.Tween;

    private bossBaseScaleX = 1;
    private bossBaseScaleY = 1;
    private bossGrowthLevel = 0;

    private readonly bossGrowthStep = 0.04;
    private readonly bossMaxGrowth = 0.22;

    private abi!: ABI;
    private interactKey!: Phaser.Input.Keyboard.Key;

    private dialogue1 = '';
    private dialogue2 = '';

    private quizzes: QuizQuestion[] = [];
    private currentQuizIndex = 0;

    private bossHp = 10;
    private readonly maxBossHp = 10;

    private playerLives = 7;
    private readonly maxPlayerLives = 7;

    private correctAnswers = 0;
    private canAnswer = false;
    private gameEnded = false;

    private isQuestionDisplayed = false;

    private hudPanel!: Phaser.GameObjects.Rectangle;
    private hudText!: Phaser.GameObjects.Text;

    private answerButtons: Phaser.GameObjects.Container[] = [];

    private endScreenContainer?: Phaser.GameObjects.Container;
    private readonly menuFont = 'Arial';

    private previousPinchState = false;
    private allInteractableButtons: Phaser.GameObjects.Container[] = [];

    constructor() {
        super('FinalBoss');
    }

    preload() {
        this.load.image(
            'final_boss_background',
            '/assets/finale/background_final_game.png'
        );

        this.load.image(
            'boss_normal',
            '/assets/finale/sprite_normal.png'
        );

        this.load.image(
            'boss_angry',
            '/assets/finale/sprite_angry.png'
        );

        this.load.image(
            'boss_happy',
            '/assets/finale/sprite_happy.png'
        );

        this.load.image(
            'ABI_standard',
            '/assets/tutorial/ABI/ABI_standard.png'
        );
    }

    create() {
        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/finale/background_final_game.png';
            bgHTML.style.objectFit = 'fill'; 
        }

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
        backBtn.style.pointerEvents = 'auto';
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.top = '20px';
        wrapper.style.right = '40px';
        wrapper.style.transform = 'none';
        wrapper.style.zIndex = '1000';
        wrapper.style.pointerEvents = 'none';
        wrapper.appendChild(backBtn);
        const gameContainer = document.getElementById('app') || document.body;
        gameContainer.appendChild(wrapper);

        backBtn.addEventListener('click', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.textures.get('final_boss_background').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('boss_normal').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('boss_angry').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('boss_happy').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('ABI_standard').setFilter(Phaser.Textures.FilterMode.NEAREST);

        this.loadDialogues();
        this.loadQuizzes();

        this.createBoss(width, height);
        this.createHud(width);

        this.abi = new ABI(this);

        if (this.input.keyboard) {
            this.interactKey = this.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.SPACE
            );
        }

        this.showAbiIntro();

        this.scale.on('resize', this.onResize, this);
        
        this.onResize();
        this.time.delayedCall(10, () => this.onResize());

        this.events.once('shutdown', () => {
            this.scale.off('resize', this.onResize, this);
            this.allInteractableButtons = [];
        });
    }

    private onResize() {
        if (!this.scene.isActive() && !this.scene.isPaused()) return;

        const width = this.scale.width;
        const height = this.scale.height;

        this.cameras.main.setSize(width, height);

        const cx = width / 2;
        const uiScale = height / 1080; 

        if (this.boss && this.boss.active) {
            this.boss.setPosition(cx, height * 0.40);
            const bossSize = Math.min(width, height) * 0.31;
            const multiplier = this.getBossCurrentScaleMultiplier();
            this.boss.setDisplaySize(bossSize * multiplier, bossSize * multiplier);
        }

        if (this.hudPanel && this.hudPanel.active) {
            this.hudPanel.setPosition(cx, 54 * uiScale);
            this.hudPanel.setSize((width * 0.72) / uiScale, 78);
            this.hudPanel.setScale(uiScale);
        }
        if (this.hudText && this.hudText.active) {
            this.hudText.setPosition(cx, 35 * uiScale);
            this.hudText.setScale(uiScale);
        }

        if (this.answerButtons && this.answerButtons.length > 0) {
            const buttonWidth = 450;
            const spacing = 40;
            const totalAnswers = this.answerButtons.length;
            
            const totalWidth = (buttonWidth * totalAnswers) + (spacing * (totalAnswers - 1));
            const startX = -(totalWidth / 2) + (buttonWidth / 2);
            
            const scaledPadding = 35 * uiScale;
            const scaledHalfHeight = 60 * uiScale; 
            const fixedY = height - scaledHalfHeight - scaledPadding;

            this.answerButtons.forEach((btn, index) => {
                const xOffset = startX + index * (buttonWidth + spacing);
                
                btn.setScale(uiScale);
                (btn as any).baseScale = uiScale; 
                
                btn.setPosition(cx + (xOffset * uiScale), fixedY);
            });
        }

        if (this.endScreenContainer && this.endScreenContainer.active) {
            this.endScreenContainer.setPosition(cx, height / 2);
            this.endScreenContainer.setScale(uiScale);
        }
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

        this.dialogue1 =
            allDialogues?.minigames?.final_boss?.dialogue_1 ||
            'We made it to the final challenge! Answer the questions correctly to weaken the boss.';

        this.dialogue2 =
            allDialogues?.minigames?.final_boss?.dialogue_2 ||
            'If you answer wrong, the boss grows stronger. Stay focused and use what you learned!';
    }

    private loadQuizzes() {
        const savedContent =
            localStorage.getItem('ADMIN_SETTINGS_JSON') ||
            localStorage.getItem('CONTEXT_AND_QUIZZES_JSON') ||
            localStorage.getItem('QUIZZES_JSON');

        let allContent: any = null;

        if (savedContent) {
            try {
                allContent = JSON.parse(savedContent);
            } catch (e) {
                console.warn('Error reading saved quiz content. Using defaults.', e);
                allContent = defaultContent;
            }
        } else {
            allContent = defaultContent;
        }

        const defaultFinalBossData =
            (defaultContent as any)?.minigames?.final_boss || {};

        const finalBossData =
            allContent?.minigames?.final_boss || defaultFinalBossData;

        const rawQuizzes: string[] =
            finalBossData?.quizzes && finalBossData.quizzes.length > 0
                ? finalBossData.quizzes
                : defaultFinalBossData.quizzes || [];

        this.quizzes = rawQuizzes
            .map((quizText) => this.parseQuizString(quizText))
            .filter((quiz): quiz is QuizQuestion => quiz !== null);

        this.quizzes = Phaser.Utils.Array.Shuffle(this.quizzes);

        if (this.quizzes.length === 0) {
            console.warn('No final boss quizzes found.');
        }
    }

    private parseQuizString(quizText: string): QuizQuestion | null {
        const lines = quizText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length < 4) {
            return null;
        }

        const question = lines[0];

        const explanationLine = lines.find((line) =>
            line.toLowerCase().startsWith('explanation:')
        );

        const explanation = explanationLine
            ? explanationLine.replace(/^explanation:\s*/i, '').trim()
            : 'This question reviews an important step of the viral infection cycle.';

        const answerLines = lines
            .slice(1)
            .filter((line) => !line.toLowerCase().startsWith('explanation:'));

        const answers: QuizAnswer[] = answerLines.map((line) => {
            const match = line.match(/^([abc])\((T|F)\):\s*(.+)$/i);

            if (!match) {
                return {
                    label: '',
                    text: line,
                    correct: false
                };
            }

            return {
                label: match[1].toUpperCase(),
                correct: match[2].toUpperCase() === 'T',
                text: match[3].trim()
            };
        });

        const validAnswers = answers.filter((answer) => answer.text.length > 0);

        if (validAnswers.length < 2) {
            return null;
        }

        return {
            question,
            answers: validAnswers,
            explanation
        };
    }

    private createBoss(width: number, height: number) {
        this.boss = this.add.image(
            width / 2,
            height * 0.40,
            'boss_normal'
        );

        this.boss.setOrigin(0.5);
        this.boss.setDepth(10);

        const bossSize = Math.min(width, height) * 0.31;
        this.boss.setDisplaySize(bossSize, bossSize);

        this.bossBaseScaleX = this.boss.scaleX;
        this.bossBaseScaleY = this.boss.scaleY;
        this.bossGrowthLevel = 0;

        this.startBossFloating();
    }

    private createHud(width: number) {
        this.hudPanel = this.add.rectangle(
            width / 2,
            54,
            width * 0.72,
            78,
            0x001b1d,
            0.78
        );

        this.hudPanel.setDepth(79);
        this.hudPanel.setStrokeStyle(4, 0x88e6ff, 0.65);

        this.hudText = this.add.text(
            width / 2,
            35,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '30px',
                color: '#ffffff',
                stroke: '#001020',
                strokeThickness: 6
            }
        );

        this.hudText.setOrigin(0.5, 0);
        this.hudText.setDepth(80);

        this.updateHud();
    }

    private startBossFloating() {
        if (!this.boss || !this.boss.active) {
            return;
        }

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

    private showAbiIntro() {
        this.abi.MoveDialogueY(0);

        this.abi.showDialogue(
            'ABI',
            [
                this.dialogue1,
                this.dialogue2
            ],
            () => {
                this.startQuizGame();
            }
        );
    }

    private startQuizGame() {
        this.bossHp = this.maxBossHp;
        this.playerLives = this.maxPlayerLives;
        this.currentQuizIndex = 0;
        this.correctAnswers = 0;
        this.canAnswer = false;
        this.gameEnded = false;
        this.isQuestionDisplayed = false;

        this.updateHud();

        if (this.quizzes.length === 0) {
            this.showMissingQuizMessage();
            return;
        }

        this.showCurrentQuestion();
    }

    private showCurrentQuestion() {
        if (this.gameEnded) return;

        this.clearAnswerButtons();

        if (this.currentQuizIndex >= this.quizzes.length) {
            this.endGame(false);
            return;
        }

        const quiz = this.quizzes[this.currentQuizIndex];

        this.canAnswer = true;
        this.isQuestionDisplayed = true;

        this.abi.MoveDialogueY(-100);

        this.abi.showDialogue(
            'ABI',
            quiz.question,
            undefined,
            true,
            true
        );

        this.createAnswerButtons(quiz);
        this.updateHud();
    }

    private createAnswerButtons(quiz: QuizQuestion) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const shuffledAnswers = Phaser.Utils.Array.Shuffle([...quiz.answers]);

        const buttonWidth = 450;
        const buttonHeight = 120;
        const spacing = 40;

        const totalAnswers = shuffledAnswers.length;
        const totalWidth =
            buttonWidth * totalAnswers + spacing * (totalAnswers - 1);

        const startX =
            width / 2 - totalWidth / 2 + buttonWidth / 2;

        const y = height - 95;

        shuffledAnswers.forEach((answer, index) => {
            const x = startX + index * (buttonWidth + spacing);

            const button = this.createButton(
                x,
                y,
                buttonWidth,
                buttonHeight,
                answer.text,
                '26px',
                () => {
                    this.handleAnswer(answer);
                }
            );

            button.setDepth(120);
            this.answerButtons.push(button);
        });

        this.onResize();
    }

    private handleAnswer(answer: QuizAnswer) {
        if (!this.canAnswer || this.gameEnded) return;

        this.canAnswer = false;
        this.isQuestionDisplayed = false;

        const quiz = this.quizzes[this.currentQuizIndex];

        this.clearAnswerButtons();
        this.abi.MoveDialogueY(0);

        if (answer.correct) {
            this.correctAnswers++;
            this.bossHp = Math.max(0, this.bossHp - 1);

            this.showCorrectAnswerReaction();
            this.updateHud();

            this.time.delayedCall(600, () => {
                this.abi.showDialogue(
                    'ABI',
                    `Correct! ${quiz.explanation}`,
                    () => {
                        this.afterFeedbackContinue();
                    }
                );
            });

            return;
        }

        this.playerLives = Math.max(0, this.playerLives - 1);

        const correctAnswer = quiz.answers.find((item) => item.correct);

        this.showWrongAnswerReaction();
        this.updateHud();

        this.time.delayedCall(600, () => {
            this.abi.showDialogue(
                'ABI',
                [
                    `Wrong! The correct answer was: ${correctAnswer?.text || 'Unknown'}.`,
                    quiz.explanation
                ],
                () => {
                    this.afterFeedbackContinue();
                }
            );
        });
    }

    private afterFeedbackContinue() {
        if (this.gameEnded) return;

        if (this.bossHp <= 0) {
            this.endGame(true);
            return;
        }

        if (this.playerLives <= 0) {
            this.endGame(false);
            return;
        }

        this.currentQuizIndex++;

        this.showCurrentQuestion();
    }

    private updateHud() {
        if (!this.hudText) return;

        const totalQuestions = this.quizzes.length > 0
            ? this.quizzes.length
            : 0;

        const visibleQuestionNumber = totalQuestions > 0
            ? Math.min(this.currentQuizIndex + 1, totalQuestions)
            : 0;

        this.hudText.setText(
            `BOSS HP: ${this.bossHp}/${this.maxBossHp}   LIVES: ${this.playerLives}/${this.maxPlayerLives}   QUESTION: ${visibleQuestionNumber}/${totalQuestions}`
        );
    }

    private clearAnswerButtons() {
        this.answerButtons.forEach((button) => {
            button.destroy();
        });

        this.answerButtons = [];
    }

    private showMissingQuizMessage() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.abi.MoveDialogueY(0);

        this.abi.showDialogue(
            'ABI',
            'No final boss quiz configured. Please add final_boss quizzes in the context and quizzes JSON.',
            () => {
                this.createMenuButton(width / 2, height * 0.68);
            }
        );
    }

    private endGame(won: boolean) {
        if (this.gameEnded) return;

        this.gameEnded = true;
        this.canAnswer = false;
        this.isQuestionDisplayed = false;

        this.clearAnswerButtons();
        this.abi.MoveDialogueY(0);

        if (won) {
            this.showFinalWin();
        } else {
            this.showFinalLose();
        }
    }

    private showFinalWin() {
        this.switchBossSprite('boss_angry');

        this.tweens.add({
            targets: this.boss,
            alpha: 0,
            scaleX: this.boss.scaleX * 0.4,
            scaleY: this.boss.scaleY * 0.4,
            duration: 900,
            ease: 'Power2'
        });

        this.abi.showDialogue(
            'ABI',
            [
                'Great job! You defeated the final virus boss!',
                'You reviewed all six phases of viral infection and completed the mission.'
            ],
            () => {
                this.createFinalPostGameWindow(true);
            }
        );
    }

    private showFinalLose() {
        this.switchBossSprite('boss_happy');

        this.abi.showDialogue(
            'ABI',
            [
                'The boss is still too strong!',
                'Try again and use what you learned about the six infection phases.'
            ],
            () => {
                this.createFinalPostGameWindow(false);
            }
        );
    }

    private createFinalPostGameWindow(won: boolean) {
        if (this.endScreenContainer && this.endScreenContainer.active) {
            this.endScreenContainer.destroy();
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const container = this.add.container(width / 2, height / 2);
        container.setDepth(200);
        container.setScrollFactor(0);

        const windowWidth = 820;
        const windowHeight = won ? 380 : 420;

        const windowUi = this.createPostGameWindow(windowWidth, windowHeight);

        const title = this.add.text(
            0,
            won ? -90 : -100,
            won ? 'FINAL GAME COMPLETED!' : 'GAME OVER',
            {
                fontFamily: this.menuFont,
                fontSize: won ? '46px' : '56px',
                fontStyle: 'bold',
                color: won ? '#00ff00' : '#770000',
                align: 'center'
            }
        );

        title.setOrigin(0.5);

        if (won) {
            const menuBtn = this.createButton(
                0,
                110,
                320,
                70,
                'Menu',
                '28px',
                () => {
                    window.location.href = '/pages/menu_page.html';
                }
            );

            container.add([
                ...windowUi.list,
                title,
                menuBtn
            ]);
        } else {
            const retryBtn = this.createButton(
                0,
                70,
                320,
                70,
                'Try Again',
                '28px',
                () => {
                    this.scene.restart();
                }
            );

            const menuBtn = this.createButton(
                0,
                160,
                320,
                70,
                'Menu',
                '28px',
                () => {
                    window.location.href = '/pages/menu_page.html';
                }
            );

            container.add([
                ...windowUi.list,
                title,
                retryBtn,
                menuBtn
            ]);
        }

        const zoom = height / 1080;
        container.setScale(zoom);

        this.endScreenContainer = container;

        this.onResize();
    }

    private createPostGameWindow(width: number, height: number) {
        const container = this.add.container(0, 0);

        const shadow = this.add.rectangle(
            8,
            8,
            width,
            height,
            0x000000,
            0.35
        );

        const outer = this.add.rectangle(
            0,
            0,
            width,
            height,
            0xff5a0a,
            1
        );

        outer.setStrokeStyle(4, 0xffffff);

        const inner = this.add.rectangle(
            0,
            0,
            width - 12,
            height - 12,
            0xd94700,
            1
        );

        container.add([shadow, outer, inner]);

        return container;
    }

    private createMenuButton(x: number, y: number) {
        this.createButton(
            x,
            y,
            300,
            64,
            'Menu',
            '26px',
            () => {
                window.location.href = '/pages/menu_page.html';
            }
        ).setDepth(140);
    }

    private createButton(
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        fontSize: string,
        callback: () => void
    ) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(
            0,
            0,
            width,
            height,
            0x3f5f95,
            1
        );

        bg.setStrokeStyle(4, 0xffffff, 1);
        bg.setInteractive({ useHandCursor: true });

        const text = this.add.text(
            0,
            0,
            label,
            {
                fontFamily: 'Arial',
                fontSize,
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: {
                    width: width - 40
                }
            }
        );

        text.setOrigin(0.5);

        if (text.width > width - 40) {
            text.setScale((width - 40) / text.width);
        }

        container.add([bg, text]);
        container.setDepth(20);

        bg.on('pointerover', () => {
            if (!this.canAnswer && this.answerButtons.includes(container)) {
                return;
            }

            bg.setFillStyle(0x5276b8, 1);
            container.setScale(1.05);
            this.game.canvas.style.cursor = 'pointer';
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x3f5f95, 1);
            container.setScale(1);
            this.game.canvas.style.cursor = 'default';
        });

        bg.on('pointerdown', () => {
            this.game.canvas.style.cursor = 'default';
            callback();
        });

        (container as any).baseScale = 1; 
        (container as any).customOnClick = callback;
        this.allInteractableButtons.push(container);

        return container;
    }

    private getBossCurrentScaleMultiplier() {
        return 1 + Math.min(
            this.bossGrowthLevel * this.bossGrowthStep,
            this.bossMaxGrowth
        );
    }

    private showCorrectAnswerReaction() {
        this.switchBossSprite('boss_angry');

        const multiplier = this.getBossCurrentScaleMultiplier();

        const currentScaleX = this.bossBaseScaleX * multiplier;
        const currentScaleY = this.bossBaseScaleY * multiplier;

        this.tweens.killTweensOf(this.boss);

        this.tweens.add({
            targets: this.boss,
            scaleX: currentScaleX * 0.96,
            scaleY: currentScaleY * 0.96,
            duration: 120,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                if (!this.boss || !this.boss.active) return;

                this.boss.setScale(currentScaleX, currentScaleY);
                this.startBossFloating();
            }
        });

        this.time.delayedCall(850, () => {
            if (this.gameEnded) return;

            this.switchBossSprite('boss_normal');
            this.boss.setScale(currentScaleX, currentScaleY);
        });
    }

    private showWrongAnswerReaction() {
        this.switchBossSprite('boss_happy');

        this.bossGrowthLevel++;

        const multiplier = this.getBossCurrentScaleMultiplier();

        const targetScaleX = this.bossBaseScaleX * multiplier;
        const targetScaleY = this.bossBaseScaleY * multiplier;

        this.tweens.killTweensOf(this.boss);

        this.tweens.add({
            targets: this.boss,
            scaleX: targetScaleX,
            scaleY: targetScaleY,
            angle: 4,
            duration: 180,
            yoyo: true,
            repeat: 1,
            ease: 'Power1',
            onComplete: () => {
                if (!this.boss || !this.boss.active) return;

                this.boss.setAngle(0);
                this.boss.setScale(targetScaleX, targetScaleY);
                this.startBossFloating();
            }
        });

        this.time.delayedCall(850, () => {
            if (this.gameEnded) return;

            this.switchBossSprite('boss_normal');
            this.boss.setScale(targetScaleX, targetScaleY);
        });
    }

    private switchBossSprite(textureKey: string) {
        if (!this.boss || !this.boss.active) {
            return;
        }

        const currentDisplayWidth = this.boss.displayWidth;
        const currentDisplayHeight = this.boss.displayHeight;

        this.boss.setTexture(textureKey);
        this.boss.setDisplaySize(currentDisplayWidth, currentDisplayHeight);
    }

    update() {
        const inputMode = this.registry.get('inputMode') || localStorage.getItem('inputMode');
        const tracker = HandTrackingController.getInstance();
        const currentPinch = inputMode === 'hand' ? tracker.isClicked : false;

        if (this.abi && this.abi.isTalking) {
            const justPinched = currentPinch && !this.previousPinchState;
            const spaceJustDown = this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey);

            if (!this.isQuestionDisplayed && (spaceJustDown || justPinched)) {
                this.abi.nextDialoguePage();
            }
        }

        if (inputMode === 'hand') {
            if (currentPinch && !this.previousPinchState && this.isQuestionDisplayed) {
                const cursorX = tracker.targetX * this.cameras.main.width;
                const cursorY = tracker.targetY * this.cameras.main.height;
                
                this.handlePinchClick(cursorX, cursorY);
            }
            this.previousPinchState = currentPinch;
        }
    }

    private handlePinchClick(x: number, y: number) {
        for (const btn of this.allInteractableButtons) {
            let isVisible = btn.visible && btn.active;
            
            let parent = btn.parentContainer;
            while (parent && isVisible) {
                if (!parent.visible) isVisible = false;
                parent = parent.parentContainer;
            }

            if (!isVisible) continue;

            const bounds = btn.getBounds();

            if (bounds.contains(x, y)) {
                (btn as any).customOnClick();
                
                const baseScale = (btn as any).baseScale || 1;
                btn.setScale(baseScale * 0.95);
                setTimeout(() => {
                    if (btn.active) btn.setScale(baseScale * 1.05);
                }, 150);
                
                break;
            }
        }
    }
}