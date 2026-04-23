import Phaser from 'phaser';

class Level1 extends Phaser.Scene {
    private readonly MENU_FONT = 'Arial';

    private virusGroup!: Phaser.Physics.Arcade.Group;
    private receptorsGroup!: Phaser.Physics.Arcade.Group;

    private receptorVirusData = [
        { receptor: 'receptor_circle', virus: 'virus_circle', x: 200, y: 605 },
        { receptor: 'receptor_hexagon', virus: 'virus_hexagon', x: 600, y: 605 },
        { receptor: 'receptor_square', virus: 'virus_square', x: 1000, y: 605 },
        { receptor: 'receptor_triangle', virus: 'virus_triangle', x: 1400, y: 605 }
    ];

    private playerCart!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private cartSpeed: number = 800;
    private cartFull: boolean = false;

    private isGameOver: boolean = false;
    private isWin: boolean = false;

    private isVaccinated: boolean = false;
    private hasShownQuiz: boolean = false;
    private isChatActive: boolean = false;

    private progressBar!: Phaser.GameObjects.Graphics;
    private progressBox!: Phaser.GameObjects.Graphics;

    private gameTime: number = 30000;
    private elapsedTime: number = 0;

    private spawnEvent!: Phaser.Time.TimerEvent;

    // Hard mode
    private nonVaccinatedDelay: number = 800;
    private baseVirusSpeedNonVaccinated: number = 260;
    private speedIncreaseOverTimeNonVaccinated: number = 12;

    // Easy mode
    private vaccinatedDelay: number = 2600;
    private baseVirusSpeedVaccinated: number = 150;
    private speedIncreaseOverTimeVaccinated: number = 2;

    private currentVirusSpeed: number = 260;

    private infoContainer!: Phaser.GameObjects.Container;

    private llmContainer!: Phaser.GameObjects.Container;
    private llmTitle!: Phaser.GameObjects.Text;
    private llmQuestionText!: Phaser.GameObjects.Text;
    private llmResponseText!: Phaser.GameObjects.Text;
    private continueButtonContainer!: Phaser.GameObjects.Container;

    private finalQuizContainer!: Phaser.GameObjects.Container;
    private finalQuizQuestionText!: Phaser.GameObjects.Text;
    private finalQuizResultText!: Phaser.GameObjects.Text;

    private chatUi!: HTMLDivElement;
    private chatInput!: HTMLInputElement;
    private chatSend!: HTMLButtonElement;

    constructor() {
        super('Level1');
    }

    init(data: { vaccinated?: boolean } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.isGameOver = false;
        this.isWin = false;
        this.isChatActive = false;
        this.cartFull = false;
        this.elapsedTime = 0;
    }

    preload() {
        this.load.image('background', '/assets/level1/background_level1.png');
        this.load.image('receptor_circle', '/assets/level1/receptor_circle.png');
        this.load.image('virus_circle', '/assets/level1/virus_circle.png');
        this.load.image('receptor_hexagon', '/assets/level1/receptor_hexagon.png');
        this.load.image('virus_hexagon', '/assets/level1/virus_hexagon.png');
        this.load.image('receptor_square', '/assets/level1/receptor_square.png');
        this.load.image('virus_square', '/assets/level1/virus_square.png');
        this.load.image('receptor_triangle', '/assets/level1/receptor_triangle.png');
        this.load.image('virus_triangle', '/assets/level1/virus_triangle.png');
        this.load.image('cart', '/assets/level1/cart.png');
        this.load.image('cart_full', '/assets/level1/cart_full.png');
    }

    create() {
        const bg = this.add.image(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'background'
        );
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.receptorsGroup = this.physics.add.group();
        this.createReceptors();

        this.virusGroup = this.physics.add.group();

        this.playerCart = this.physics.add.sprite(
            this.cameras.main.width / 2,
            400,
            'cart'
        );

        this.playerCart.setCollideWorldBounds(true);
        this.playerCart.setMaxVelocity(this.cartSpeed, 0);
        this.playerCart.setDragX(3000);
        this.playerCart.setAccelerationX(0);
        this.playerCart.setVelocity(0, 0);

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.progressBox = this.add.graphics();
        this.progressBox.fillStyle(0x2a2a2a, 0.85);
        this.progressBox.fillRoundedRect(this.cameras.main.width / 2 - 200, 20, 400, 30, 6);
        this.progressBox.lineStyle(4, 0xffffff, 1);
        this.progressBox.strokeRoundedRect(this.cameras.main.width / 2 - 200, 20, 400, 30, 6);

        this.progressBar = this.add.graphics();

        this.physics.add.overlap(
            this.playerCart,
            this.virusGroup,
            this.catchVirus,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.virusGroup,
            this.receptorsGroup,
            this.triggerGameOver,
            undefined,
            this
        );

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

        this.createInfoUI();
        this.createLLMUI();
        this.createFinalQuizUI();
        this.applyModeSettings();
    }

