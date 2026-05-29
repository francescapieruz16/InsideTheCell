import Phaser from 'phaser';

class FinalBoss extends Phaser.Scene {
    private bg!: Phaser.GameObjects.Image;
    private boss!: Phaser.GameObjects.Image;

    private bossFloatingTween?: Phaser.Tweens.Tween;

    private bossBaseScaleX = 1;
    private bossBaseScaleY = 1;
    private bossGrowthLevel = 0;

    private readonly bossGrowthStep = 0.04;
    private readonly bossMaxGrowth = 0.22;

    private abi!: Phaser.GameObjects.Image;
    private dialogueBox!: Phaser.GameObjects.Rectangle;
    private dialogueText!: Phaser.GameObjects.Text;
    private startButton!: Phaser.GameObjects.Container;

    private introActive = true;

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
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.textures.get('final_boss_background').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('boss_normal').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('boss_angry').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('boss_happy').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('ABI_standard').setFilter(Phaser.Textures.FilterMode.NEAREST);

        this.createBackground(width, height);
        this.createBoss(width, height);

        // ABI introduce il gioco finale.
        this.createAbiIntro(width, height);
    }

    private createBackground(width: number, height: number) {
        this.bg = this.add.image(
            width / 2,
            height / 2,
            'final_boss_background'
        );

        this.bg.setOrigin(0.5);
        this.bg.setDepth(0);

        const texture = this.textures
            .get('final_boss_background')
            .getSourceImage() as HTMLImageElement;

        const scaleX = width / texture.width;
        const scaleY = height / texture.height;
        const scale = Math.max(scaleX, scaleY);

        this.bg.setScale(scale);

        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x001b12,
            0.08
        ).setDepth(1);
    }

    private createBoss(width: number, height: number) {
        this.boss = this.add.image(
            width / 2,
            height * 0.47,
            'boss_normal'
        );

        this.boss.setOrigin(0.5);
        this.boss.setDepth(10);

        const bossSize = Math.min(width, height) * 0.34;
        this.boss.setDisplaySize(bossSize, bossSize);

        this.bossBaseScaleX = this.boss.scaleX;
        this.bossBaseScaleY = this.boss.scaleY;
        this.bossGrowthLevel = 0;

        this.startBossFloating();
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

    private createAbiIntro(width: number, height: number) {
        this.introActive = true;

        this.abi = this.add.image(
            width * 0.16,
            height * 0.77,
            'ABI_standard'
        );

        this.abi.setDepth(40);
        this.abi.setDisplaySize(220, 220);

        this.dialogueBox = this.add.rectangle(
            width / 2,
            height * 0.78,
            width * 0.64,
            210,
            0x001b1d,
            0.9
        );

        this.dialogueBox.setDepth(39);
        this.dialogueBox.setStrokeStyle(5, 0x88e6ff, 0.9);

        this.dialogueText = this.add.text(
            width * 0.31,
            height * 0.69,
            `We made it to the final challenge!

Answer the questions correctly to weaken the boss.
If you answer wrong, the boss grows stronger.

Ready? Let's finish this mission!`,
            {
                fontFamily: 'monospace',
                fontSize: '25px',
                color: '#ffffff',
                stroke: '#001020',
                strokeThickness: 5,
                wordWrap: {
                    width: width * 0.50
                },
                lineSpacing: 7
            }
        );

        this.dialogueText.setDepth(41);

        this.startButton = this.createButton(
            width * 0.72,
            height * 0.895,
            340,
            64,
            'Start final game',
            () => {
                this.closeAbiIntro();
            }
        );

        this.startButton.setDepth(42);
    }

    private closeAbiIntro() {
        this.introActive = false;

        if (this.abi) this.abi.destroy();
        if (this.dialogueBox) this.dialogueBox.destroy();
        if (this.dialogueText) this.dialogueText.destroy();
        if (this.startButton) this.startButton.destroy();

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Bottoni temporanei per testare le reazioni.
        // Quando inseriamo il quiz vero, questa riga verrà sostituita dal quiz.
        this.createTestButtons(width, height);
    }

    private getBossCurrentScaleMultiplier() {
        return 1 + Math.min(
            this.bossGrowthLevel * this.bossGrowthStep,
            this.bossMaxGrowth
        );
    }

    private showCorrectAnswerReaction() {
        // Risposta corretta -> boss arrabbiato perché viene colpito.
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
                this.boss.setScale(currentScaleX, currentScaleY);
                this.startBossFloating();
            }
        });

        this.time.delayedCall(850, () => {
            this.switchBossSprite('boss_normal');
            this.boss.setScale(currentScaleX, currentScaleY);
        });
    }

    private showWrongAnswerReaction() {
        // Risposta sbagliata -> boss felice perché diventa più forte.
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
                this.boss.setAngle(0);
                this.boss.setScale(targetScaleX, targetScaleY);
                this.startBossFloating();
            }
        });

        this.time.delayedCall(850, () => {
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

    private createTestButtons(width: number, height: number) {
        const correctButton = this.createButton(
            width / 2 - 190,
            height * 0.84,
            300,
            64,
            'Correct',
            () => {
                this.showCorrectAnswerReaction();
            }
        );

        const wrongButton = this.createButton(
            width / 2 + 190,
            height * 0.84,
            300,
            64,
            'Wrong',
            () => {
                this.showWrongAnswerReaction();
            }
        );

        correctButton.setDepth(20);
        wrongButton.setDepth(20);
    }

    private createButton(
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
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
                fontSize: '26px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        );

        text.setOrigin(0.5);

        container.add([bg, text]);
        container.setDepth(20);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x5276b8, 1);
            container.setScale(1.05);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x3f5f95, 1);
            container.setScale(1);
        });

        bg.on('pointerdown', () => {
            callback();
        });

        return container;
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    },

    parent: 'game-container',

    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                x: 0,
                y: 0
            },
            debug: false
        }
    },

    render: {
        roundPixels: true
    },

    scene: [FinalBoss]
};

new Phaser.Game(config);