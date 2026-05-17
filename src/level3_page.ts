import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';

class Level3 extends Phaser.Scene {
    private bg!: Phaser.GameObjects.TileSprite;
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private platforms!: Phaser.Physics.Arcade.Group;
    private spikes!: Phaser.Physics.Arcade.Group;

    private finishFlag!: Phaser.Physics.Arcade.Image;
    private levelCompleted = false;

    private virus!: Phaser.GameObjects.Image;
    private genome!: Phaser.GameObjects.Image;
    private genomeText!: Phaser.GameObjects.Text;

    private gameOver = false;

    private moveSpeed = 220;
    private jumpSpeed = 420;
    private backgroundScrollSpeed = 1;

    private worldScroll = 0;
    private startX = 120;
    private cameraLockX = 0;

    private postGameManager!: PostGameManager;
    private isVaccinated : boolean = false;
    private hasShownQuiz : boolean = false;

    private genomeTimer = 0;
    private genomeReleaseTime = 15000;

    constructor() {
        super('Level3');
    }

    init(data: { vaccinated?: boolean; genomeTimer?: number } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.levelCompleted = false;
        this.gameOver = false;

        this.genomeReleaseTime = this.isVaccinated ? 30000 : 15000;
        this.genomeTimer = data.genomeTimer ?? 0;
        this.worldScroll = 0;
    }

