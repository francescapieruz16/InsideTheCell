import Phaser from 'phaser';

class Level2 extends Phaser.Scene {
    private readonly MENU_FONT = 'Arial';

    private paths: Phaser.Curves.Path[] = [];
    private graphics!: Phaser.GameObjects.Graphics;
    private crosshair!: Phaser.GameObjects.Image;
    private viruses!: Phaser.GameObjects.Group;

    private score: number = 0;
    private targetScore: number = 20;
    private scoreText!: Phaser.GameObjects.Text;
    private escapedText!: Phaser.GameObjects.Text;

    private escapedViruses: number = 0;
    private maxEscapedViruses: number = 3;

    private isGameOver: boolean = false;
    private isWin: boolean = false;
    private isVaccinated: boolean = false;
    private hasShownQuiz: boolean = false;
    private isChatActive: boolean = false;

    private maxBreachesNonVaccinated: number = 3;
    private maxBreachesVaccinated: number = 5;

    private spawnDelayNonVaccinated: number = 650;
    private spawnDelayVaccinated: number = 1500;

    private virusDurationNonVaccinated: number = 4300;
    private virusDurationVaccinated: number = 7000;

    private infoContainer!: Phaser.GameObjects.Container;

    private llmContainer!: Phaser.GameObjects.Container;
    private llmTitle!: Phaser.GameObjects.Text;
    private llmQuestionText!: Phaser.GameObjects.Text;
    private llmResponseText!: Phaser.GameObjects.Text;
    private continueButtonContainer!: Phaser.GameObjects.Container;

    private finalQuizContainer!: Phaser.GameObjects.Container;
    private finalQuizResultText!: Phaser.GameObjects.Text;

    private chatUi!: HTMLDivElement;
    private chatInput!: HTMLInputElement;
    private chatSend!: HTMLButtonElement;

    private virusKeys = [
        'virus_circle',
        'virus_square',
        'virus_triangle',
        'virus_hexagon'
    ];

    constructor() {
        super('Level2');
    }

    init(data: { vaccinated?: boolean } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.score = 0;
        this.escapedViruses = 0;
        this.isGameOver = false;
        this.isWin = false;
        this.isChatActive = false;
        this.paths = [];
    }

    preload() {
        this.load.image('background_level_2', '/assets/level 2/background_level_2.png');
        this.load.image('crosshair', '/assets/level 2/crosshair.png');
        this.load.image('explosion', '/assets/level 2/explosion.png');

        this.virusKeys.forEach(key => {
            this.load.image(key, `/assets/level1/${key}.png`);
        });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const bg = this.add.image(width / 2, height / 2, 'background_level_2');
        bg.setDisplaySize(width, height);
        bg.setDepth(0);

        this.viruses = this.add.group();

        this.maxEscapedViruses = this.isVaccinated
            ? this.maxBreachesVaccinated
            : this.maxBreachesNonVaccinated;

        this.createPaths(width, height);
        // this.drawDebugPaths();

        this.createScoreUI();
        this.createCrosshair();

        this.setupChatUI();
        this.createInfoUI();
        this.createLLMUI();
        this.createFinalQuizUI();

        const spawnDelay = this.isVaccinated
            ? this.spawnDelayVaccinated
            : this.spawnDelayNonVaccinated;

        this.time.addEvent({
            delay: spawnDelay,
            loop: true,
            callback: () => this.spawnVirus()
        });
    }

    private setupChatUI() {
        this.chatUi = document.getElementById('llm-chat-ui') as HTMLDivElement;
        this.chatInput = document.getElementById('llm-chat-input') as HTMLInputElement;
        this.chatSend = document.getElementById('llm-chat-send') as HTMLButtonElement;

        this.hideChatUi();

        this.chatSend.onclick = () => {
            this.handleChatSubmit();
        };

        this.chatInput.addEventListener('keydown', (event: KeyboardEvent) => {
            event.stopPropagation();

            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleChatSubmit();
            }
        });