    private createReceptors() {
        this.receptorVirusData.forEach((data) => {
            const receptor = this.receptorsGroup.create(data.x, data.y, data.receptor);
            receptor.setScale(0.2);
            receptor.refreshBody();
        });
    }

    private applyModeSettings() {
        this.cartFull = false;
        this.playerCart.setTexture('cart');
        this.playerCart.clearTint();
        this.playerCart.setPosition(this.cameras.main.width / 2, 400);
        this.playerCart.setVelocity(0, 0);
        this.playerCart.setAcceleration(0, 0);

        if (this.isVaccinated) {
            this.playerCart.setScale(0.34);
            this.currentVirusSpeed = this.baseVirusSpeedVaccinated;
        } else {
            this.playerCart.setScale(0.2);
            this.currentVirusSpeed = this.baseVirusSpeedNonVaccinated;
        }

        if (this.spawnEvent) {
            this.spawnEvent.remove(false);
        }

        this.spawnEvent = this.time.addEvent({
            delay: this.isVaccinated ? this.vaccinatedDelay : this.nonVaccinatedDelay,
            callback: this.spawnVirus,
            callbackScope: this,
            loop: true
        });
    }

    private spawnVirus() {
        const randomVirus = Phaser.Math.RND.pick(this.receptorVirusData);

        let virus = this.virusGroup.getFirstDead(false) as Phaser.Physics.Arcade.Sprite;

        if (!virus) {
            virus = this.virusGroup.create(randomVirus.x, -50, randomVirus.virus);
        } else {
            virus.setTexture(randomVirus.virus);
            virus.enableBody(true, randomVirus.x, -50, true, true);
            virus.clearTint();
        }

        virus.setScale(0.1);

        const randomSpeed = this.isVaccinated
            ? Phaser.Math.Between(-8, 8)
            : Phaser.Math.Between(-30, 30);

        virus.setVelocityY(this.currentVirusSpeed + randomSpeed);
    }

    update(time: number, delta: number) {
        if (this.isGameOver || this.isWin) return;

        this.elapsedTime += delta;

        const progress = Phaser.Math.Clamp(this.elapsedTime / this.gameTime, 0, 1);

        this.progressBar.clear();
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRoundedRect(
            this.cameras.main.width / 2 - 195,
            25,
            390 * progress,
            20,
            4
        );

        if (progress >= 1) {
            this.triggerWin();
            return;
        }

        const elapsedSeconds = this.elapsedTime / 1000;

        if (this.isVaccinated) {
            this.currentVirusSpeed =
                this.baseVirusSpeedVaccinated +
                Math.floor(elapsedSeconds / 8) * this.speedIncreaseOverTimeVaccinated;
        } else {
            this.currentVirusSpeed =
                this.baseVirusSpeedNonVaccinated +
                Math.floor(elapsedSeconds / 5) * this.speedIncreaseOverTimeNonVaccinated;
        }

        this.handleInput();

        this.virusGroup.children.iterate((child: Phaser.GameObjects.GameObject) => {
            const virus = child as Phaser.Physics.Arcade.Sprite;
            if (virus.active && virus.y > this.cameras.main.height + 50) {
                this.virusGroup.killAndHide(virus);
                virus.body?.stop();
            }
            return true;
        });
    }

    private handleInput() {
        if (this.isChatActive) {
            this.playerCart.setAccelerationX(0);
            return;
        }

        const force = 4000;

        if (this.cursors.left.isDown) {
            this.playerCart.setAccelerationX(-force);
        } else if (this.cursors.right.isDown) {
            this.playerCart.setAccelerationX(force);
        } else {
            this.playerCart.setAccelerationX(0);
        }
    }

    private catchVirus(_cart: any, virus: any) {
        const v = virus as Phaser.Physics.Arcade.Sprite;

        this.virusGroup.killAndHide(v);
        v.body?.stop();

        if (!this.cartFull) {
            this.cartFull = true;
            this.playerCart.setTexture('cart_full');
    }
}

