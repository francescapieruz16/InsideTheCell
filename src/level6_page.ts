import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';
import { HandTrackingController } from './handTracking/handTrackingController';

type Point = {
    x: number;
    y: number;
};

type Direction = {
    x: number;
    y: number;
};

type DuplicationZone = {
    x: number;
    y: number;
    visual: Phaser.GameObjects.Arc;
};

export class Level6 extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyW!: Phaser.Input.Keyboard.Key;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyS!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;

    private player!: Phaser.Physics.Arcade.Image;
    private viruses!: Phaser.Physics.Arcade.Group;
    private walls!: Phaser.Physics.Arcade.StaticGroup;

    private postGameManager!: PostGameManager;

    private isVaccinated = false;
    private hasShownQuiz = false;
    private hasStartedPlaying = false;
    private gameEnded = false;

    private capturedViruses = 0;
    private totalVirusesCreated = 0;
    private levelStartTime = 0;
    private remainingTimeMs = 0;

    private capturedText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;

    private mazeLeft = 0;
    private mazeTop = 0;
    private tileSize = 0;

    private playerSpawn: Point = { x: 0, y: 0 };
    private virusSpawnPoints: Point[] = [];
    private duplicationZones: DuplicationZone[] = [];

    private readonly playerSpeed = 360;

    private readonly normalTimeLimitMs = 15000;
    private readonly vaccinatedTimeLimitMs = 60000;

    private readonly playerScale = 0.75;
    private readonly virusScale = 0.85;

    private readonly playerCollisionScale = 0.92;
    private readonly virusCollisionScale = 0.75;

    private readonly virusSpeed = 200;
    private readonly vaccinatedVirusSpeed = 130;

    private readonly maxViruses = 256;

    private readonly normalInitialVirusCount = 12;
    private readonly vaccinatedInitialVirusCount = 5;

    private readonly outbreakLoseVirusCount = 40;
    private readonly dynamicCaptureFraction = 0.5;

    private readonly duplicateCooldown = 600;

    private readonly duplicationRadiusMultiplier = 0.95;
    private readonly duplicationZoneMoveInterval = 4000;

    private readonly LOGICAL_WIDTH = 1920;
    private readonly LOGICAL_HEIGHT = 1080;

    private readonly directions: Direction[] = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
    ];

    private readonly mazeGrid = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,4,0,1],
    [1,0,1,0,1,0,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,0,1],
    [1,4,0,0,0,0,0,0,1,0,1,0,0,3,0,0,0,1,0,0,0,0,0,0,0,4,0,1],
    [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,3,0,1,0,1,0,0,0,0,0,0,4,1],
    [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1],
    [1,0,0,0,1,4,0,0,3,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,3,0,0,0,0,4,0,1],
    [1,0,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

    constructor() {
        super('Level6');
    }

    init(data: { vaccinated?: boolean } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.hasStartedPlaying = false;
        this.gameEnded = false;

        this.capturedViruses = 0;
        this.totalVirusesCreated = 0;

        this.levelStartTime = 0;
        this.remainingTimeMs = this.getTimeLimitMs();

        this.playerSpawn = { x: 0, y: 0 };
        this.virusSpawnPoints = [];
        this.duplicationZones = [];
    }

    preload() {
        this.load.image('background_level6', '/assets/level6/background_level_6.png');
        this.load.image('wall_level6', '/assets/level6/wall.png');
        this.load.image('player_level6', '/assets/level6/player.png');
        this.load.image('virus_level6', '/assets/level6/virus.png');
        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png');
    }

    create() {
        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/level6/background_level_6.png';
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

        this.physics.resume();

        const width = this.LOGICAL_WIDTH;
        const height = this.LOGICAL_HEIGHT;

        this.textures.get('player_level6').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('virus_level6').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get('wall_level6').setFilter(Phaser.Textures.FilterMode.NEAREST);

        this.createMaze(width, height);
        this.createPlayer();
        this.createViruses();
        this.createControls();
        this.createCollisionHandler();
        this.createHud(width, height);
        this.startMovingDuplicationZones();

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(6);

        this.hasStartedPlaying = true;
        this.levelStartTime = this.time.now;
        this.updateHud();

        const onResize = () => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;
            if (!this.physics || !this.physics.world) return;

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

    private getVirusSpeed() {
        return this.isVaccinated
            ? this.vaccinatedVirusSpeed
            : this.virusSpeed;
    }

    private getInitialVirusCount() {
        return this.isVaccinated
            ? this.vaccinatedInitialVirusCount
            : this.normalInitialVirusCount;
    }

    private getTimeLimitMs() {
        return this.isVaccinated
            ? this.vaccinatedTimeLimitMs
            : this.normalTimeLimitMs;
    }

    private createMaze(width: number, height: number) {
        const rows = this.mazeGrid.length;
        const cols = this.mazeGrid[0].length;

        const hudTopSpace = 120;
        const paddingX = 70;
        const paddingBottom = 45;

        this.tileSize = Math.floor(
            Math.min(
                (width - paddingX * 2) / cols,
                (height - hudTopSpace - paddingBottom) / rows
            )
        );

        const mazeWidth = cols * this.tileSize;
        const mazeHeight = rows * this.tileSize;

        this.mazeLeft = (width - mazeWidth) / 2;
        this.mazeTop = hudTopSpace + (height - hudTopSpace - mazeHeight) / 2;

        this.walls = this.physics.add.staticGroup();

        const frame = this.add.rectangle(
            width / 2,
            this.mazeTop + mazeHeight / 2,
            mazeWidth + 24,
            mazeHeight + 24,
            0x001b1d,
            0.55
        );

        frame.setDepth(3);
        frame.setStrokeStyle(8, 0x88e6ff, 0.75);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const value = this.mazeGrid[row][col];
                const center = this.getCellCenter(row, col);

                if (value === 1) {
                    const wall = this.walls.create(center.x, center.y, 'wall_level6') as Phaser.Physics.Arcade.Image;
                    wall.setDisplaySize(this.tileSize, this.tileSize);
                    wall.setDepth(5);
                    wall.setAlpha(0.94);
                    wall.refreshBody();
                }

                if (value === 2) {
                    this.playerSpawn = center;
                }

                if (value === 3) {
                    if (!this.isVaccinated || this.duplicationZones.length === 0) {
                        this.createDuplicationZone(center.x, center.y);
                    }
                }

                if (value === 4) {
                    this.virusSpawnPoints.push(center);
                }
            }
        }
    }

    private createDuplicationZone(x: number, y: number) {
        const visual = this.add.circle(x, y, this.tileSize * 0.42, 0xff3bd4, 0.55);

        visual.setDepth(8);
        visual.setStrokeStyle(6, 0xff9beb, 1);

        this.tweens.add({
            targets: visual,
            scale: 1.75,
            alpha: 0.18,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        this.duplicationZones.push({
            x,
            y,
            visual
        });
    }

    private startMovingDuplicationZones() {
        this.time.addEvent({
            delay: this.duplicationZoneMoveInterval,
            loop: true,
            callback: () => {
                if (this.gameEnded) return;
                this.moveDuplicationZonesRandomly();
            }
        });
    }

    private moveDuplicationZonesRandomly() {
        this.duplicationZones.forEach((zone) => {
            const newPoint = this.findRandomDuplicationZonePoint(zone);

            if (!newPoint) return;

            zone.x = newPoint.x;
            zone.y = newPoint.y;

            this.tweens.add({
                targets: zone.visual,
                x: newPoint.x,
                y: newPoint.y,
                duration: 450,
                ease: 'Power2'
            });
        });
    }

    private findRandomDuplicationZonePoint(currentZone: DuplicationZone): Point | null {
        const validCells: Point[] = [];

        for (let row = 0; row < this.mazeGrid.length; row++) {
            for (let col = 0; col < this.mazeGrid[row].length; col++) {
                const cellValue = this.mazeGrid[row][col];

                if (cellValue !== 0 && cellValue !== 3) continue;

                const center = this.getCellCenter(row, col);

                const tooCloseToAnotherZone = this.duplicationZones.some((otherZone) => {
                    if (otherZone === currentZone) return false;

                    const distance = Phaser.Math.Distance.Between(
                        center.x,
                        center.y,
                        otherZone.x,
                        otherZone.y
                    );

                    return distance < this.tileSize * 4;
                });

                if (tooCloseToAnotherZone) continue;

                const tooCloseToPlayer = this.player && this.player.active
                    ? Phaser.Math.Distance.Between(center.x, center.y, this.player.x, this.player.y) < this.tileSize * 2
                    : false;

                if (tooCloseToPlayer) continue;

                validCells.push(center);
            }
        }

        if (validCells.length === 0) return null;

        return Phaser.Utils.Array.GetRandom(validCells);
    }

    private createPlayer() {
        this.player = this.physics.add.image(this.playerSpawn.x, this.playerSpawn.y, 'player_level6');

        this.player.setDepth(20);
        this.player.setDisplaySize(this.tileSize * this.playerScale, this.tileSize * this.playerScale);
        this.player.setCollideWorldBounds(false);

        const body = this.player.body as Phaser.Physics.Arcade.Body;

        body.setAllowGravity(false);
        body.setImmovable(false);
        body.setDrag(0, 0);
        body.setAcceleration(0, 0);
        body.setMaxVelocity(this.playerSpeed, this.playerSpeed);
        body.setSize(this.player.width * this.playerCollisionScale, this.player.height * this.playerCollisionScale, true);
        body.updateFromGameObject();
    }

    private createViruses() {
        this.viruses = this.physics.add.group();

        const initialVirusCount = this.getInitialVirusCount();

        const spawnPoints = Phaser.Utils.Array
            .Shuffle(this.getRandomInitialVirusSpawnPoints())
            .slice(0, initialVirusCount);

        spawnPoints.forEach((point) => {
            this.spawnVirus(point.x, point.y, true);
        });
    }

    private getRandomInitialVirusSpawnPoints(): Point[] {
        const validCells: Point[] = [];

        for (let row = 0; row < this.mazeGrid.length; row++) {
            for (let col = 0; col < this.mazeGrid[row].length; col++) {
                const cellValue = this.mazeGrid[row][col];

                if (cellValue !== 0 && cellValue !== 4) continue;

                const center = this.getCellCenter(row, col);

                const distanceFromPlayerSpawn = Phaser.Math.Distance.Between(
                    center.x,
                    center.y,
                    this.playerSpawn.x,
                    this.playerSpawn.y
                );

                if (distanceFromPlayerSpawn < this.tileSize * 4) continue;

                const tooCloseToDuplicationZone = this.duplicationZones.some((zone) => {
                    const distance = Phaser.Math.Distance.Between(
                        center.x,
                        center.y,
                        zone.x,
                        zone.y
                    );

                    return distance < this.tileSize * 2.5;
                });

                if (tooCloseToDuplicationZone) continue;

                validCells.push(center);
            }
        }

        const shuffledCells = Phaser.Utils.Array.Shuffle(validCells);
        const selectedPoints: Point[] = [];

        for (const point of shuffledCells) {
            const tooCloseToAnotherSelected = selectedPoints.some((selected) => {
                const distance = Phaser.Math.Distance.Between(
                    point.x,
                    point.y,
                    selected.x,
                    selected.y
                );

                return distance < this.tileSize * 3;
            });

            if (tooCloseToAnotherSelected) continue;

            selectedPoints.push(point);

            if (selectedPoints.length >= this.getInitialVirusCount()) {
                break;
            }
        }

        return selectedPoints;
    }

    private spawnVirus(x: number, y: number, startWithCooldown = false) {
        if (this.gameEnded) return false;

        if (this.viruses && this.viruses.getChildren().length >= this.maxViruses) return false;

        const virus = this.physics.add.image(x, y, 'virus_level6');

        virus.setActive(true);
        virus.setVisible(true);
        virus.setTexture('virus_level6');
        virus.setDepth(100);
        virus.setAlpha(1);
        virus.clearTint();

        virus.setDisplaySize(this.tileSize * this.virusScale, this.tileSize * this.virusScale);

        virus.setData('captured', false);
        virus.setData('direction', null);
        virus.setData('wasInsideDuplicationZone', false);

        virus.setData(
            'duplicateCooldownUntil',
            startWithCooldown ? this.time.now + this.duplicateCooldown : 0
        );

        const currentVirusSpeed = this.getVirusSpeed();

        const body = virus.body as Phaser.Physics.Arcade.Body;

        body.enable = true;
        body.setAllowGravity(false);
        body.setBounce(0);
        body.setDrag(0, 0);
        body.setAcceleration(0, 0);
        body.setMaxVelocity(currentVirusSpeed, currentVirusSpeed);
        body.setSize(virus.width * this.virusCollisionScale, virus.height * this.virusCollisionScale, true);
        body.updateFromGameObject();

        this.viruses.add(virus);

        this.totalVirusesCreated++;
        this.checkGameResult();

        this.time.delayedCall(0, () => {
            if (virus.active && !this.gameEnded) {
                this.chooseRandomVirusDirection(virus);
            }
        });

        return true;
    }

    private createControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    private createCollisionHandler() {
        this.physics.add.collider(this.player, this.walls);

        this.physics.add.collider(this.viruses, this.walls, (virusObject) => {
            const virus = virusObject as Phaser.Physics.Arcade.Image;

            this.centerObjectOnCurrentCell(virus);
            this.chooseRandomVirusDirection(virus);
        });

        this.physics.add.overlap(this.player, this.viruses, (_, virusObject) => {
            this.captureVirus(virusObject as Phaser.Physics.Arcade.Image);
        });
    }

    private triggerDuplication(virus: Phaser.Physics.Arcade.Image, zone: DuplicationZone) {
        if (!virus.active || !virus.body || this.gameEnded) return;

        const currentVirusCount = this.viruses.getChildren().length;

        if (currentVirusCount >= this.maxViruses) {
            return;
        }

        const cooldownUntil = (virus.getData('duplicateCooldownUntil') as number) || 0;

        if (this.time.now < cooldownUntil) {
            return;
        }

        virus.setData('duplicateCooldownUntil', this.time.now + this.duplicateCooldown);

        this.duplicateVirusNow(virus, zone);
    }

    private duplicateVirusNow(virus: Phaser.Physics.Arcade.Image, zone: DuplicationZone) {
        if (!virus.active || !virus.body || this.gameEnded) return;
        if (this.viruses.getChildren().length >= this.maxViruses) return;

        const spawnPoint: Point = {
            x: zone.x,
            y: zone.y
        };

        const duplicated = this.spawnVirus(spawnPoint.x, spawnPoint.y, true);

        if (!duplicated) {
            return;
        }

        const children = this.viruses.getChildren();
        const newVirus = children[children.length - 1] as Phaser.Physics.Arcade.Image;

        if (newVirus && newVirus.active) {
            newVirus.setVisible(true);
            newVirus.setActive(true);
            newVirus.setTexture('virus_level6');
            newVirus.setDepth(999);
            newVirus.setAlpha(1);
            newVirus.setTint(0xff00ff);

            const body = newVirus.body as Phaser.Physics.Arcade.Body;

            body.reset(spawnPoint.x, spawnPoint.y);
            body.setVelocity(0, 0);

            newVirus.setData('wasInsideDuplicationZone', true);

            this.chooseRandomVirusDirection(newVirus);

            this.tweens.add({
                targets: newVirus,
                scaleX: newVirus.scaleX * 2,
                scaleY: newVirus.scaleY * 2,
                duration: 220,
                yoyo: true,
                ease: 'Power2',
                onComplete: () => {
                    if (newVirus.active) {
                        newVirus.clearTint();
                        newVirus.setDepth(100);
                    }
                }
            });
        }

        this.createDuplicationEffect(spawnPoint.x, spawnPoint.y);
    }

    private checkDuplicationZonesForVirus(virus: Phaser.Physics.Arcade.Image) {
        if (!virus.active || !virus.body || this.gameEnded) return;

        const radius = this.tileSize * this.duplicationRadiusMultiplier;

        let isInsideAnyDuplicationZone = false;
        let touchedZone: DuplicationZone | null = null;

        for (const zone of this.duplicationZones) {
            const distance = Phaser.Math.Distance.Between(
                virus.x,
                virus.y,
                zone.x,
                zone.y
            );

            if (distance <= radius) {
                isInsideAnyDuplicationZone = true;
                touchedZone = zone;
                break;
            }
        }

        const wasInside = (virus.getData('wasInsideDuplicationZone') as boolean) || false;

        if (!isInsideAnyDuplicationZone) {
            virus.setData('wasInsideDuplicationZone', false);
            return;
        }

        if (wasInside) {
            return;
        }

        virus.setData('wasInsideDuplicationZone', true);
        this.triggerDuplication(virus, touchedZone!);
    }

    private createHud(width: number, height: number) {
        const panelWidth = width * 0.68;
        const panelX = width / 2;
        const panelY = 55;

        const panelLeft = panelX - panelWidth / 2;
        const panelRight = panelX + panelWidth / 2;

        const panel = this.add.rectangle(panelX, panelY, panelWidth, 78, 0x001b1d, 0.72);

        panel.setDepth(50);
        panel.setStrokeStyle(4, 0x88e6ff, 0.55);

        this.capturedText = this.add.text(panelLeft + 25, 37, '', {
            fontFamily: 'monospace',
            fontSize: '25px',
            color: '#39ff7a',
            stroke: '#003b18',
            strokeThickness: 5,
            resolution: 2
        });

        this.capturedText.setDepth(60);
        this.capturedText.setOrigin(0, 0);

        this.timerText = this.add.text(panelRight - 25, 37, '', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#001020',
            strokeThickness: 5,
            resolution: 2
        });

        this.timerText.setDepth(60);
        this.timerText.setOrigin(1, 0);
    }

    private getCellCenter(row: number, col: number): Point {
        return {
            x: this.mazeLeft + col * this.tileSize + this.tileSize / 2,
            y: this.mazeTop + row * this.tileSize + this.tileSize / 2
        };
    }

    private getGridPositionFromWorld(x: number, y: number) {
        return {
            col: Math.floor((x - this.mazeLeft) / this.tileSize),
            row: Math.floor((y - this.mazeTop) / this.tileSize)
        };
    }

    private isWalkableCell(row: number, col: number) {
        if (row < 0 || row >= this.mazeGrid.length || col < 0 || col >= this.mazeGrid[0].length) return false;

        return this.mazeGrid[row][col] !== 1;
    }

    private getAvailableDirectionsFromPosition(x: number, y: number) {
        const { row, col } = this.getGridPositionFromWorld(x, y);

        return this.directions.filter((direction) => {
            const nextRow = row + direction.y;
            const nextCol = col + direction.x;

            return this.isWalkableCell(nextRow, nextCol);
        });
    }

    private centerObjectOnCurrentCell(sprite: Phaser.Physics.Arcade.Image) {
        const { row, col } = this.getGridPositionFromWorld(sprite.x, sprite.y);

        if (!this.isWalkableCell(row, col)) return;

        const center = this.getCellCenter(row, col);
        const body = sprite.body as Phaser.Physics.Arcade.Body;

        body.reset(center.x, center.y);
        body.setVelocity(0, 0);
    }

    private chooseRandomVirusDirection(virus: Phaser.Physics.Arcade.Image) {
        if (!virus.active || !virus.body) return;

        const availableDirections = this.getAvailableDirectionsFromPosition(virus.x, virus.y);

        if (availableDirections.length === 0) {
            virus.setVelocity(0, 0);
            virus.setData('direction', null);
            return;
        }

        const direction = Phaser.Utils.Array.GetRandom(availableDirections);
        const currentVirusSpeed = this.getVirusSpeed();

        virus.setData('direction', direction);

        const body = virus.body as Phaser.Physics.Arcade.Body;

        body.setAcceleration(0, 0);
        body.setVelocity(0, 0);
        body.setMaxVelocity(currentVirusSpeed, currentVirusSpeed);
        body.setVelocity(direction.x * currentVirusSpeed, direction.y * currentVirusSpeed);
    }

    private createDuplicationEffect(x: number, y: number) {
        const flash = this.add.circle(x, y, this.tileSize * 0.52, 0xff9beb, 0.95);

        flash.setDepth(998);

        this.tweens.add({
            targets: flash,
            scale: 2.5,
            alpha: 0,
            duration: 320,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
    }

    private updateVirusesMovement() {
        if (!this.viruses) return;

        const virusChildren = [...this.viruses.getChildren()] as Phaser.Physics.Arcade.Image[];

        virusChildren.forEach((virus) => {
            if (!virus || !virus.active || !virus.body) return;

            this.checkDuplicationZonesForVirus(virus);

            const direction = virus.getData('direction') as Direction | null;

            if (!direction) {
                this.chooseRandomVirusDirection(virus);
                return;
            }

            const { row, col } = this.getGridPositionFromWorld(virus.x, virus.y);

            if (!this.isWalkableCell(row, col)) {
                this.centerObjectOnCurrentCell(virus);
                this.chooseRandomVirusDirection(virus);
                return;
            }

            const center = this.getCellCenter(row, col);

            if (direction.x !== 0) virus.setY(center.y);
            if (direction.y !== 0) virus.setX(center.x);

            const distanceFromCenter = Phaser.Math.Distance.Between(
                virus.x,
                virus.y,
                center.x,
                center.y
            );

            const nextRow = row + direction.y;
            const nextCol = col + direction.x;

            if (distanceFromCenter < 8 && !this.isWalkableCell(nextRow, nextCol)) {
                this.chooseRandomVirusDirection(virus);
                return;
            }

            const currentVirusSpeed = this.getVirusSpeed();
            const body = virus.body as Phaser.Physics.Arcade.Body;

            body.setAcceleration(0, 0);
            body.setMaxVelocity(currentVirusSpeed, currentVirusSpeed);
            body.setVelocity(direction.x * currentVirusSpeed, direction.y * currentVirusSpeed);
        });
    }

    private updatePlayerMovement() {
        if (!this.player || !this.player.body) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const inputMode = this.registry.get('inputMode');

        body.setAcceleration(0, 0);

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();

            if (tracker.targetX !== -1 && tracker.targetY !== -1) {
                // Calcola i pixel sullo schermo reale
                const pixelX = tracker.targetX * this.scale.gameSize.width;
                const pixelY = tracker.targetY * this.scale.gameSize.height;

                // Traduci nei pixel virtuali del mondo 1920x1080
                const worldPoint = this.cameras.main.getWorldPoint(pixelX, pixelY);

                // Calcola la distanza tra il giocatore e la mano
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, 
                    this.player.y, 
                    worldPoint.x, 
                    worldPoint.y
                );

                // Deadzone: se siamo abbastanza vicini alla mano, fermiamoci
                if (distance > 20) {
                    this.physics.moveTo(this.player, worldPoint.x, worldPoint.y, this.playerSpeed);
                } else {
                    body.setVelocity(0, 0);
                }
            } else {
                // Se la mano viene persa dalla telecamera, fermati
                body.setVelocity(0, 0);
            }
        } else {
            // Logica Tastiera Originale
            let velocityX = 0;
            let velocityY = 0;

            const movingLeft = this.keyA.isDown || !!this.cursors.left?.isDown;
            const movingRight = this.keyD.isDown || !!this.cursors.right?.isDown;
            const movingUp = this.keyW.isDown || !!this.cursors.up?.isDown;
            const movingDown = this.keyS.isDown || !!this.cursors.down?.isDown;

            if (movingLeft) velocityX -= this.playerSpeed;
            if (movingRight) velocityX += this.playerSpeed;
            if (movingUp) velocityY -= this.playerSpeed;
            if (movingDown) velocityY += this.playerSpeed;

            if (velocityX !== 0 && velocityY !== 0) {
                const diagonalSpeed = this.playerSpeed / Math.SQRT2;
                velocityX = velocityX > 0 ? diagonalSpeed : -diagonalSpeed;
                velocityY = velocityY > 0 ? diagonalSpeed : -diagonalSpeed;
            }

            body.setMaxVelocity(this.playerSpeed, this.playerSpeed);
            body.setVelocity(velocityX, velocityY);
        }
    }

    private getActiveVirusCount() {
        if (!this.viruses) return 0;

        return this.viruses.getChildren().filter((child) => {
            const virus = child as Phaser.Physics.Arcade.Image;

            return virus.active;
        }).length;
    }

    private getDynamicCaptureGoal() {
        return Math.ceil(this.totalVirusesCreated * this.dynamicCaptureFraction);
    }

    private checkGameResult() {
        if (this.gameEnded || !this.hasStartedPlaying) return;

        const activeVirusCount = this.getActiveVirusCount();
        const dynamicGoal = this.getDynamicCaptureGoal();

        if (activeVirusCount >= this.outbreakLoseVirusCount) {
            this.loseGame();
            return;
        }

        if (this.totalVirusesCreated > 0 && this.capturedViruses >= dynamicGoal) {
            this.completeLevel();
        }
    }

    private updateTimer() {
        if (!this.hasStartedPlaying || this.gameEnded) return;

        const elapsed = this.time.now - this.levelStartTime;

        this.remainingTimeMs = Math.max(
            0,
            this.getTimeLimitMs() - elapsed
        );

        if (this.remainingTimeMs <= 0) {
            if (this.capturedViruses >= this.getDynamicCaptureGoal()) {
                this.completeLevel();
            } else {
                this.loseGame();
            }
        }
    }

    private updateHud() {
        if (!this.capturedText || !this.timerText) return;

        const remainingSeconds = Math.ceil(this.remainingTimeMs / 1000);
        const dynamicGoal = this.getDynamicCaptureGoal();
        const activeVirusCount = this.getActiveVirusCount();

        this.capturedText.setText(
            `VIRUSES: ${this.capturedViruses}/${dynamicGoal} | ACTIVE: ${activeVirusCount}/${this.outbreakLoseVirusCount}`
        );

        this.timerText.setText(`TIME: ${remainingSeconds}`);
    }

    private captureVirus(virus: Phaser.Physics.Arcade.Image) {
        if (this.gameEnded || virus.getData('captured')) return;

        virus.setData('captured', true);
        this.capturedViruses++;

        this.createCaptureEffect(virus.x, virus.y);
        this.viruses.remove(virus, true, true);

        this.updateHud();
        this.checkGameResult();
    }

    private createCaptureEffect(x: number, y: number) {
        const flash = this.add.circle(x, y, this.tileSize * 0.28, 0x66ffcc, 0.82);

        flash.setDepth(998);

        this.tweens.add({
            targets: flash,
            scale: 2.4,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
    }

    private clearLevelObjects() {
        if (this.player && this.player.body) {
            this.player.setVelocity(0, 0);
        }

        if (this.viruses) {
            this.viruses.clear(true, true);
        }

        if (this.player && this.player.active) {
            this.player.destroy();
        }
    }

    private completeLevel() {
    if (this.gameEnded) return;

    this.gameEnded = true;
    this.physics.pause();
    this.clearLevelObjects();

    // Sblocca il final boss nel menu
    localStorage.setItem('FINAL_BOSS_UNLOCKED', 'true');

    this.postGameManager.showWinScreen();

    this.time.delayedCall(150, () => {
        this.createFinalBossButton();
    });
}

    private createFinalBossButton() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const buttonWidth = 320;
        const buttonHeight = 70;

        const buttonX = width / 2;
        const buttonY = height * 0.52;

        const button = this.add.rectangle(
            buttonX,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x3f5f95,
            1
        );

        button.setDepth(10000);
        button.setStrokeStyle(4, 0xffffff, 1);
        button.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(
            buttonX,
            buttonY,
            'Go to the final game!',
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        );

        buttonText.setOrigin(0.5);
        buttonText.setDepth(10001);

        button.on('pointerover', () => {
            button.setFillStyle(0x5276b8, 1);
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x3f5f95, 1);
        });

        button.on('pointerdown', () => {
            window.location.href = '/pages/final_boss.html';
        });
    }

    private loseGame() {
        if (this.gameEnded) return;

        this.gameEnded = true;
        this.physics.pause();
        this.clearLevelObjects();

        this.time.removeAllEvents(); 

        this.time.delayedCall(400, () => {
            if (this.isVaccinated) {
                this.postGameManager.showGameOverScreen();
            } else {
                this.hasShownQuiz = true;
                this.postGameManager.showLearningPhase();
            }
        });
    }

    update() {
        if (this.gameEnded) return;

        this.updatePlayerMovement();
        this.updateVirusesMovement();
        this.updateTimer();
        this.checkGameResult();
        this.updateHud();
    }
}