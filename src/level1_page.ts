import Phaser from 'phaser';
import Cutscene1 from './Cutscenes/Cutscene1';
import { PostGameManager } from './postGame/postGameManager';
import { HandTrackingController } from '../src/handTracking/handTrackingController';
import AudioManager from './ExploreZone_scenes/AudioManager';

export class Level1 extends Phaser.Scene {
    private virusGroup!: Phaser.Physics.Arcade.Group;
    private receptorsGroup!: Phaser.Physics.Arcade.Group;

    private receptorVirusData = [
        { receptor: 'receptor_circle', virus: 'virus_circle', pX: 0.125, pY: 0.88, scale: 0.08},
        { receptor: 'receptor_hexagon', virus: 'virus_hexagon', pX: 0.375, pY: 0.87, scale: 0.09},
        { receptor: 'receptor_square', virus: 'virus_square', pX: 0.625, pY: 0.87, scale: 0.09},
        { receptor: 'receptor_triangle', virus: 'virus_triangle', pX: 0.875, pY: 0.88, scale: 0.08}
    ];

    private playerCart!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private backgroundImage!: Phaser.GameObjects.Image;

    private cartSpeed: number = 800;

    private cartFull: boolean = false;
    private isGameOver: boolean = false;
    private isWin: boolean = false;
    private isVaccinated: boolean = false;
    private hasShownQuiz: boolean = false;
    private isChatActive: boolean = false;

    private progressBar!: Phaser.GameObjects.Rectangle;
    private progressBox!: Phaser.GameObjects.Graphics; 

    private gameTime: number = 30000;
    private elapsedTime: number = 0;

    private spawnEvent!: Phaser.Time.TimerEvent;

    private currentVirusSpeed: number = 260;

    // non vaccinated 
    private nonVaccinatedDelay: number = 800;
    private baseVirusSpeedNonVaccinated: number = 260;
    private speedIncreaseOverTimeNonVaccinated: number = 12;

    // vaccinated
    private vaccinatedDelay: number = 2600;
    private baseVirusSpeedVaccinated: number = 150;
    private speedIncreaseOverTimeVaccinated: number = 2;

    private postGameManager!: PostGameManager;

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

        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png')
        
