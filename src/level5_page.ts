import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';

class Level5 extends Phaser.Scene {
    private bg!: Phaser.GameObjects.Image;

    private leftFlipper!: Phaser.GameObjects.Image;
    private rightFlipper!: Phaser.GameObjects.Image;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;

    private components!: Phaser.Physics.Arcade.Group;

    private assemblyText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;

    private assemblyProgress = 0;
    private timeRemaining = 0;
    private gameEnded = false;

    private postGameManager!: PostGameManager;

    private isVaccinated: boolean = false;
    private hasShownQuiz: boolean = false;

    private leftRestAngle = 18;
    private leftActiveAngle = -28;

    private rightRestAngle = -18;
    private rightActiveAngle = 28;

    private leftFlipperActive = false;
    private rightFlipperActive = false;

    private leftFlipperCooldown = false;
    private rightFlipperCooldown = false;

    private readonly flipperActiveTime = 180;
    private readonly flipperCooldownTime = 260;

    private readonly flipperScale = 0.16;

    private readonly flipperHitboxWidth = 260;
    private readonly flipperHitboxHeight = 30;

    private readonly leftFlipperHitboxOffsetX = 170;
    private readonly rightFlipperHitboxOffsetX = -170;
    private readonly flipperHitboxOffsetY = 0;

    private readonly flipperKnobRadius = 40;

    private readonly leftFlipperKnobOffsetX = 0;
    private readonly rightFlipperKnobOffsetX = 0;
    private readonly flipperKnobOffsetY = 0;

    private componentKeys = [
        'component_rna',
        'component_capsid',
        'component_spike',
        'component_enzyme',
        'component_membrane'
    ];

    constructor() {
        super('Level5');
    }

    init(data: { vaccinated?: boolean } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.assemblyProgress = 0;
        this.gameEnded = false;

        this.leftFlipperActive = false;
        this.rightFlipperActive = false;
        this.leftFlipperCooldown = false;
        this.rightFlipperCooldown = false;

        this.timeRemaining = this.isVaccinated ? 35 : 45;
    }

    preload() {
        this.load.image(
            'background_level5',
            '/assets/level5/background_level_5.png'
        );

        this.load.image(
            'flipper_left',
            '/assets/level5/flipper_left.png'
        );

        this.load.image(
            'flipper_right',
            '/assets/level5/flipper_right.png'
        );

        this.load.image(
            'component_rna',
            '/assets/level5/component_rna.png'
        );

        this.load.image(
            'component_capsid',
            '/assets/level5/component_capsid.png'
        );

        this.load.image(
            'component_spike',
            '/assets/level5/component_spike.png'
        );

        this.load.image(
            'component_enzyme',
            '/assets/level5/component_enzyme.png'
        );

        this.load.image(
            'component_membrane',
            '/assets/level5/component_membrane.png'
        );

        this.load.image(
            'ABI_standard',
            '/assets/tutorial/ABI/ABI_standard.png'
        );
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.createBackground(width, height);
        this.createFlippers(width, height);
        this.createControls();
        this.createComponents();
        this.createUi(width);
        this.startComponentSpawner(width);
        this.startTimer();

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(5);
    }

    private createBackground(width: number, height: number) {
        this.bg = this.add.image(
            width / 2,
            height / 2,
            'background_level5'
        );

        this.bg.setOrigin(0.5);
        this.bg.setDepth(0);

        const texture = this.textures
            .get('background_level5')
            .getSourceImage() as HTMLImageElement;

        const scaleX = width / texture.width;
        const scaleY = height / texture.height;
        const scale = Math.max(scaleX, scaleY);

        this.bg.setScale(scale);
    }

    private createFlippers(width: number, height: number) {
        const centerX = width / 2;
        const flipperY = height * 0.84;

        this.leftFlipper = this.add.image(
            centerX - 300,
            flipperY,
            'flipper_left'
        );

        this.leftFlipper.setOrigin(0.18, 0.5);
        this.leftFlipper.setDepth(20);
        this.leftFlipper.setScale(this.flipperScale);
        this.leftFlipper.setAngle(this.leftRestAngle);

        this.rightFlipper = this.add.image(
            centerX + 300,
            flipperY,
            'flipper_right'
        );

        this.rightFlipper.setOrigin(0.82, 0.5);
        this.rightFlipper.setDepth(20);
        this.rightFlipper.setScale(this.flipperScale);
        this.rightFlipper.setAngle(this.rightRestAngle);
    }

