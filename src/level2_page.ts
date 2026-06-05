import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';
import { HandTrackingController } from '../src/handTracking/handTrackingController';

export class Level2 extends Phaser.Scene {
    private readonly MENU_FONT = 'Arial';

    private paths: Phaser.Curves.Path[] = [];
    private crosshair!: Phaser.GameObjects.Image;
    private viruses!: Phaser.GameObjects.Group;

    private backgroundImage!: Phaser.GameObjects.Image;

    private score: number = 0;
    private targetScore: number = 20;
    private scoreText!: Phaser.GameObjects.Text;
    private escapedText!: Phaser.GameObjects.Text;
    private scorePanel!: Phaser.GameObjects.Container;

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

    private virusDurationNonVaccinated: number = 3300;
    private virusDurationVaccinated: number = 7000;

    private spawnEvent!: Phaser.Time.TimerEvent;
    private postGameManager!: PostGameManager;
    

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
        this.load.image('background_level_2', '/assets/level2/background_level_2.png');
        this.load.image('crosshair', '/assets/level2/crosshair.png');
        this.load.image('explosion', '/assets/level2/explosion.png');

        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png');

        this.virusKeys.forEach(key => {
            this.load.image(key, `/assets/level1/${key}.png`);
        });
    }

    create() {
        this.game.canvas.style.pointerEvents = 'auto';
        this.game.canvas.style.position = 'relative';
        this.game.canvas.style.zIndex = '999';

        this.registry.set('hideGlobalCursor', true);

        if (this.game.domContainer) {
            this.game.domContainer.style.zIndex = '9999';
            this.game.domContainer.style.pointerEvents = 'none';
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/level2/background_level_2.png';
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
        const wrapper = document.createElement('div');
        wrapper.className = 'phaser-dom-container';
        wrapper.appendChild(backBtn);
        const backBtnDom = this.add.dom(this.scale.gameSize.width - 80, 40, wrapper);


        backBtn.addEventListener('click', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        this.viruses = this.add.group();

        this.maxEscapedViruses = this.isVaccinated
            ? this.maxBreachesVaccinated
            : this.maxBreachesNonVaccinated;

        this.createPaths(width, height);

        this.createScoreUI();
        this.createCrosshair();

        const spawnDelay = this.isVaccinated
            ? this.spawnDelayVaccinated
            : this.spawnDelayNonVaccinated;

        this.spawnEvent = this.time.addEvent({
            delay: spawnDelay,
            loop: true,
            callback: () => this.spawnVirus()
        });

        this.time.addEvent({
            delay: spawnDelay,
            loop: true,
            callback: () => this.spawnVirus()
        });

        this.postGameManager = new PostGameManager(this);
        
        this.postGameManager.preparePostGame(
            2
        );

        let previousWidth = width;
        let previousHeight = height;

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;
            if (!this.physics || !this.physics.world) return;

            const newW = gameSize.width;
            const newH = gameSize.height;

            backBtnDom.setPosition(newW - 80, 40);

            if (this.scorePanel) {
                const diffX = newW - previousWidth;
                this.scorePanel.x += diffX;
            }

            this.createPaths(newW, newH);

            this.tweens.killAll();

            if (this.viruses) {
                this.viruses.clear(true, true);
            }

            if (this.scoreText) {
                this.scoreText.setScale(1);
            }

            previousWidth = newW;
            previousHeight = newH;
        };

        this.scale.on('resize', onResize);

        onResize(this.scale.gameSize);

        this.events.once('shutdown', () => {
            this.registry.set('hideGlobalCursor', false);
            this.scale.off('resize', onResize);
        });
    }

    update(time: number, delta: number) {
        if (this.isGameOver || this.isWin || this.isChatActive) return;

        const inputMode = this.registry.get('inputMode');

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();

            if (tracker.targetX !== -1) {
                const screenX = tracker.targetX * this.cameras.main.width;
                const screenY = tracker.targetY * this.cameras.main.height;

                const distToBackBtn = Phaser.Math.Distance.Between(screenX, screenY, 80, 40);

                // cursor near back button -> show hand cursor
                if (distToBackBtn < 150) {
                    this.registry.set('hideGlobalCursor', false);
                    this.crosshair.setVisible(false);  
                //curson in game -> show crosshair   
                } else {
                    
                    this.registry.set('hideGlobalCursor', true);
                    this.crosshair.setVisible(true);
                    this.crosshair.setPosition(screenX, screenY);

                    this.shootVirus(screenX, screenY);
                }
            } else {
                this.crosshair.setVisible(false);
            }
        }
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

        this.scorePanel = this.add.container(0, 0, [
            panelBg,
            title,
            this.scoreText,
            this.escapedText
        ]);
        this.scorePanel.setDepth(300);
    }

    private createCrosshair() {
        this.input.setDefaultCursor('none');

        this.crosshair = this.add.image(0, 0, 'crosshair');
        this.crosshair.setDisplaySize(68, 68);
        this.crosshair.setDepth(400);

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isGameOver || this.isWin || this.isChatActive) return;
            if (this.registry.get('inputMode') === 'hand') return;
            this.crosshair.setPosition(pointer.x, pointer.y);
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isGameOver || this.isWin || this.isChatActive) return;
            if (this.registry.get('inputMode') === 'hand') return;
            this.crosshair.setPosition(pointer.x, pointer.y);
            this.shootVirus(pointer.x, pointer.y);
        });
    }

    private shootVirus(x: number, y: number) {
        const virusList = this.viruses.getChildren() as Phaser.GameObjects.Sprite[];

        for (const virus of virusList) {
            const distance = Phaser.Math.Distance.Between(x, y, virus.x, virus.y);

            if (distance < 35 ) {
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

        if (this.spawnEvent) {
            this.spawnEvent.remove(false);
        }

        this.viruses.clear(true, true);

        this.crosshair.setVisible(false);
        this.input.setDefaultCursor('default');

        this.registry.set('hideGlobalCursor', false);

        if (this.isVaccinated) {
            this.postGameManager.showGameOverScreen();
        } else if (!this.hasShownQuiz) {
            this.hasShownQuiz = true;
            this.postGameManager.showLearningPhase();
        }
    }

    private triggerWin() {
        this.isWin = true;

        if (this.spawnEvent) {
            this.spawnEvent.remove(false);
        }
        
        this.viruses.clear(true, true);

        this.crosshair.setVisible(false);
        this.input.setDefaultCursor('default');

        this.registry.set('hideGlobalCursor', false);

        this.postGameManager.showWinScreen();
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
        virus.setDisplaySize(55, 55);
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
}