        this.load.audio('bg_music', '/assets/music/minigames_music.mp3');
        
    }

    create() {

        AudioManager.playMusic(this, 'bg_music');
        this.game.canvas.style.pointerEvents = 'none';
        
        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/level1/background_level1.png';
            bgHTML.style.objectFit = 'fill'; 
        }

        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
                z-index: 990 !important;
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
        const wrapper = document.createElement('div');
        wrapper.className = 'phaser-dom-container';
        wrapper.appendChild(backBtn);
        const backBtnDom = this.add.dom(this.scale.gameSize.width - 80, 40, wrapper);

        backBtn.addEventListener('click', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        this.receptorsGroup = this.physics.add.group();
        this.createReceptors();

        this.virusGroup = this.physics.add.group();

        this.playerCart = this.physics.add.sprite(
            this.cameras.main.width / 2,
            this.cameras.main.height * 0.45,
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

        this.progressBar = this.add.rectangle(
            this.cameras.main.width / 2 - 195, 
            25, 
            390,
            20, 
            0x00ff00
        ).setOrigin(0, 0);

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

        this.postGameManager = new PostGameManager(this);

        this.postGameManager.preparePostGame(
            1
        );

        this.setupGame();

        let previousWidth = this.cameras.main.width;

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;
            if (!this.physics || !this.physics.world) return;

            const newW = gameSize.width;
            const newH = gameSize.height;
            const newCx = newW / 2;

            const scaleXRatio = newW / previousWidth;

            this.physics.world.setBounds(0, 0, newW, newH);

            backBtnDom.setPosition(newW -80, 40);

            this.progressBox.clear();
            this.progressBox.fillStyle(0x2a2a2a, 0.85);
            this.progressBox.fillRoundedRect(newCx - 200, 20, 400, 30, 6);
            this.progressBox.lineStyle(4, 0xffffff, 1);
            this.progressBox.strokeRoundedRect(newCx - 200, 20, 400, 30, 6);

            this.progressBar.setPosition(newCx - 195, 25);

            this.playerCart.setY(newH * 0.60);
            this.playerCart.setX(Phaser.Math.Clamp(this.playerCart.x * scaleXRatio, 0, newW));
            this.playerCart.displayWidth = newW * (this.isVaccinated ? 0.15 : 0.1);
            this.playerCart.scaleY = this.playerCart.scaleX;

            this.virusGroup.getChildren().forEach((child) => {
                const virus = child as Phaser.Physics.Arcade.Sprite;
                if (virus.active) {
                    virus.setX(virus.x * scaleXRatio);
                    virus.displayWidth = newW * 0.07;
                    virus.scaleY = virus.scaleX;
                    virus.refreshBody();
                }
            });

            const receptors = this.receptorsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
            receptors.forEach((receptor, index) => {
                const data = this.receptorVirusData[index];
                receptor.setPosition(newW * data.pX, newH * data.pY);
                receptor.displayWidth = newW * data.scale;
                receptor.scaleY = receptor.scaleX;
                receptor.refreshBody();
            });

            previousWidth = newW;
        };

        this.scale.on('resize', onResize);

        onResize(this.scale.gameSize);
        
        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
        });
    }

    update(time: number, delta: number) {
        if (this.isGameOver || this.isWin) return;

        this.elapsedTime += delta;

        const progress = Phaser.Math.Clamp(this.elapsedTime / this.gameTime, 0, 1);

        this.progressBar.scaleX = progress;

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

    private createReceptors() {
        const screenW = this.cameras.main.width;
        const screenH = this.cameras.main.height;

        this.receptorVirusData.forEach((data) => {
            const x = screenW * data.pX;
            const y = screenH * data.pY;

            const receptor = this.receptorsGroup.create(x, y, data.receptor);
            
            receptor.displayWidth = screenW * data.scale; 
            receptor.scaleY = receptor.scaleX;
            receptor.refreshBody();
        });
    }

    private setupGame() {
        this.cartFull = false;
        this.playerCart.setTexture('cart');
        this.playerCart.clearTint();
        this.playerCart.setVelocity(0, 0);
        this.playerCart.setAcceleration(0, 0);

        const screenW = this.cameras.main.width;
        const screenH = this.cameras.main.height;

        this.playerCart.setPosition(screenW / 2, screenH * 0.60);

        if (this.isVaccinated) {
            this.playerCart.displayWidth = screenW * 0.15;
            this.currentVirusSpeed = this.baseVirusSpeedVaccinated;
        } else {
            this.playerCart.displayWidth = screenW * 0.1;
            this.currentVirusSpeed = this.baseVirusSpeedNonVaccinated;
        }

        this.playerCart.scaleY = this.playerCart.scaleX;

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

        const screenW = this.cameras.main.width;
        const spawnX = screenW * randomVirus.pX;

        if (!virus) {
            virus = this.virusGroup.create(spawnX, -50, randomVirus.virus);
        } else {
            virus.setTexture(randomVirus.virus);
            virus.enableBody(true, spawnX, -50, true, true);
            virus.clearTint();
        }

        virus.displayWidth = screenW * 0.07; 
        virus.scaleY = virus.scaleX;
        virus.refreshBody();

        const randomSpeed = this.isVaccinated
            ? Phaser.Math.Between(-8, 8)
            : Phaser.Math.Between(-30, 30);

        virus.setVelocityY(this.currentVirusSpeed + randomSpeed);
    }

    private handleInput() {
        if (this.isChatActive) {
            this.playerCart.setAccelerationX(0);
            this.playerCart.setVelocityX(0);
            return;
        }

        const inputMode = this.registry.get('inputMode');

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();

            if (tracker.targetX !== -1) {
                const targetPixelX = tracker.targetX * this.cameras.main.width;
                const distanceX = targetPixelX - this.playerCart.x;

                if (Math.abs(distanceX) > 10) { 
                    this.playerCart.setVelocityX(distanceX * 8); 
                } else {
                    this.playerCart.setVelocityX(0);
                }
                this.playerCart.setAccelerationX(0); 
            } else {
                this.playerCart.setAccelerationX(0);
                this.playerCart.setDragX(3000); 
            }

        } else {
            const force = 4000;

            if (this.cursors.left.isDown) {
                this.playerCart.setAccelerationX(-force);
            } else if (this.cursors.right.isDown) {
                this.playerCart.setAccelerationX(force);
            } else {
                this.playerCart.setAccelerationX(0);
                if (Math.abs(this.playerCart.body!.velocity.x) > 0) {
                     this.playerCart.setDragX(3000); 
                }
            }
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

        if (this.isVaccinated) {
            this.postGameManager.showGameOverScreen();
        } else if (!this.hasShownQuiz) {
            this.hasShownQuiz = true;
            this.postGameManager.showLearningPhase();
        }
    }

    private triggerWin() {
        this.isWin = true;
        this.physics.world.pause();

        if (this.spawnEvent) {
            this.spawnEvent.remove(false);
        }

        this.postGameManager.showWinScreen();
    }

}