    private createControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();

        this.keyA = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.A
        );

        this.keyD = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.D
        );
    }

    private createComponents() {
        this.components = this.physics.add.group({
            allowGravity: false
        });
    }

    private createUi(width: number) {
        const leftBg = this.add.rectangle(
            185,
            50,
            310,
            60,
            0x12001f,
            0.72
        );

        leftBg.setDepth(50);

        this.assemblyText = this.add.text(
            40,
            25,
            'ASSEMBLY: 0%',
            {
                fontSize: '32px',
                color: '#ffcc66',
                stroke: '#000000',
                strokeThickness: 6,
                fontFamily: 'monospace'
            }
        );

        this.assemblyText.setDepth(51);

        const rightBg = this.add.rectangle(
            width - 150,
            50,
            230,
            60,
            0x12001f,
            0.72
        );

        rightBg.setDepth(50);

        this.timerText = this.add.text(
            width - 40,
            25,
            `TIME: ${this.timeRemaining}`,
            {
                fontSize: '32px',
                color: '#66ffcc',
                stroke: '#000000',
                strokeThickness: 6,
                fontFamily: 'monospace'
            }
        );

        this.timerText.setOrigin(1, 0);
        this.timerText.setDepth(51);
    }

    private startComponentSpawner(width: number) {
        const spawnDelay = this.isVaccinated ? 800 : 120;

        this.time.addEvent({
            delay: spawnDelay,
            loop: true,
            callback: () => {
                if (this.gameEnded) {
                    return;
                }

                this.spawnComponent(width);
            }
        });
    }

    private startTimer() {
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (this.gameEnded) {
                    return;
                }

                this.timeRemaining--;

                this.timerText.setText(`TIME: ${this.timeRemaining}`);

                if (this.timeRemaining <= 0) {
                    if (this.isVaccinated) {
                        this.completeLevel();
                    } else {
                        this.loseGame();
                    }
                }
            }
        });
    }

    private spawnComponent(width: number) {
        const height = this.cameras.main.height;

        const randomKey = Phaser.Utils.Array.GetRandom(this.componentKeys);

        const targetIsLeft = Phaser.Math.Between(0, 1) === 0;

        const targetFlipper = targetIsLeft
            ? this.leftFlipper
            : this.rightFlipper;

        const targetOffsetX = targetIsLeft
            ? this.leftFlipperHitboxOffsetX
            : this.rightFlipperHitboxOffsetX;

        const hitboxCenter = this.getHitboxCenter(
            targetFlipper,
            targetOffsetX
        );

        const targetRange = this.isVaccinated ? 70 : 55;

        const targetX = Phaser.Math.Between(
            hitboxCenter.x - targetRange,
            hitboxCenter.x + targetRange
        );

        const targetY = hitboxCenter.y - 10;

        const spawnSide = Phaser.Utils.Array.GetRandom([
            'top',
            'left',
            'right'
        ]);

        let x = 0;
        let y = 0;

        if (spawnSide === 'top') {
            x = Phaser.Math.Clamp(
                targetX + Phaser.Math.Between(-120, 120),
                100,
                width - 100
            );

            y = -80;
        }

        if (spawnSide === 'left') {
            x = -80;

            y = Phaser.Math.Clamp(
                targetY + Phaser.Math.Between(-260, -80),
                80,
                height - 220
            );
        }

        if (spawnSide === 'right') {
            x = width + 80;

            y = Phaser.Math.Clamp(
                targetY + Phaser.Math.Between(-260, -80),
                80,
                height - 220
            );
        }

        const component = this.components.create(
            x,
            y,
            randomKey
        ) as Phaser.Physics.Arcade.Image;

        component.setOrigin(0.5);
        component.setDepth(15);
        component.setScale(0.07);
        component.setData('hit', false);
        component.setData('missed', false);

        const body = component.body as Phaser.Physics.Arcade.Body;

        body.allowGravity = false;
        body.setCollideWorldBounds(false);

        body.setSize(
            component.width * 0.50,
            component.height * 0.50
        );

        body.setOffset(
            component.width * 0.25,
            component.height * 0.25
        );

        const speed = this.isVaccinated
            ? Phaser.Math.Between(170, 220)
            : Phaser.Math.Between(330, 430);

        const angle = Phaser.Math.Angle.Between(
            x,
            y,
            targetX,
            targetY
        );

        component.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        component.setAngularVelocity(0);
    }

    private updateFlippers() {
        const leftJustPressed =
            (this.cursors.left &&
                Phaser.Input.Keyboard.JustDown(this.cursors.left)) ||
            Phaser.Input.Keyboard.JustDown(this.keyA);

        const rightJustPressed =
            (this.cursors.right &&
                Phaser.Input.Keyboard.JustDown(this.cursors.right)) ||
            Phaser.Input.Keyboard.JustDown(this.keyD);

        if (leftJustPressed && !this.leftFlipperCooldown) {
            this.activateLeftFlipper();
        }

        if (rightJustPressed && !this.rightFlipperCooldown) {
            this.activateRightFlipper();
        }

        const rotateSpeed = 0.35;

        const targetLeftAngle = this.leftFlipperActive
            ? this.leftActiveAngle
            : this.leftRestAngle;

        const targetRightAngle = this.rightFlipperActive
            ? this.rightActiveAngle
            : this.rightRestAngle;

        this.leftFlipper.angle = Phaser.Math.Linear(
            this.leftFlipper.angle,
            targetLeftAngle,
            rotateSpeed
        );

        this.rightFlipper.angle = Phaser.Math.Linear(
            this.rightFlipper.angle,
            targetRightAngle,
            rotateSpeed
        );
    }

    private activateLeftFlipper() {
        this.leftFlipperActive = true;
        this.leftFlipperCooldown = true;

        this.time.delayedCall(this.flipperActiveTime, () => {
            this.leftFlipperActive = false;
        });

        this.time.delayedCall(this.flipperCooldownTime, () => {
            this.leftFlipperCooldown = false;
        });
    }

    private activateRightFlipper() {
        this.rightFlipperActive = true;
        this.rightFlipperCooldown = true;

        this.time.delayedCall(this.flipperActiveTime, () => {
            this.rightFlipperActive = false;
        });

        this.time.delayedCall(this.flipperCooldownTime, () => {
            this.rightFlipperCooldown = false;
        });
    }

    private checkComponentsAgainstFlippers() {
        const leftPressed = this.leftFlipperActive;
        const rightPressed = this.rightFlipperActive;

        const children = this.components.getChildren();

        children.forEach((child) => {
            const component = child as Phaser.Physics.Arcade.Image;

            if (!component.active) {
                return;
            }

            if (component.getData('hit')) {
                return;
            }

            const hitsLeftFlipper =
                this.isPointInsideRotatedRectangle(
                    component.x,
                    component.y,
                    this.leftFlipper,
                    this.leftFlipperHitboxOffsetX
                ) ||
                this.isPointInsideFlipperKnob(
                    component.x,
                    component.y,
                    this.leftFlipper,
                    this.leftFlipperKnobOffsetX
                );

            const hitsRightFlipper =
                this.isPointInsideRotatedRectangle(
                    component.x,
                    component.y,
                    this.rightFlipper,
                    this.rightFlipperHitboxOffsetX
                ) ||
                this.isPointInsideFlipperKnob(
                    component.x,
                    component.y,
                    this.rightFlipper,
                    this.rightFlipperKnobOffsetX
                );

            if (leftPressed && hitsLeftFlipper) {
                this.bounceComponent(component, 'left');
                return;
            }

            if (rightPressed && hitsRightFlipper) {
                this.bounceComponent(component, 'right');
                return;
            }
        });
    }

    private getHitboxCenter(
        flipper: Phaser.GameObjects.Image,
        offsetX: number
    ) {
        const angleRad = Phaser.Math.DegToRad(flipper.angle);

        const centerX =
            flipper.x +
            Math.cos(angleRad) * offsetX -
            Math.sin(angleRad) * this.flipperHitboxOffsetY;

        const centerY =
            flipper.y +
            Math.sin(angleRad) * offsetX +
            Math.cos(angleRad) * this.flipperHitboxOffsetY;

        return new Phaser.Math.Vector2(centerX, centerY);
    }

    private isPointInsideRotatedRectangle(
        pointX: number,
        pointY: number,
        flipper: Phaser.GameObjects.Image,
        offsetX: number
    ) {
        const angleRad = Phaser.Math.DegToRad(flipper.angle);
        const center = this.getHitboxCenter(flipper, offsetX);

        const dx = pointX - center.x;
        const dy = pointY - center.y;

        const localX =
            Math.cos(-angleRad) * dx -
            Math.sin(-angleRad) * dy;

        const localY =
            Math.sin(-angleRad) * dx +
            Math.cos(-angleRad) * dy;

        return (
            Math.abs(localX) <= this.flipperHitboxWidth / 2 &&
            Math.abs(localY) <= this.flipperHitboxHeight / 2
        );
    }

    private isPointInsideFlipperKnob(
        pointX: number,
        pointY: number,
        flipper: Phaser.GameObjects.Image,
        offsetX: number
    ) {
        const angleRad = Phaser.Math.DegToRad(flipper.angle);

        const knobX =
            flipper.x +
            Math.cos(angleRad) * offsetX -
            Math.sin(angleRad) * this.flipperKnobOffsetY;

        const knobY =
            flipper.y +
            Math.sin(angleRad) * offsetX +
            Math.cos(angleRad) * this.flipperKnobOffsetY;

        const distance = Phaser.Math.Distance.Between(
            pointX,
            pointY,
            knobX,
            knobY
        );

        return distance <= this.flipperKnobRadius;
    }

    private bounceComponent(
        component: Phaser.Physics.Arcade.Image,
        side: 'left' | 'right'
    ) {
        if (!component.active) {
            return;
        }

        if (component.getData('hit')) {
            return;
        }

        component.setData('hit', true);

        const body = component.body as Phaser.Physics.Arcade.Body;

        body.enable = false;

        const flyDirection = side === 'left' ? 1 : -1;

        const targetX = component.x + flyDirection * 900;
        const targetY = component.y - 700;

        component.setAngularVelocity(0);

        this.tweens.add({
            targets: component,
            x: targetX,
            y: targetY,
            angle: component.angle + flyDirection * 520,
            scaleX: component.scaleX * 1.15,
            scaleY: component.scaleY * 1.15,
            duration: 900,
            ease: 'Power2',
            onComplete: () => {
                if (component.active) {
                    component.destroy();
                }
            }
        });
    }

    private increaseAssembly() {
        if (this.gameEnded) {
            return;
        }

        const damage = this.isVaccinated ? 15 : 35;

        this.assemblyProgress += damage;

        if (this.assemblyProgress > 100) {
            this.assemblyProgress = 100;
        }

        this.assemblyText.setText(`ASSEMBLY: ${this.assemblyProgress}%`);

        this.cameras.main.shake(180, 0.006);

        if (this.assemblyProgress >= 100) {
            this.loseGame();
        }
    }

    private cleanComponents() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const children = this.components.getChildren();

        children.forEach((child) => {
            const component = child as Phaser.Physics.Arcade.Image;

            if (!component.active) {
                return;
            }

            if (
                !component.getData('hit') &&
                !component.getData('missed') &&
                component.y > height + 40
            ) {
                component.setData('missed', true);
                this.increaseAssembly();
                component.destroy();
                return;
            }

            if (
                component.x < -250 ||
                component.x > width + 250 ||
                component.y < -250 ||
                component.y > height + 250
            ) {
                component.destroy();
            }
        });
    }

    private completeLevel() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;

        this.components.clear(true, true);

        this.postGameManager.showWinScreen();
    }

    private loseGame() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;

        this.components.clear(true, true);

        this.time.delayedCall(400, () => {
            if (this.isVaccinated) {
                this.postGameManager.showGameOverScreen();
            } else if (!this.hasShownQuiz) {
                this.hasShownQuiz = true;
                this.postGameManager.showLearningPhase();
            }
        });
    }

    update() {
        if (this.gameEnded) {
            return;
        }

        this.updateFlippers();
        this.checkComponentsAgainstFlippers();
        this.cleanComponents();
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

    scene: [Level5]
};

new Phaser.Game(config);