    preload() {
        this.load.image('background_level3', '/assets/level3/background_level_3.png');

        this.load.image('player_idle', '/assets/level3/idle.png');
        this.load.image('player_run', '/assets/level3/run.png');
        this.load.image('player_start_run', '/assets/level3/start_run.png');
        this.load.image('player_start_jump', '/assets/level3/start_jump.png');
        this.load.image('player_landing', '/assets/level3/landing.png');
        this.load.image('player_end', '/assets/level3/end.png');

        this.load.image('small_platform', '/assets/level3/small_platform.png');
        this.load.image('long_platform', '/assets/level3/long_platform.png');
        this.load.image('tall_platform', '/assets/level3/tall_platform.png');
        this.load.image('tall_platform2', '/assets/level3/tall_platform2.png');

        this.load.image('finish_flag', '/assets/level3/flag.png');
        this.load.image('spikes', '/assets/level3/spikes.png');

        this.load.image('virus_start', '/assets/level3/opening_virus_start.png');
        this.load.image('virus_2', '/assets/level3/opening_virus_2.png');
        this.load.image('virus_3', '/assets/level3/opening_virus_3.png');
        this.load.image('virus_4', '/assets/level3/opening_virus_4.png');
        this.load.image('genome', '/assets/level3/genome.png');

        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameraLockX = width / 2;

        const floorY = height - 50;
        const platformBaseY = height - 150;

        this.bg = this.add.tileSprite(
            0,
            0,
            width,
            height,
            'background_level3'
        );

        this.bg.setOrigin(0, 0);
        this.bg.setDepth(0);

        const texture = this.textures
            .get('background_level3')
            .getSourceImage() as HTMLImageElement;

        const bgScale = height / texture.height;
        this.bg.setTileScale(bgScale, bgScale);

        this.player = this.physics.add.sprite(
            this.startX,
            floorY - 70,
            'player_idle'
        );

        this.player.setOrigin(0, 0);
        this.player.setScale(0.08);
        this.player.setDepth(100);
        this.player.setCollideWorldBounds(true);
        this.player.setGravityY(900);

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.anims.create({
            key: 'idle',
            frames: [{ key: 'player_idle' }],
            frameRate: 1,
            repeat: -1
        });

        this.anims.create({
            key: 'run',
            frames: [
                { key: 'player_start_run' },
                { key: 'player_run' }
            ],
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            frames: [{ key: 'player_start_jump' }],
            frameRate: 1,
            repeat: 0
        });

        this.anims.create({
            key: 'landing',
            frames: [{ key: 'player_landing' }],
            frameRate: 1,
            repeat: 0
        });

        const ground = this.add.rectangle(
            width / 2,
            floorY,
            width,
            6
        );

        ground.setOrigin(0.5, 0);

        this.physics.add.existing(ground, true);
        this.physics.add.collider(this.player, ground);

        this.platforms = this.physics.add.group({
            immovable: true,
            allowGravity: false
        });

        this.spikes = this.physics.add.group({
            immovable: true,
            allowGravity: false
        });

        this.virus = this.add.image(
            width / 2,
            90,
            'virus_start'
        );

        this.virus.setOrigin(0.5, 0.5);
        this.virus.setScale(0.14);
        this.virus.setDepth(100);
        this.virus.setScrollFactor(0);

        this.genome = this.add.image(
            width / 2,
            205,
            'genome'
        );

        this.genome.setOrigin(0.5, 0.5);
        this.genome.setScale(0.10);
        this.genome.setDepth(100);
        this.genome.setScrollFactor(0);
        this.genome.setVisible(false);

        this.genomeText = this.add.text(
            width / 2,
            175,
            '',
            {
                fontSize: '18px',
                color: '#ccff66',
                stroke: '#003300',
                strokeThickness: 4
            }
        );

        this.genomeText.setOrigin(0.5);
        this.genomeText.setDepth(100);
        this.genomeText.setScrollFactor(0);

        /**
         * PIATTAFORME
         */
        this.addPlatform(300, platformBaseY + 100, 'small_platform', 0.15, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(550, platformBaseY + 40, 'small_platform', 0.13, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(930, platformBaseY - 40, 'long_platform', 0.28, 0.93, 0.30, 0.03, 0.42);
        this.addPlatform(1250, platformBaseY + 180, 'tall_platform', 0.24, 0.65, 0.85, 0.17, 0.10, true);
        this.addPlatform(1430, platformBaseY - 70, 'small_platform', 0.12, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(1750, platformBaseY - 160, 'long_platform', 0.36, 0.93, 0.24, 0.03, 0.48);
        this.addPlatform(2200, platformBaseY + 250, 'tall_platform2', 0.32, 0.60, 0.92, 0.20, 0.06, true);
        this.addPlatform(2420, platformBaseY + 150, 'tall_platform', 0.22, 0.62, 0.90, 0.19, 0.07, true);
        this.addPlatform(2680, platformBaseY - 60, 'small_platform', 0.14, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(3020, platformBaseY + 2, 'long_platform', 0.30, 0.93, 0.26, 0.03, 0.46);
        this.addPlatform(3400, platformBaseY - 40, 'small_platform', 0.13, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(3600, platformBaseY - 110, 'small_platform', 0.12, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(4020, platformBaseY - 120, 'long_platform', 0.34, 0.93, 0.24, 0.03, 0.48);
        this.addPlatform(4500, platformBaseY + 270, 'tall_platform2', 0.38, 0.58, 0.95, 0.21, 0.04, true);
        this.addPlatform(4820, platformBaseY + 80, 'small_platform', 0.15, 0.80, 0.45, 0.10, 0.32);

        /**
         * SPIKES
         */
        this.addSpikes(720, floorY + 20, 0.10);
        this.addSpikes(1080, floorY + 20, 0.10);
        this.addSpikes(1550, floorY + 20, 0.10);
        this.addSpikes(2040, floorY + 20, 0.10);
        this.addSpikes(2313, floorY + 20, 0.06);
        this.addSpikes(2570, floorY + 20, 0.10);
        this.addSpikes(2850, floorY + 20, 0.10);
        this.addSpikes(3250, floorY + 20, 0.10);
        this.addSpikes(3820, floorY + 20, 0.10);
        this.addSpikes(4300, floorY + 20, 0.10);
        this.addSpikes(4670, floorY + 20, 0.10);
        this.addSpikes(5050, floorY + 20, 0.10);

        this.addSpikes(930, platformBaseY - 40 - 20, 0.08);
        this.addSpikes(1750, platformBaseY - 160 - 20, 0.08);
        this.addSpikes(3020, platformBaseY + 2 - 20, 0.08);
        this.addSpikes(4020, platformBaseY - 120 - 20, 0.08);

        /**
         * PIATTAFORMA FINALE + BANDIERINA
         */
        const finalPlatform = this.addPlatform(
            5200,
            platformBaseY,
            'long_platform',
            0.42,
            0.93,
            0.25,
            0.03,
            0.47
        );

        this.finishFlag = this.physics.add.image(
            finalPlatform.x + 120,
            finalPlatform.y - finalPlatform.displayHeight + 50,
            'finish_flag'
        );

        this.finishFlag.setOrigin(0.5, 1);
        this.finishFlag.setScale(0.12);
        this.finishFlag.setDepth(30);

        const flagBody = this.finishFlag.body as Phaser.Physics.Arcade.Body;

        flagBody.allowGravity = false;
        flagBody.setImmovable(true);
        flagBody.setSize(
            this.finishFlag.width * 0.45,
            this.finishFlag.height * 0.8
        );
        flagBody.setOffset(
            this.finishFlag.width * 0.25,
            this.finishFlag.height * 0.15
        );

        this.physics.add.overlap(
            this.player,
            this.finishFlag,
            () => {
                this.completeLevel();
            },
            undefined,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.spikes,
            () => {
                this.triggerSpikeDeath();
            },
            undefined,
            this
        );

        this.physics.add.collider(this.player, this.platforms);

        this.postGameManager = new PostGameManager(this);
        
        this.postGameManager.preparePostGame(3);
        
    }

    private addPlatform(
        x: number,
        y: number,
        texture: string,
        scale: number,
        bodyWidthPercent = 1,
        bodyHeightPercent = 1,
        bodyOffsetXPercent = 0,
        bodyOffsetYPercent = 0,
        isWall = false
    ) {
        const platform = this.platforms.create(
            x,
            y,
            texture
        ) as Phaser.Physics.Arcade.Image;

        platform.setOrigin(0.5, 1);
        platform.setScale(scale);
        platform.setDepth(5);
        platform.setImmovable(true);

        platform.setData('bodyWidthPercent', bodyWidthPercent);
        platform.setData('bodyHeightPercent', bodyHeightPercent);
        platform.setData('bodyOffsetXPercent', bodyOffsetXPercent);
        platform.setData('bodyOffsetYPercent', bodyOffsetYPercent);
        platform.setData('isWall', isWall);

        this.updatePlatformBody(platform);

        return platform;
    }

    private addSpikes(
        x: number,
        y: number,
        scale = 0.10
    ) {
        const spike = this.spikes.create(
            x,
            y,
            'spikes'
        ) as Phaser.Physics.Arcade.Image;

        spike.setOrigin(0.5, 1);
        spike.setScale(scale);
        spike.setDepth(25);
        spike.setImmovable(true);

        const body = spike.body as Phaser.Physics.Arcade.Body;

        body.allowGravity = false;
        body.setImmovable(true);
        body.updateFromGameObject();

        body.setSize(
            spike.width * 0.90,
            spike.height * 0.55
        );

        body.setOffset(
            spike.width * 0.05,
            spike.height * 0.35
        );

        return spike;
    }

    private updatePlatformBody(platform: Phaser.Physics.Arcade.Image) {
        const body = platform.body as Phaser.Physics.Arcade.Body;

        const bodyWidthPercent = platform.getData('bodyWidthPercent') as number;
        const bodyHeightPercent = platform.getData('bodyHeightPercent') as number;
        const bodyOffsetXPercent = platform.getData('bodyOffsetXPercent') as number;
        const bodyOffsetYPercent = platform.getData('bodyOffsetYPercent') as number;

        body.allowGravity = false;
        body.setImmovable(true);
        body.setVelocity(0, 0);

        body.updateFromGameObject();

        body.setSize(
            platform.width * bodyWidthPercent,
            platform.height * bodyHeightPercent
        );

        body.setOffset(
            platform.width * bodyOffsetXPercent,
            platform.height * bodyOffsetYPercent
        );
    }

    private movePlatforms(amount: number) {
        this.platforms.children.iterate((child) => {
            const platform = child as Phaser.Physics.Arcade.Image;

            platform.x += amount;
            this.updatePlatformBody(platform);

            return true;
        });

        this.spikes.children.iterate((child) => {
            const spike = child as Phaser.Physics.Arcade.Image;

            spike.x += amount;

            const body = spike.body as Phaser.Physics.Arcade.Body;
            body.updateFromGameObject();

            return true;
        });

        if (this.finishFlag) {
            this.finishFlag.x += amount;

            const flagBody = this.finishFlag.body as Phaser.Physics.Arcade.Body;
            flagBody.updateFromGameObject();
        }
    }

    private canMovePlatforms(amount: number) {
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

        const playerLeft = playerBody.x;
        const playerRight = playerBody.x + playerBody.width;
        const playerTop = playerBody.y;
        const playerBottom = playerBody.y + playerBody.height;

        let canMove = true;

        this.platforms.children.iterate((child) => {
            const platform = child as Phaser.Physics.Arcade.Image;

            if (!platform.getData('isWall')) {
                return true;
            }

            const body = platform.body as Phaser.Physics.Arcade.Body;

            const nextLeft = body.x + amount;
            const nextRight = body.x + body.width + amount;
            const nextTop = body.y;
            const nextBottom = body.y + body.height;

            const overlapY =
                playerBottom > nextTop &&
                playerTop < nextBottom;

            const overlapX =
                playerRight > nextLeft &&
                playerLeft < nextRight;

            if (overlapX && overlapY) {
                canMove = false;
            }

            return true;
        });

        return canMove;
    }

    private updateVirusTimer(delta: number) {
        if (this.levelCompleted || this.gameOver) {
            return;
        }

        this.genomeTimer += delta;

        const progress = Phaser.Math.Clamp(
            this.genomeTimer / this.genomeReleaseTime,
            0,
            1
        );

        const remainingSeconds = Math.ceil(
            (this.genomeReleaseTime - this.genomeTimer) / 1000
        );

        this.genomeText.setText(`Genoma releasing in: ${remainingSeconds}s`);

        if (progress < 0.25) {
            this.virus.setTexture('virus_start');
        } else if (progress < 0.50) {
            this.virus.setTexture('virus_2');
        } else if (progress < 0.75) {
            this.virus.setTexture('virus_3');
        } else {
            this.virus.setTexture('virus_4');
        }

        const pulse = 0.14 + Math.sin(this.time.now * 0.008) * 0.005;
        this.virus.setScale(pulse + progress * 0.025);

        if (progress >= 1) {
            this.releaseGenome();
        }
    }

    private releaseGenome() {
        if (this.gameOver || this.levelCompleted) {
            return;
        }

        this.gameOver = true;

        this.player.setVelocityX(0);
        this.player.setVelocityY(0);

        this.virus.setTexture('virus_4');
        this.genome.setVisible(true);

        this.tweens.add({
            targets: this.genome,
            y: this.genome.y + 45,
            alpha: 0.65,
            scale: 0.13,
            duration: 900,
            yoyo: true,
            repeat: -1
        });

        if (this.isVaccinated) {
            this.postGameManager.showGameOverScreen();
        } else if (!this.hasShownQuiz) {
            this.hasShownQuiz = true;
            this.postGameManager.showLearningPhase();
        }
    }

    private triggerSpikeDeath() {
        if (this.gameOver || this.levelCompleted) {
            return;
        }

        this.gameOver = true;

        this.player.setVelocityX(0);
        this.player.setVelocityY(0);

        this.time.delayedCall(50, () => {
            this.respawnPlayer();
        });
    }

    private respawnPlayer() {
        const height = this.cameras.main.height;
        const floorY = height - 50;

        const spawnX = this.startX;
        const spawnY = floorY - 70;

        // Riporta piattaforme, spike e bandiera alla posizione iniziale
        if (this.worldScroll !== 0) {
            this.movePlatforms(this.worldScroll + 140);
        }

        // Reset dello scroll
        this.worldScroll = 0;
        this.bg.tilePositionX = 0;

        const body = this.player.body as Phaser.Physics.Arcade.Body;

        // Reset completo del giocatore
        body.enable = true;
        body.stop();

        this.player.setVelocity(0, 0);
        this.player.setAcceleration(0, 0);
        this.player.setPosition(spawnX, spawnY);
        this.player.setFlipX(false);
        this.player.anims.play('idle', true);

        body.reset(spawnX, spawnY);
        body.updateFromGameObject();

        this.gameOver = false;
    }

    private completeLevel() {
        if (this.levelCompleted || this.gameOver) {
            return;
        }

        this.levelCompleted = true;

        this.player.setVelocityX(0);
        this.player.setVelocityY(0);
        this.player.anims.play('idle', true);

        this.postGameManager.showWinScreen();
    }

    update(_time: number, delta: number) {
        if (this.gameOver) {
            this.player.setVelocityX(0);
            return;
        }

        if (this.levelCompleted) {
            this.player.setVelocityX(0);
            return;
        }

        this.updateVirusTimer(delta);

        const leftPressed = this.cursors.left?.isDown;
        const rightPressed = this.cursors.right?.isDown;
        const jumpPressed = this.cursors.up?.isDown || this.cursors.space?.isDown;

        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

        const dt = delta / 1000;
        const scrollSpeed = this.backgroundScrollSpeed * this.moveSpeed;
        const centerTolerance = 20;

        let direction = 0;

        if (leftPressed) {
            direction = -1;
        } else if (rightPressed) {
            direction = 1;
        }

        this.player.setVelocityX(0);

        if (direction !== 0) {
            this.player.setFlipX(direction < 0);
        }

        if (jumpPressed && playerBody.blocked.down) {
            this.player.setVelocityY(-this.jumpSpeed);
        }

        if (direction > 0) {
            if (this.player.x < this.cameraLockX) {
                this.player.setVelocityX(this.moveSpeed);
            } else {
                const scrollAmount = scrollSpeed * dt;
                const platformMoveAmount = -scrollAmount;

                if (this.canMovePlatforms(platformMoveAmount)) {
                    this.worldScroll += scrollAmount;
                    this.bg.tilePositionX = this.worldScroll;

                    this.movePlatforms(platformMoveAmount);

                    this.player.x = this.cameraLockX;
                    playerBody.setVelocityX(0);
                } else {
                    this.player.x = this.cameraLockX;
                    playerBody.setVelocityX(0);
                }
            }
        }

        if (direction < 0) {
            if (this.worldScroll > 0 && this.player.x >= this.cameraLockX - centerTolerance) {
                let scrollAmount = scrollSpeed * dt;

                if (this.worldScroll - scrollAmount < 0) {
                    scrollAmount = this.worldScroll;
                }

                const platformMoveAmount = scrollAmount;

                if (this.canMovePlatforms(platformMoveAmount)) {
                    this.worldScroll -= scrollAmount;
                    this.bg.tilePositionX = this.worldScroll;

                    this.movePlatforms(platformMoveAmount);

                    this.player.x = this.cameraLockX;
                    playerBody.setVelocityX(0);
                } else {
                    this.player.x = this.cameraLockX;
                    playerBody.setVelocityX(0);
                }
            } else {
                this.player.setVelocityX(-this.moveSpeed);
            }
        }

        if (this.worldScroll <= 0 && this.player.x < this.startX) {
            this.player.x = this.startX;
            playerBody.setVelocityX(0);
        }

        if (!playerBody.blocked.down) {
            this.player.anims.play('jump', true);
        } else if (direction !== 0) {
            this.player.anims.play('run', true);
        } else {
            this.player.anims.play('idle', true);
        }
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight,
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

    scene: [Level3]
};

new Phaser.Game(config);