        this.chatInput.addEventListener('keyup', (event: KeyboardEvent) => {
            event.stopPropagation();
        });
    }

    private createScoreUI() {
        const width = this.cameras.main.width;

        const panelBg = this.add.rectangle(width - 190, 55, 330, 72, 0x081426, 0.82)
            .setStrokeStyle(3, 0x00f5ff);

        const title = this.add.text(width - 330, 30, 'ENTRY BLOCKED', {
            fontFamily: this.MENU_FONT,
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#8ffcff'
        });

        this.scoreText = this.add.text(width - 80, 54, '0', {
            fontFamily: this.MENU_FONT,
            fontSize: '34px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.escapedText = this.add.text(
            width - 330,
            66,
            `BREACHES: 0 / ${this.maxEscapedViruses}`,
            {
                fontFamily: this.MENU_FONT,
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#ff8888'
            }
        );

    const scorePanel = this.add.container(0, 0, [
        panelBg,
        title,
        this.scoreText,
        this.escapedText
    ]);

        scorePanel.setDepth(300);
    }

    private createCrosshair() {
        this.input.setDefaultCursor('none');

        this.crosshair = this.add.image(0, 0, 'crosshair');
        this.crosshair.setDisplaySize(48, 48);
        this.crosshair.setDepth(400);

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isGameOver || this.isWin || this.isChatActive) return;
            this.crosshair.setPosition(pointer.x, pointer.y);
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isGameOver || this.isWin || this.isChatActive) return;
            this.crosshair.setPosition(pointer.x, pointer.y);
            this.shootVirus(pointer.x, pointer.y);
        });
    }

    private shootVirus(x: number, y: number) {
        const virusList = this.viruses.getChildren() as Phaser.GameObjects.Sprite[];

        for (const virus of virusList) {
            const distance = Phaser.Math.Distance.Between(x, y, virus.x, virus.y);

            if (distance < 28) {
                this.createExplosion(virus.x, virus.y);
                virus.destroy();
                this.addScore(1);
                break;
            }
        }
    }

    private addScore(amount: number) {
        if (this.isGameOver || this.isWin) return;

        this.score += amount;
        this.scoreText.setText(this.score.toString());

        this.scoreText.setScale(1.25);

        this.tweens.add({
            targets: this.scoreText,
            scale: 1,
            duration: 120,
            ease: 'Power2'
        });

        if (this.score >= this.targetScore) {
            this.triggerWin();
        }
    }

    private registerVirusBreach() {
        if (this.isGameOver || this.isWin) return;

        this.escapedViruses++;
        this.escapedText.setText(`BREACHES: ${this.escapedViruses} / ${this.maxEscapedViruses}`);

        if (this.escapedViruses >= this.maxEscapedViruses) {
            this.triggerGameOver();
        }
    }

    private createExplosion(x: number, y: number) {
        const explosion = this.add.image(x, y, 'explosion');
        explosion.setDisplaySize(70, 70);
        explosion.setDepth(50);

        this.tweens.add({
            targets: explosion,
            scale: 1.4,
            alpha: 0,
            duration: 350,
            ease: 'Power2',
            onComplete: () => explosion.destroy()
        });
    }

    private triggerGameOver() {
        this.isGameOver = true;

        this.time.removeAllEvents();
        this.tweens.killAll();
        this.viruses.clear(true, true);

        if (!this.isVaccinated && !this.hasShownQuiz) {
            this.hasShownQuiz = true;

            this.time.delayedCall(800, () => {
                this.infoContainer.setVisible(true);
            });

            return;
        }

        this.createEndScreen('CELL INFECTED', '#ff3333');
    }

    private triggerWin() {
        this.isWin = true;

        this.time.removeAllEvents();
        this.tweens.killAll();
        this.viruses.clear(true, true);

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const windowUi = this.createMenuStyleWindow(cx, cy, 820, 380);

        const title = this.add.text(cx, cy - 90, 'LEVEL COMPLETE!', {
            fontFamily: this.MENU_FONT,
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#00ff88'
        }).setOrigin(0.5);

        const nextBtn = this.createMenuButton(
            cx,
            cy + 20,
            320,
            70,
            'NEXT LEVEL',
            () => {
                window.location.href = '/pages/level3.html';
            }
        );

        const menuBtn = this.createMenuButton(
            cx,
            cy + 110,
            320,
            70,
            'BACK TO MENU',
            () => {
                window.location.href = '/pages/menu_page.html';
            }
        );

        const container = this.add.container(0, 0, [
            ...windowUi.list,
            title,
            nextBtn,
            menuBtn
        ]);

        container.setDepth(600);
    }

    private createEndScreen(titleText: string, color: string) {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const windowUi = this.createMenuStyleWindow(cx, cy, 760, 340);

        const title = this.add.text(cx, cy - 65, titleText, {
            fontFamily: this.MENU_FONT,
            fontSize: '48px',
            fontStyle: 'bold',
            color
        }).setOrigin(0.5);

        const playAgainBtn = this.createMenuButton(
            cx,
            cy + 45,
            340,
            72,
            this.isVaccinated ? 'PLAY AGAIN' : 'TRY VACCINATED',
            () => {
                this.hideChatUi();
                this.scene.restart({ vaccinated: true });
            }
        );

        const menuBtn = this.createMenuButton(
            cx,
            cy + 130,
            300,
            64,
            'BACK TO MENU',
            () => {
                window.location.href = '/pages/menu_page.html';
            }
        );

        const container = this.add.container(0, 0, [
            ...windowUi.list,
            title,
            playAgainBtn,
            menuBtn
        ]);

        container.setDepth(600);
    }

    private createInfoUI() {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const windowUi = this.createMenuStyleWindow(cx, cy, 980, 540);

        const title = this.add.text(
            cx,
            cy - 145,
            'The virus entered the cell',
            {
                fontFamily: this.MENU_FONT,
                fontSize: '36px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        const text = this.add.text(
            cx,
            cy - 15,
            "You blocked some viruses, but too many particles reached the entry point.\n\nAfter attaching to receptors, viruses can enter the cell through the membrane.\nThis is the second phase of infection: viral entry.",
            {
                fontFamily: this.MENU_FONT,
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 760 },
                lineSpacing: 12
            }
        ).setOrigin(0.5);

        const continueBtn = this.createMenuButton(
            cx,
            cy + 180,
            340,
            70,
            'CONTINUE',
            () => {
                this.infoContainer.setVisible(false);
                this.llmContainer.setVisible(true);
                this.showChatUi();
            }
        );

        this.infoContainer = this.add.container(0, 0, [
            ...windowUi.list,
            title,
            text,
            continueBtn
        ]);

        this.infoContainer.setDepth(600);
        this.infoContainer.setVisible(false);
    }

    private createLLMUI() {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const windowUi = this.createMenuStyleWindow(cx, cy, 980, 560);

        this.llmTitle = this.add.text(cx, cy - 165, 'ANALYZE', {
            fontFamily: this.MENU_FONT,
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.llmQuestionText = this.add.text(
            cx,
            cy - 95,
            'Why do you think you lost?',
            {
                fontFamily: this.MENU_FONT,
                fontSize: '30px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 760 }
            }
        ).setOrigin(0.5);

        this.llmResponseText = this.add.text(
            cx,
            cy + 20,
            '',
            {
                fontFamily: this.MENU_FONT,
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 760 },
                lineSpacing: 10
            }
        ).setOrigin(0.5);

        this.continueButtonContainer = this.createMenuButton(
            cx,
            cy + 185,
            260,
            64,
            'CONTINUE',
            () => {
                this.llmContainer.setVisible(false);
                this.hideChatUi();
                this.finalQuizContainer.setVisible(true);
            }
        );

        this.continueButtonContainer.setVisible(false);

        this.llmContainer = this.add.container(0, 0, [
            ...windowUi.list,
            this.llmTitle,
            this.llmQuestionText,
            this.llmResponseText,
            this.continueButtonContainer
        ]);

        this.llmContainer.setDepth(610);
        this.llmContainer.setVisible(false);
    }

    private createFinalQuizUI() {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const windowUi = this.createMenuStyleWindow(cx, cy, 960, 560);

        const title = this.add.text(cx, cy - 165, 'CHECK', {
            fontFamily: this.MENU_FONT,
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        const question = this.add.text(
            cx,
            cy - 85,
            'What happens during viral entry?',
            {
                fontFamily: this.MENU_FONT,
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 720 }
            }
        ).setOrigin(0.5);

        const answerA = this.createMenuButton(
            cx,
            cy + 10,
            700,
            68,
            'A) The virus enters the cell after attachment',
            () => this.handleFinalQuiz(true)
        );

        const answerB = this.createMenuButton(
            cx,
            cy + 95,
            620,
            68,
            'B) The virus becomes harmless immediately',
            () => this.handleFinalQuiz(false)
        );

        const answerC = this.createMenuButton(
            cx,
            cy + 180,
            620,
            68,
            'C) The cell stops existing',
            () => this.handleFinalQuiz(false)
        );

        this.finalQuizResultText = this.add.text(cx, cy + 265, '', {
            fontFamily: this.MENU_FONT,
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#00ff00',
            align: 'center'
        }).setOrigin(0.5);

        this.finalQuizContainer = this.add.container(0, 0, [
            ...windowUi.list,
            title,
            question,
            answerA,
            answerB,
            answerC,
            this.finalQuizResultText
        ]);

        this.finalQuizContainer.setDepth(620);
        this.finalQuizContainer.setVisible(false);
    }

    private handleChatSubmit() {
        const userText = this.chatInput.value.trim();

        if (!userText) return;

        this.hideChatUi();
        this.llmTitle.setText('LEARN');

        const lower = userText.toLowerCase();

        let feedback =
            "You lost because too many viruses reached the entry point and entered the cell. " +
            "This represents the second phase of infection: viral entry through the cell membrane.";

        if (
            lower.includes('entry') ||
            lower.includes('enter') ||
            lower.includes('cell') ||
            lower.includes('membrane') ||
            lower.includes('virus')
        ) {
            feedback =
                "Good reasoning. The key problem is that the viruses were not blocked before reaching the entry point. " +
                "After attachment, viruses can enter the cell and start the next steps of infection.";
        }

        this.llmQuestionText.setText('Here is what happened:');
        this.llmResponseText.setText(feedback);
        this.continueButtonContainer.setVisible(true);
    }

    private handleFinalQuiz(correct: boolean) {
        if (correct) {
            this.finalQuizResultText.setText('Correct! Vaccinated mode unlocked.');
            this.finalQuizResultText.setColor('#00ff00');

            this.time.delayedCall(1000, () => {
                this.hideChatUi();
                this.scene.restart({ vaccinated: true });
            });
        } else {
            this.finalQuizResultText.setText('Wrong answer. Try again.');
            this.finalQuizResultText.setColor('#770000');
        }
    }

    private createMenuStyleWindow(x: number, y: number, width: number, height: number) {
        const container = this.add.container(0, 0);

        const shadow = this.add.rectangle(x + 8, y + 8, width, height, 0x000000, 0.35);
        const outer = this.add.rectangle(x, y, width, height, 0xff5a0a, 1)
            .setStrokeStyle(4, 0xffffff);
        const inner = this.add.rectangle(x, y, width - 12, height - 12, 0xd94700, 1);
        const shine = this.add.rectangle(x, y - height / 2 + 18, width - 14, 22, 0xff8a3d, 0.9);

        container.add([shadow, outer, inner, shine]);
        return container;
    }

    private createMenuButton(
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        onClick: () => void
    ) {
        const container = this.add.container(x, y);

        const shadow = this.add.rectangle(6, 6, width, height, 0x000000, 0.25);
        const outer = this.add.rectangle(0, 0, width, height, 0xff5a0a, 1)
            .setStrokeStyle(4, 0xffffff);
        const inner = this.add.rectangle(0, 0, width - 8, height - 8, 0xff4d06, 1);
        const shine = this.add.rectangle(0, -height / 2 + 10, width - 8, 16, 0xff8f47, 0.9);

        const text = this.add.text(0, 0, label, {
            fontFamily: this.MENU_FONT,
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 30 }
        }).setOrigin(0.5);

        const hit = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
            .setInteractive({ useHandCursor: true });

        hit.on('pointerover', () => {
            container.setScale(1.08);
        });

        hit.on('pointerout', () => {
            container.setScale(1);
        });

        hit.on('pointerdown', () => {
            container.setScale(1.02);
            onClick();
        });

        hit.on('pointerup', () => {
            container.setScale(1.08);
        });

        container.add([shadow, outer, inner, shine, text, hit]);
        return container;
    }

    private showChatUi() {
        this.chatInput.value = '';
        this.chatUi.style.display = 'flex';
        this.isChatActive = true;

        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }

        setTimeout(() => {
            this.chatInput.focus();
        }, 0);
    }

    private hideChatUi() {
        if (!this.chatUi) return;

        this.chatUi.style.display = 'none';
        this.isChatActive = false;

        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
    }

    private createPaths(width: number, height: number) {
        this.paths = [];

        const p1 = new Phaser.Curves.Path(width * 0.08, height * 0.14);
        p1.splineTo([
            new Phaser.Math.Vector2(width * 0.18, height * 0.20),
            new Phaser.Math.Vector2(width * 0.24, height * 0.22),
            new Phaser.Math.Vector2(width * 0.29, height * 0.12),
            new Phaser.Math.Vector2(width * 0.32, height * 0.11),
            new Phaser.Math.Vector2(width * 0.34, height * 0.13),
            new Phaser.Math.Vector2(width * 0.38, height * 0.25),
            new Phaser.Math.Vector2(width * 0.45, height * 0.28),
            new Phaser.Math.Vector2(width * 0.53, height * 0.21),
            new Phaser.Math.Vector2(width * 0.62, height * 0.27),
            new Phaser.Math.Vector2(width * 0.75, height * 0.20),
            new Phaser.Math.Vector2(width * 0.84, height * 0.34),
            new Phaser.Math.Vector2(width * 0.90, height * 0.38),
            new Phaser.Math.Vector2(width * 0.92, height * 0.48),
        ]);
        this.paths.push(p1);

        const p2 = new Phaser.Curves.Path(width * 0.06, height * 0.43);
        p2.splineTo([
            new Phaser.Math.Vector2(width * 0.20, height * 0.42),
            new Phaser.Math.Vector2(width * 0.30, height * 0.39),
            new Phaser.Math.Vector2(width * 0.37, height * 0.40),
            new Phaser.Math.Vector2(width * 0.43, height * 0.35),
            new Phaser.Math.Vector2(width * 0.52, height * 0.40),
            new Phaser.Math.Vector2(width * 0.62, height * 0.40),
            new Phaser.Math.Vector2(width * 0.68, height * 0.44),
            new Phaser.Math.Vector2(width * 0.75, height * 0.42),
            new Phaser.Math.Vector2(width * 0.80, height * 0.50),
            new Phaser.Math.Vector2(width * 0.85, height * 0.52),
            new Phaser.Math.Vector2(width * 0.90, height * 0.52)
        ]);
        this.paths.push(p2);

        const p3 = new Phaser.Curves.Path(width * 0.06, height * 0.69);
        p3.splineTo([
            new Phaser.Math.Vector2(width * 0.13, height * 0.68),
            new Phaser.Math.Vector2(width * 0.18, height * 0.62),
            new Phaser.Math.Vector2(width * 0.23, height * 0.60),
            new Phaser.Math.Vector2(width * 0.27, height * 0.60),
            new Phaser.Math.Vector2(width * 0.35, height * 0.54),
            new Phaser.Math.Vector2(width * 0.46, height * 0.64),
            new Phaser.Math.Vector2(width * 0.55, height * 0.61),
            new Phaser.Math.Vector2(width * 0.60, height * 0.63),
            new Phaser.Math.Vector2(width * 0.66, height * 0.71),
            new Phaser.Math.Vector2(width * 0.73, height * 0.65),
            new Phaser.Math.Vector2(width * 0.78, height * 0.63),
            new Phaser.Math.Vector2(width * 0.83, height * 0.58),
            new Phaser.Math.Vector2(width * 0.88, height * 0.58),
            new Phaser.Math.Vector2(width * 0.90, height * 0.58)
        ]);
        this.paths.push(p3);

        const p4 = new Phaser.Curves.Path(width * 0.12, height * 0.91);
        p4.splineTo([
            new Phaser.Math.Vector2(width * 0.18, height * 0.91),
            new Phaser.Math.Vector2(width * 0.25, height * 0.86),
            new Phaser.Math.Vector2(width * 0.30, height * 0.85),
            new Phaser.Math.Vector2(width * 0.38, height * 0.75),
            new Phaser.Math.Vector2(width * 0.43, height * 0.75),
            new Phaser.Math.Vector2(width * 0.50, height * 0.86),
            new Phaser.Math.Vector2(width * 0.58, height * 0.84),
            new Phaser.Math.Vector2(width * 0.69, height * 0.89),
            new Phaser.Math.Vector2(width * 0.86, height * 0.78),
            new Phaser.Math.Vector2(width * 0.90, height * 0.60)
        ]);
        this.paths.push(p4);
    }

    private spawnVirus() {
        if (this.isGameOver || this.isWin || this.isChatActive) return;

        const path = Phaser.Utils.Array.GetRandom(this.paths);
        const virusKey = Phaser.Utils.Array.GetRandom(this.virusKeys);

        const virus = this.add.sprite(0, 0, virusKey);
        virus.setDisplaySize(40, 40);
        virus.setDepth(10);

        this.viruses.add(virus);

        const follower = { t: 0 };

        const duration = this.isVaccinated
            ? this.virusDurationVaccinated
            : this.virusDurationNonVaccinated;

        this.tweens.add({
            targets: follower,
            t: 1,
            duration,
            ease: 'Linear',
            onUpdate: () => {
                if (!virus.active) return;

                const point = path.getPoint(follower.t);
                if (point) virus.setPosition(point.x, point.y);
            },
            onComplete: () => {
                if (virus.active) {
                    virus.destroy();
                    this.registerVirusBreach();
                }
            }
        });
    }

    private drawDebugPaths() {
        if (this.graphics) this.graphics.destroy();

        this.graphics = this.add.graphics();
        this.graphics.lineStyle(3, 0xff0000, 1);
        this.graphics.setDepth(100);

        this.paths.forEach(p => p.draw(this.graphics));
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    render: {
        pixelArt: true,
        roundPixels: true
    },
    scene: [Level2]
};

new Phaser.Game(config);