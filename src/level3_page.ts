import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';
import { HandTrackingController } from '../src/handTracking/handTrackingController';
import AudioManager from './ExploreZone_scenes/AudioManager';

export class Level3 extends Phaser.Scene {
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

    private floorY = 0;
    private worldScroll = 0;
    private startX = 120;
    private startY = 0;
    private cameraLockX = 0;

    private postGameManager!: PostGameManager;
    private isVaccinated: boolean = false;
    private hasShownQuiz: boolean = false;

    private genomeTimer = 0;
    private genomeReleaseTime = 15000;

    private cameraTarget!: Phaser.GameObjects.Zone;

    constructor() {
        super('Level3');
    }

    init(data: { vaccinated?: boolean; genomeTimer?: number } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.levelCompleted = false;
        this.gameOver = false;

        this.genomeReleaseTime = this.isVaccinated ? 50000 : 30000;
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

        this.load.audio('music_minigame', '/assets/music/minigames_music.mp3');

    }

    create() {
        AudioManager.playMusic(this, 'music_minigame');
        this.game.canvas.style.pointerEvents = 'none';

        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/level3/background_level_3.png';
            bgHTML.style.backgroundSize = 'auto 100%'; 
            bgHTML.style.backgroundRepeat = 'repeat-x'; 
            bgHTML.style.backgroundPosition = '0px 0px'; 
        }

        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
            }

            button {
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
            wrapper.style.display = 'none';
            
            this.scene.pause();
            this.scene.launch('PauseMenuScene', {
                parentScene: this.scene.key
            });
        });

        const worldWidth = 10000;
        const worldHeight = 1080;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        const width = this.cameras.main.width;

        this.moveSpeed = 320;
        this.jumpSpeed = 500;

        this.cameraLockX = width / 2;

        this.floorY = worldHeight - 80;
        this.startY = this.floorY - 120;

        const platformBaseY = this.floorY - 100;

        this.player = this.physics.add.sprite(
            this.startX,
            this.startY,
            'player_idle'
        );

        this.player.setOrigin(0, 0);
        this.player.setScale(0.12);
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
            worldWidth / 2,
            this.floorY,
            worldWidth,
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
            170,
            'virus_start'
        );

        this.virus.setOrigin(0.5, 0.5);
        this.virus.setScale(0.30);
        this.virus.setDepth(100);

        this.genome = this.add.image(
            width / 2,
            400,
            'genome'
        );

        this.genome.setOrigin(0.5, 0.5);
        this.genome.setScale(0.10);
        this.genome.setDepth(100);
        this.genome.setVisible(false);

        this.genomeText = this.add.text(
            width / 2,
            330,
            '',
            {
                fontSize: '28px',
                color: '#ccff66',
                stroke: '#003300',
                strokeThickness: 4
            }
        );

        this.genomeText.setOrigin(0.5);
        this.genomeText.setDepth(100);

        this.addPlatform(300, platformBaseY + 80, 'small_platform', 0.18, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(600, platformBaseY, 'small_platform', 0.18, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(1200, platformBaseY - 80, 'long_platform', 0.45, 0.93, 0.30, 0.03, 0.42);
        this.addPlatform(1750, platformBaseY + 180, 'tall_platform', 0.3, 0.65, 0.85, 0.17, 0.13);
        this.addPlatform(2100, platformBaseY - 70, 'small_platform', 0.17, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(2700, platformBaseY - 160, 'long_platform', 0.45, 0.93, 0.24, 0.03, 0.48);
        this.addPlatform(3200, platformBaseY + 200, 'tall_platform2', 0.37, 0.60, 0.92, 0.20, 0.10);
        this.addPlatform(3500, platformBaseY + 200, 'tall_platform', 0.45, 0.62, 0.90, 0.19, 0.13);
        this.addPlatform(3880, platformBaseY - 60, 'small_platform', 0.19, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(4500, platformBaseY + 2, 'long_platform', 0.45, 0.93, 0.26, 0.03, 0.46);
        this.addPlatform(5050, platformBaseY - 40, 'small_platform', 0.18, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(5350, platformBaseY - 110, 'small_platform', 0.17, 0.80, 0.45, 0.10, 0.32);
        this.addPlatform(6000, platformBaseY - 120, 'long_platform', 0.45, 0.93, 0.24, 0.03, 0.48);
        this.addPlatform(6500, platformBaseY + 270, 'tall_platform2', 0.43, 0.58, 0.95, 0.21, 0.10);
        this.addPlatform(7000, platformBaseY + 80, 'small_platform', 0.20, 0.80, 0.45, 0.10, 0.32);

        this.addSpikes(790, this.floorY + 20, 0.12);
        this.addSpikes(1558, this.floorY + 20, 0.12);
        this.addSpikes(1930, this.floorY + 20, 0.12);
        this.addSpikes(2300, this.floorY + 20, 0.12);
        this.addSpikes(3010, this.floorY + 20, 0.12);
        this.addSpikes(3335, this.floorY + 10, 0.08);
        this.addSpikes(3700, this.floorY + 20, 0.12);
        this.addSpikes(4050, this.floorY + 20, 0.12);
        this.addSpikes(4900, this.floorY + 20, 0.12);
        this.addSpikes(5200, this.floorY + 20, 0.12);
        this.addSpikes(5550, this.floorY + 20, 0.12);
        this.addSpikes(6300, this.floorY + 20, 0.12);
        this.addSpikes(6750, this.floorY + 20, 0.12);
        this.addSpikes(7250, this.floorY + 20, 0.12);

        this.addSpikes(1200, platformBaseY - 124, 0.09);
        this.addSpikes(2700, platformBaseY - 204, 0.09);
        this.addSpikes(6000, platformBaseY - 163, 0.09);

        const finalPlatform = this.addPlatform(
            7700,
            platformBaseY,
            'long_platform',
            0.50,
            0.93,
            0.25,
            0.03,
            0.47
        );

        this.finishFlag = this.physics.add.image(
            finalPlatform.x + 120,
            finalPlatform.y - finalPlatform.displayHeight + 52,
            'finish_flag'
        );

        this.finishFlag.setOrigin(0.5, 1);
        this.finishFlag.setScale(0.12);
        this.finishFlag.setDepth(30);

        this.finishFlag.setData('startX', this.finishFlag.x);

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

        this.cameraTarget = this.add.zone(this.player.x, this.floorY - 420, 1, 1);
        this.cameras.main.startFollow(this.cameraTarget, true, 0.1, 0.1);

        this.cameras.main.setZoom(this.scale.height / worldHeight);

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(3);

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;
            if (!this.physics || !this.physics.world) return;

            this.cameras.main.setZoom(gameSize.height / worldHeight);
        };

        this.scale.on('resize', onResize);

        onResize(this.scale.gameSize);

        this.events.once('shutdown', () => {
            wrapper.remove();
            style.remove();
            this.scale.off('resize', onResize);
            AudioManager.stopMusic(); 
        });

        if(this.input.keyboard){
            this.input.keyboard.on('keydown-ESC', () => {
                wrapper.style.display = 'none';

                this.scene.pause();
                this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
            });
        }

        this.events.on('pause', () => {
            wrapper.style.display = 'none';
        });

        this.events.on('resume', () => {
            wrapper.style.display = 'block';
        });
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

        platform.setData('startX', x);
        platform.setData('bodyWidthPercent', bodyWidthPercent);
        platform.setData('bodyHeightPercent', bodyHeightPercent);
        platform.setData('bodyOffsetXPercent', bodyOffsetXPercent);
        platform.setData('bodyOffsetYPercent', bodyOffsetYPercent);
        platform.setData('isWall', true);

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

        spike.setData('startX', x);

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

        const pulse = 0.30 + Math.sin(this.time.now * 0.008) * 0.005;
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
            scale: 0.25,
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

        const body = this.player.body as Phaser.Physics.Arcade.Body;

        this.player.setVelocity(0, 0);
        body.stop();

        body.enable = false;

        this.time.delayedCall(100, () => {
            this.respawnPlayer();
        });
    }

    private respawnPlayer() {
        this.player.setPosition(this.startX, this.startY);
        this.player.setVelocity(0, 0);
        this.player.setFlipX(false);

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        body.reset(this.startX, this.startY);

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

        // --- LOGICA DI SBLOCCO LIVELLO SUCCESSIVO ---
        const currentMax = parseInt(localStorage.getItem('maxUnlockedLevel') || '1', 10);
        // Sblocca il livello 4 solo se non eravamo già andati oltre
        if (currentMax < 4) {
            localStorage.setItem('maxUnlockedLevel', '4');
        }
        // --------------------------------------------

        this.postGameManager.showWinScreen();
    }

    update(_time: number, delta: number) {
        const view = this.cameras.main.worldView;

        this.virus.setPosition(view.centerX, view.y + 170);
        this.genomeText.setPosition(view.centerX, view.y + 330);

        if (this.genome) {
            this.genome.setX(view.centerX);

            if (!this.gameOver) {
                this.genome.setY(view.y + 400);
            }
        }

        if (!this.gameOver && !this.levelCompleted) {
            this.cameraTarget.x = this.player.x;
        }

        if (this.gameOver || this.levelCompleted) {
            this.player.setVelocityX(0);
            return;
        }

        this.updateVirusTimer(delta);

        const inputMode = this.registry.get('inputMode');

        let leftInput = this.cursors.left?.isDown || false;
        let rightInput = this.cursors.right?.isDown || false;
        let jumpInput = this.cursors.up?.isDown || this.cursors.space?.isDown || false;

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();

            if (tracker.targetX !== -1) {
                if (tracker.targetX < 0.4) {
                    leftInput = true;
                } else if (tracker.targetX > 0.6) {
                    rightInput = true;
                }

                if (tracker.isClicked) {
                    jumpInput = true;
                }
            }
        }

        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

        if (leftInput) {
            this.player.setVelocityX(-this.moveSpeed);
            this.player.setFlipX(true);
            this.player.anims.play('run', true);
        } else if (rightInput) {
            this.player.setVelocityX(this.moveSpeed);
            this.player.setFlipX(false);
            this.player.anims.play('run', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('idle', true);
        }

        if (jumpInput && playerBody.blocked.down) {
            this.player.setVelocityY(-this.jumpSpeed);
        }

        if (!playerBody.blocked.down) {
            this.player.anims.play('jump', true);
        }
    }
}