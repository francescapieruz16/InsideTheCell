import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';
import { HandTrackingController } from '../src/handTracking/handTrackingController';

type ComponentLevel = {
    key: string;
    size: number;
    mergeValue: number;
};

export class Level5 extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private keySpace!: Phaser.Input.Keyboard.Key;

    private currentPreview: Phaser.GameObjects.Image | null = null;
    private currentPreviewLevel = 0;

    private activeComponents = new Set<Phaser.Physics.Matter.Image>();

    private postGameManager!: PostGameManager;

    private isVaccinated = false;
    private hasShownQuiz = false;
    private hasStartedPlaying = false;
    private gameEnded = false;

    private assemblyProgress = 0;

    private score = 0;
    private highestMergedLevel = 0;

    private nextPreviewLevel = 0;
    private hasNextPreview = false;

    private containerLeft = 0;
    private containerRight = 0;
    private containerTop = 0;
    private containerBottom = 0;
    private redLineY = 0;

    private dropX = 0;
    private dropY = 0;

    private canDrop = true;

    private levelStartTime = 0;

    private lastVaccinatedMergeAssistCheck = 0;

    private readonly wallThickness = 38;

    private readonly initialComponentCount = 200;
    private readonly vaccinatedFinalLevel = 4;

    private readonly vaccinatedMergeAssistMargin = 28;
    private readonly vaccinatedMergeAssistCheckInterval = 120;

    private readonly LOGICAL_WIDTH = 1920;
    private readonly LOGICAL_HEIGHT = 1080;

    private isSeedingBox = false;

    private wasClicked = false;

    private readonly mergeChain: ComponentLevel[] = [
        {
            key: 'component_1',
            size: 86,
            mergeValue: 2
        },
        {
            key: 'component_2',
            size: 98,
            mergeValue: 4
        },
        {
            key: 'component_3',
            size: 112,
            mergeValue: 6
        },
        {
            key: 'component_4',
            size: 126,
            mergeValue: 8
        },
        {
            key: 'component_5',
            size: 142,
            mergeValue: 10
        },
        {
            key: 'component_6',
            size: 162,
            mergeValue: 14
        },
        {
            key: 'component_7',
            size: 184,
            mergeValue: 18
        },
        {
            key: 'component_8',
            size: 210,
            mergeValue: 24
        },
        {
            key: 'component_9',
            size: 240,
            mergeValue: 32
        },
        {
            key: 'component_10',
            size: 275,
            mergeValue: 44
        },
        {
            key: 'component_11',
            size: 315,
            mergeValue: 60
        }
    ];

    constructor() {
        super({
            key: 'Level5',
            physics: {
                default: 'matter',
                matter: {
                    gravity: {
                        x: 0,
                        y: 6
                    },
                    debug: false
                }
            }
        });
    }

    init(data: { vaccinated?: boolean } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.hasStartedPlaying = false;
        this.gameEnded = false;
        this.canDrop = true;

        this.currentPreview = null;
        this.currentPreviewLevel = 0;

        this.activeComponents.clear();

        this.assemblyProgress = 0;
        this.levelStartTime = 0;
        this.lastVaccinatedMergeAssistCheck = 0;

        this.score = 0;
        this.highestMergedLevel = 0;

        this.nextPreviewLevel = 0;
        this.hasNextPreview = false;

        this.isSeedingBox = false;

        this.wasClicked = false;
    }

    preload() {
        this.load.image(
            'background_level5',
            '/assets/level5/background_level_5.png'
        );

        this.load.image(
            'component_1',
            '/assets/level5/component_1.png'
        );

        this.load.image(
            'component_2',
            '/assets/level5/component_2.png'
        );

        this.load.image(
            'component_3',
            '/assets/level5/component_3.png'
        );

        this.load.image(
            'component_4',
            '/assets/level5/component_4.png'
        );

        this.load.image(
            'component_5',
            '/assets/level5/component_5.png'
        );

        this.load.image(
            'component_6',
            '/assets/level5/component_6.png'
        );

        this.load.image(
            'component_7',
            '/assets/level5/component_7.png'
        );

        this.load.image(
            'component_8',
            '/assets/level5/component_8.png'
        );

        this.load.image(
            'component_9',
            '/assets/level5/component_9.png'
        );

        this.load.image(
            'component_10',
            '/assets/level5/component_10.png'
        );

        this.load.image(
            'component_11',
            '/assets/level5/component_11.png'
        );

        this.load.image(
            'ABI_standard',
            '/assets/tutorial/ABI/ABI_standard.png'
        );
    }

    create() {
        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/level5/background_level_5.png';
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
        backBtn.innerText = 'BACK';
        backBtn.style.pointerEvents = 'auto';
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.top = '40px';
        wrapper.style.left = '80px';
        wrapper.style.transform = 'translate(-50%, -50%)';
        wrapper.style.zIndex = '1000';
        wrapper.style.pointerEvents = 'none';
        wrapper.appendChild(backBtn);
        const gameContainer = document.getElementById('app') || document.body;
        gameContainer.appendChild(wrapper);

        backBtn.addEventListener('click', () => {
            this.scene.start('MenuPageScene');
        });

        this.matter.world.resume();

        const width = this.LOGICAL_WIDTH;
        const height = this.LOGICAL_HEIGHT;

        this.createContainer(width, height);
        this.createControls();
        this.createCollisionHandler();

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(5);

        this.seedInitialBox();

        const onResize = () => {
            if (!this.scene.isActive()) return;

            const newW = this.scale.width;
            const newH = this.scale.height;

            this.cameras.main.setSize(newW, newH);

            const zoomX = newW / this.LOGICAL_WIDTH;
            const zoomY = newH / this.LOGICAL_HEIGHT;
            const zoom = Math.min(zoomX, zoomY);

            this.cameras.main.setZoom(zoom);
            this.cameras.main.centerOn(this.LOGICAL_WIDTH / 2, this.LOGICAL_HEIGHT / 2);
        };

        this.scale.on('resize', onResize);
        
        onResize();

        this.time.delayedCall(10, onResize);

        this.events.once('shutdown', () => {
            wrapper.remove();
            this.scale.off('resize', onResize);
            this.tweens.killAll();
        });
    }

    private createContainer(width: number, height: number) {
        this.containerTop = height * 0.14;
        this.containerBottom = height * 0.92;

        if (this.isVaccinated) {
            this.containerLeft = width * 0.28;
            this.containerRight = width * 0.72;
            this.redLineY = height * 0.30;
        } else {
            this.containerLeft = width * 0.32;
            this.containerRight = width * 0.68;
            this.redLineY = height * 0.50;
        }

        this.dropX = width / 2;
        this.dropY = this.containerTop - 55;

        const containerWidth = this.containerRight - this.containerLeft;
        const containerHeight = this.containerBottom - this.containerTop;

        const graphics = this.add.graphics();
        graphics.setDepth(5);

        graphics.lineStyle(8, 0x88e6ff, 0.9);
        graphics.strokeRoundedRect(
            this.containerLeft,
            this.containerTop,
            containerWidth,
            containerHeight,
            28
        );

        graphics.lineStyle(4, 0xffffff, 0.28);
        graphics.strokeRoundedRect(
            this.containerLeft + 8,
            this.containerTop + 8,
            containerWidth - 16,
            containerHeight - 16,
            22
        );

        const redGlow = this.add.rectangle(
            width / 2,
            this.redLineY,
            containerWidth - 28,
            22,
            0xff2244,
            0.18
        );

        redGlow.setDepth(7);

        const redLine = this.add.rectangle(
            width / 2,
            this.redLineY,
            containerWidth - 40,
            8,
            0xff2244,
            0.95
        );

        redLine.setDepth(8);

        const wallOptions = {
            isStatic: true,
            friction: 1,
            restitution: 0.02
        };

        this.matter.add.rectangle(
            this.containerLeft - this.wallThickness / 2,
            this.containerTop + containerHeight / 2,
            this.wallThickness,
            containerHeight,
            wallOptions
        );

        this.matter.add.rectangle(
            this.containerRight + this.wallThickness / 2,
            this.containerTop + containerHeight / 2,
            this.wallThickness,
            containerHeight,
            wallOptions
        );

        this.matter.add.rectangle(
            width / 2,
            this.containerBottom + this.wallThickness / 2,
            containerWidth + this.wallThickness * 2,
            this.wallThickness,
            wallOptions
        );
    }

    private createControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();

        this.keyA = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.A
        );

        this.keyD = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.D
        );

        this.keySpace = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );
    }

    private createCollisionHandler() {
        this.matter.world.on('collisionstart', (event: any) => {
            if (this.gameEnded) {
                return;
            }

            event.pairs.forEach((pair: any) => {
                const first = pair.bodyA.gameObject as
                    | Phaser.Physics.Matter.Image
                    | undefined;

                const second = pair.bodyB.gameObject as
                    | Phaser.Physics.Matter.Image
                    | undefined;

                if (!first || !second) {
                    return;
                }

                if (
                    !this.activeComponents.has(first) ||
                    !this.activeComponents.has(second)
                ) {
                    return;
                }

                this.tryMerge(first, second);
            });
        });
    }

    private seedInitialBox() {
        this.isSeedingBox = true;

        const totalComponents = this.initialComponentCount;

        const columns = this.isVaccinated ? 12 : 13;
        const spacingX = this.isVaccinated ? 48 : 44;
        const spacingY = this.isVaccinated ? 44 : 40;

        const centerX = (this.containerLeft + this.containerRight) / 2;
        const totalWidth = (columns - 1) * spacingX;
        const startX = centerX - totalWidth / 2;

        const startY = this.containerBottom - 55;

        let created = 0;

        const createBatch = () => {
            if (this.gameEnded) {
                return;
            }

            const batchSize = 12;

            for (
                let i = 0;
                i < batchSize && created < totalComponents;
                i++
            ) {
                const row = Math.floor(created / columns);
                const col = created % columns;

                const stagger = row % 2 === 0 ? 0 : spacingX / 2;

                let x =
                    startX +
                    col * spacingX +
                    stagger +
                    Phaser.Math.Between(-2, 2);

                x = Phaser.Math.Clamp(
                    x,
                    this.containerLeft + 35,
                    this.containerRight - 35
                );

                const y =
                    startY -
                    row * spacingY +
                    Phaser.Math.Between(-2, 2);

                let level = 0;

                const roll = Phaser.Math.Between(1, 100);

                if (this.isVaccinated) {
                    if (roll <= 45) {
                        level = 0;
                    } else if (roll <= 70) {
                        level = 1;
                    } else if (roll <= 88) {
                        level = 2;
                    } else if (roll <= 97) {
                        level = 3;
                    } else {
                        level = 4;
                    }
                } else {
                    if (roll <= 82) {
                        level = 0;
                    } else if (roll <= 97) {
                        level = 1;
                    } else {
                        level = 2;
                    }
                }

                const component = this.createPhysicsComponent(
                    x,
                    y,
                    level
                );

                component.setVelocity(
                    Phaser.Math.FloatBetween(-0.02, 0.02),
                    Phaser.Math.FloatBetween(-0.015, 0.015)
                );

                component.setAngularVelocity(
                    Phaser.Math.FloatBetween(-0.0015, 0.0015)
                );

                created++;
            }

            if (created < totalComponents) {
                this.time.delayedCall(35, createBatch);
                return;
            }

            this.isSeedingBox = false;
            this.hasStartedPlaying = true;

            this.time.delayedCall(300, () => {
                if (!this.gameEnded) {
                    this.spawnNextPreview();
                    this.levelStartTime = this.time.now;
                }
            });
        };

        createBatch();
    }

    private spawnNextPreview() {
        if (this.gameEnded) {
            return;
        }

        if (this.currentPreview) {
            this.currentPreview.destroy();
            this.currentPreview = null;
        }

        this.canDrop = true;

        if (!this.hasNextPreview) {
            this.nextPreviewLevel = this.pickRandomPreviewLevel();
            this.hasNextPreview = true;
        }

        this.currentPreviewLevel = this.nextPreviewLevel;
        this.nextPreviewLevel = this.pickRandomPreviewLevel();

        const data = this.mergeChain[this.currentPreviewLevel];

        this.currentPreview = this.add.image(
            this.dropX,
            this.dropY,
            data.key
        );

        this.currentPreview.setDepth(25);
        this.currentPreview.setDisplaySize(data.size, data.size);
        this.currentPreview.setAlpha(0.92);
    }

    private pickRandomPreviewLevel() {
        if (this.isVaccinated) {
            return this.pickVaccinatedPreviewLevel();
        }

        const roll = Phaser.Math.Between(1, 100);

        if (roll <= 28) {
            return 0;
        }

        if (roll <= 58) {
            return 1;
        }

        if (roll <= 82) {
            return 2;
        }

        if (roll <= 96) {
            return 3;
        }

        return 4;
    }

    private pickVaccinatedPreviewLevel() {
        const availableLevels = this.getVaccinatedSpawnLevels();

        if (availableLevels.length === 0) {
            return this.vaccinatedFinalLevel;
        }

        return Phaser.Utils.Array.GetRandom(availableLevels);
    }

    private getVaccinatedSpawnLevels() {
        const levels: number[] = [];

        for (let level = 0; level <= this.vaccinatedFinalLevel; level++) {
            if (this.hasComponentLevelInBox(level)) {
                levels.push(level);
            }
        }

        if (levels.length === 0) {
            levels.push(this.vaccinatedFinalLevel);
        }

        return levels;
    }

    private hasComponentLevelInBox(level: number) {
        let found = false;

        this.activeComponents.forEach((component) => {
            if (!component.active) {
                return;
            }

            const componentLevel = component.getData('level') as number;

            if (componentLevel === level) {
                found = true;
            }
        });

        return found;
    }

    private updatePreviewMovement() {
        if (!this.currentPreview || !this.canDrop) {
            return;
        }

        const inputMode = this.registry.get('inputMode') || 'keyboard';
        let shouldDrop = false;

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();

            if (tracker.targetX !== -1) {
                const pixelX = tracker.targetX * this.scale.gameSize.width;
                const worldX = this.cameras.main.getWorldPoint(pixelX, 0).x;
                this.dropX = Phaser.Math.Linear(this.dropX, worldX, 0.2);
                const isClicked = tracker.isClicked;

                if (isClicked && !this.wasClicked) {
                    shouldDrop = true;
                }

                this.wasClicked = isClicked;
            } else {
                this.wasClicked = false;
            }
        } else {
            const moveSpeed = 9;

            const movingLeft = this.keyA.isDown || (this.cursors && this.cursors.left.isDown);
            const movingRight = this.keyD.isDown || (this.cursors && this.cursors.right.isDown);

            if (movingLeft) {
                this.dropX -= moveSpeed;
            }

            if (movingRight) {
                this.dropX += moveSpeed;
            }

            const spaceJustDown = Phaser.Input.Keyboard.JustDown(this.keySpace);
            const downJustDown = this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.down);
            
            if (spaceJustDown || downJustDown) {
                shouldDrop = true;
            }
        }

        this.dropX = Phaser.Math.Clamp(
            this.dropX,
            this.containerLeft + 50,
            this.containerRight - 50
        );

        this.currentPreview.x = this.dropX;
    
        if (shouldDrop) {
            this.dropCurrentComponent();
        }
    }

    private dropCurrentComponent() {
        if (!this.currentPreview || !this.canDrop) {
            return;
        }

        this.canDrop = false;
        this.hasStartedPlaying = true;

        const level = this.currentPreviewLevel;
        const x = this.currentPreview.x;
        const y = this.containerTop + 80;

        this.currentPreview.destroy();
        this.currentPreview = null;

        const component = this.createPhysicsComponent(x, y, level);

        component.setVelocity(
            Phaser.Math.FloatBetween(-0.03, 0.03),
            0
        );

        component.setAngularVelocity(
            Phaser.Math.FloatBetween(-0.002, 0.002)
        );

        this.time.delayedCall(this.isVaccinated ? 680 : 580, () => {
            if (!this.gameEnded) {
                this.spawnNextPreview();
            }
        });
    }

    private createPhysicsComponent(
        x: number,
        y: number,
        level: number
    ) {
        const data = this.mergeChain[level];

        const component = this.matter.add.image(
            x,
            y,
            data.key
        ) as Phaser.Physics.Matter.Image;

        component.setDepth(20 + level);
        component.setDisplaySize(data.size, data.size);

        const radius = data.size * 0.44;

        component.setCircle(radius);
        component.setBounce(0.01);
        component.setFriction(1);
        component.setFrictionStatic(1);
        component.setFrictionAir(0.0003);

        component.setData('level', level);
        component.setData('merging', false);
        component.setData('dangerSince', 0);

        component.setAngularVelocity(
            Phaser.Math.FloatBetween(-0.004, 0.004)
        );

        this.activeComponents.add(component);

        return component;
    }

    private tryMerge(
        first: Phaser.Physics.Matter.Image,
        second: Phaser.Physics.Matter.Image
    ) {
        if (this.gameEnded) {
            return;
        }

        if (!first.active || !second.active) {
            return;
        }

        if (first.getData('merging') || second.getData('merging')) {
            return;
        }

        const firstLevel = first.getData('level') as number;
        const secondLevel = second.getData('level') as number;

        if (firstLevel !== secondLevel) {
            return;
        }

        first.setData('merging', true);
        second.setData('merging', true);

        this.time.delayedCall(20, () => {
            this.mergeComponents(first, second, firstLevel);
        });
    }

    private checkVaccinatedNearbyMerges() {
        if (!this.isVaccinated) {
            return;
        }

        if (this.gameEnded || this.isSeedingBox || !this.hasStartedPlaying) {
            return;
        }

        if (
            this.time.now - this.lastVaccinatedMergeAssistCheck <
            this.vaccinatedMergeAssistCheckInterval
        ) {
            return;
        }

        this.lastVaccinatedMergeAssistCheck = this.time.now;

        const components = Array.from(this.activeComponents).filter((component) => {
            return (
                component.active &&
                component.body &&
                !component.getData('merging')
            );
        });

        for (let i = 0; i < components.length; i++) {
            const first = components[i];
            const firstLevel = first.getData('level') as number;

            for (let j = i + 1; j < components.length; j++) {
                const second = components[j];
                const secondLevel = second.getData('level') as number;

                if (firstLevel !== secondLevel) {
                    continue;
                }

                if (first.getData('merging') || second.getData('merging')) {
                    continue;
                }

                const firstRadius = this.mergeChain[firstLevel].size * 0.44;
                const secondRadius = this.mergeChain[secondLevel].size * 0.44;

                const distance = Phaser.Math.Distance.Between(
                    first.x,
                    first.y,
                    second.x,
                    second.y
                );

                const assistedMergeDistance =
                    firstRadius +
                    secondRadius +
                    this.vaccinatedMergeAssistMargin;

                if (distance <= assistedMergeDistance) {
                    this.tryMerge(first, second);
                    return;
                }
            }
        }
    }

    private mergeComponents(
        first: Phaser.Physics.Matter.Image,
        second: Phaser.Physics.Matter.Image,
        level: number
    ) {
        if (this.gameEnded) {
            return;
        }

        if (!first.active || !second.active) {
            return;
        }

        const mergeX = (first.x + second.x) / 2;
        const mergeY = (first.y + second.y) / 2;

        this.activeComponents.delete(first);
        this.activeComponents.delete(second);

        if (first.body) {
            this.matter.world.remove(first.body);
        }

        if (second.body) {
            this.matter.world.remove(second.body);
        }

        first.destroy(true);
        second.destroy(true);

        if (this.isVaccinated && level === this.vaccinatedFinalLevel) {
            this.createVanishEffect(mergeX, mergeY);
            this.score += this.mergeChain[level].mergeValue;
            this.decreaseAssembly(20);

            this.time.delayedCall(120, () => {
                this.checkVaccinatedWinCondition();
            });

            return;
        }

        const lastLevel = this.mergeChain.length - 1;

        if (!this.isVaccinated && level === lastLevel) {
            this.createVanishEffect(mergeX, mergeY);
            this.score += this.mergeChain[level].mergeValue;
            this.decreaseAssembly(25);

            return;
        }

        const newLevel = level + 1;

        if (this.isVaccinated && newLevel > this.vaccinatedFinalLevel) {
            return;
        }

        const safeMergeY = Phaser.Math.Clamp(
            mergeY - 6,
            this.containerTop + 80,
            this.containerBottom - 70
        );

        const newComponent = this.createPhysicsComponent(
            mergeX,
            safeMergeY,
            newLevel
        );

        this.onFruitMerge(newLevel);

        newComponent.setVelocity(
            Phaser.Math.FloatBetween(-0.12, 0.12),
            -0.2
        );

        newComponent.setAngularVelocity(
            Phaser.Math.FloatBetween(-0.003, 0.003)
        );

        this.createMergeEffect(mergeX, mergeY);
        this.increaseAssembly(this.mergeChain[newLevel].mergeValue);

        if (this.isVaccinated) {
            this.time.delayedCall(120, () => {
                this.checkVaccinatedWinCondition();
            });
        }
    }

    private onFruitMerge(newLevel: number) {
        this.highestMergedLevel = Math.max(
            this.highestMergedLevel,
            newLevel
        );

        this.score += this.mergeChain[newLevel].mergeValue;
    }

    private checkVaccinatedWinCondition() {
        if (this.gameEnded) {
            return;
        }

        if (!this.isVaccinated) {
            return;
        }

        if (this.activeComponents.size > 0) {
            return;
        }

        this.completeLevel();
    }

    private stabilizeComponents() {
        this.activeComponents.forEach((component) => {
            if (!component.active || !component.body) {
                return;
            }

            const body = component.body as MatterJS.BodyType;

            const maxVelocity = 5;

            const vx = Phaser.Math.Clamp(
                body.velocity.x,
                -maxVelocity,
                maxVelocity
            );

            const vy = Phaser.Math.Clamp(
                body.velocity.y,
                -maxVelocity,
                maxVelocity
            );

            component.setVelocity(vx, vy);

            const maxAngularVelocity = 0.08;

            const angularVelocity = Phaser.Math.Clamp(
                body.angularVelocity,
                -maxAngularVelocity,
                maxAngularVelocity
            );

            component.setAngularVelocity(angularVelocity);
        });
    }

    private areComponentsSettled() {
        let hasMovingComponent = false;

        this.activeComponents.forEach((component) => {
            if (!component.active || !component.body) {
                return;
            }

            const body = component.body as MatterJS.BodyType;

            const isMoving =
                Math.abs(body.velocity.x) > 0.08 ||
                Math.abs(body.velocity.y) > 0.12 ||
                Math.abs(body.angularVelocity) > 0.015;

            if (isMoving) {
                hasMovingComponent = true;
            }
        });

        return !hasMovingComponent;
    }

    private createMergeEffect(x: number, y: number) {
        const flash = this.add.circle(
            x,
            y,
            30,
            0x66ffcc,
            0.65
        );

        flash.setDepth(40);

        this.tweens.add({
            targets: flash,
            scale: 2.2,
            alpha: 0,
            duration: 260,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
    }

    private createVanishEffect(x: number, y: number) {
        const flash = this.add.circle(
            x,
            y,
            48,
            0xffcc66,
            0.85
        );

        flash.setDepth(45);

        this.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 420,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });

        this.cameras.main.flash(
            180,
            255,
            220,
            120
        );
    }

    private checkDangerLine() {
        if (this.gameEnded) {
            return;
        }

        if (this.isSeedingBox) {
            return;
        }

        if (this.time.now - this.levelStartTime < 3000) {
            return;
        }

        if (!this.areComponentsSettled()) {
            this.activeComponents.forEach((component) => {
                component.setData('dangerSince', 0);
            });

            return;
        }

        this.activeComponents.forEach((component) => {
            if (!component.active || !component.body) {
                return;
            }

            const level = component.getData('level') as number;
            const radius = this.mergeChain[level].size * 0.44;

            const isClearlyAboveLine =
                component.y - radius < this.redLineY - 8;

            if (!isClearlyAboveLine) {
                component.setData('dangerSince', 0);
                return;
            }

            const dangerSince = component.getData('dangerSince') as number;

            if (!dangerSince) {
                component.setData('dangerSince', this.time.now);
                return;
            }

            const dangerLimit = this.isVaccinated
                ? 2200
                : 1600;

            if (this.time.now - dangerSince >= dangerLimit) {
                this.loseGame();
            }
        });
    }

    private increaseAssembly(amount: number) {
        if (this.gameEnded) {
            return;
        }

        this.assemblyProgress += amount;

        if (this.assemblyProgress > 100) {
            this.assemblyProgress = 100;
        }
    }

    private decreaseAssembly(amount: number) {
        if (this.gameEnded) {
            return;
        }

        this.assemblyProgress -= amount;

        if (this.assemblyProgress < 0) {
            this.assemblyProgress = 0;
        }
    }

    private clearComponents() {
        this.activeComponents.forEach((component) => {
            if (component.body) {
                this.matter.world.remove(component.body);
            }

            component.destroy(true);
        });

        this.activeComponents.clear();
    }

    private completeLevel() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;

        if (this.currentPreview) {
            this.currentPreview.destroy();
            this.currentPreview = null;
        }

        this.clearComponents();

        this.postGameManager.showWinScreen();
    }

    private loseGame() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;

        if (this.currentPreview) {
            this.currentPreview.destroy();
            this.currentPreview = null;
        }

        this.matter.world.pause();

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

        this.updatePreviewMovement();
        this.stabilizeComponents();

        // Solo in modalità vaccinata:
        // aiuta componenti uguali e vicini a fondersi anche se non si toccano perfettamente.
        this.checkVaccinatedNearbyMerges();

        this.checkDangerLine();
    }
}