    private triggerGameOver(virusHit: any, receptorHit: any) {
        const virus = virusHit as Phaser.Physics.Arcade.Sprite;
        const receptor = receptorHit as Phaser.Physics.Arcade.Sprite;

        this.physics.world.pause();
        this.isGameOver = true;

        virus.setTint(0xff0000);
        receptor.setTint(0xff0000);

        if (this.spawnEvent) {
            this.spawnEvent.remove(false);
        }

        if (!this.isVaccinated && !this.hasShownQuiz) {
            this.hasShownQuiz = true;

            this.time.delayedCall(800, () => {
                this.infoContainer.setVisible(true);
            });

            return;
        }

        this.createEndScreen('GAME OVER', '#770000');
    }

    private triggerWin() {
    this.isWin = true;
    this.physics.world.pause();

    if (this.spawnEvent) {
        this.spawnEvent.remove(false);
    }

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const windowUi = this.createMenuStyleWindow(cx, cy, 820, 380);

    const title = this.add.text(cx, cy - 90, 'LEVEL COMPLETE!', {
        fontFamily: this.MENU_FONT,
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#00ff88'
    }).setOrigin(0.5);

    // SOLO SE VACCINATO MOSTRA I BOTTONI
    if (this.isVaccinated) {

        const nextBtn = this.createMenuButton(
            cx,
            cy + 20,
            320,
            70,
            'NEXT LEVEL',
            () => {
                window.location.href = '/pages/level2.html';
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

        container.setDepth(120);
        return;
    }

    // SE NON VACCINATO (caso raro)
    this.createEndScreen('YOU WON!', '#00ff88');
}

    private createEndScreen(titleText: string, color: string) {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const windowUi = this.createMenuStyleWindow(cx, cy, 760, 320);

        const title = this.add.text(cx, cy - 35, titleText, {
            fontFamily: this.MENU_FONT,
            fontSize: '48px',
            fontStyle: 'bold',
            color
        }).setOrigin(0.5);

        const playAgainBtn = this.createMenuButton(
            cx,
            cy + 55,
            280,
            72,
            'PLAY AGAIN',
            () => {
                this.hideChatUi();
                this.scene.restart({ vaccinated: false });
            }
        );

        const container = this.add.container(0, 0, [
            ...windowUi.list,
            title,
            playAgainBtn
        ]);

        container.setDepth(120);
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

    private createInfoUI() {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const windowUi = this.createMenuStyleWindow(cx, cy, 980, 540);

        const title = this.add.text(
            cx,
            cy - 145,
            'The virus reached the cell',
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
            "You were not able to stop it in time.\n\nThe virus reached the receptors on the surface of the cell and attached to it.\nThis is the first step of the infection.",
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

        this.infoContainer.setDepth(95);
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

        this.llmContainer.setDepth(100);
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

        this.finalQuizQuestionText = this.add.text(
            cx,
            cy - 85,
            'What do receptors do in this phase?',
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
            'A) They help the virus attach to the cell',
            () => this.handleFinalQuiz(true)
        );

        const answerB = this.createMenuButton(
            cx,
            cy + 95,
            520,
            68,
            'B) They move the cell around',
            () => this.handleFinalQuiz(false)
        );

        const answerC = this.createMenuButton(
            cx,
            cy + 180,
            500,
            68,
            'C) They destroy the virus',
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
            this.finalQuizQuestionText,
            answerA,
            answerB,
            answerC,
            this.finalQuizResultText
        ]);

        this.finalQuizContainer.setDepth(110);
        this.finalQuizContainer.setVisible(false);
    }

    private handleChatSubmit() {
        const userText = this.chatInput.value.trim();

        if (!userText) return;

        this.hideChatUi();
        this.llmTitle.setText('LEARN');

        const lower = userText.toLowerCase();

        let feedback =
            "You lost because the virus reached the receptors on the cell surface and attached to them. " +
            "This attachment is the first step of the infection.";

        if (
            lower.includes('receptor') ||
            lower.includes('cell') ||
            lower.includes('attach') ||
            lower.includes('virus')
        ) {
            feedback =
                "Good reasoning. The key problem is that the virus reached the receptors on the surface of the cell and attached to them. " +
                "When this happens, the infection can begin.";
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
        this.chatUi.style.display = 'none';
        this.isChatActive = false;

        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    render: {
        roundPixels: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [Level1]
};

new Phaser.Game(config);