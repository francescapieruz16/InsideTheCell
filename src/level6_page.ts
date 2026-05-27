import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';

type Point = {
    x: number;
    y: number;
};

type Direction = {
    x: number;
    y: number;
};

class Level6 extends Phaser.Scene {
    private bg!: Phaser.GameObjects.Image;

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
    private captureGoal = 0;
    private levelStartTime = 0;
    private remainingTimeMs = 0;

    private capturedText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;

    private mazeLeft = 0;
    private mazeTop = 0;
    private tileSize = 0;

    private playerSpawn: Point = { x: 0, y: 0 };
    private virusSpawnPoints: Point[] = [];
    private duplicationZones: Point[] = [];

    private readonly playerSpeed = 360;
    private readonly normalCaptureGoal = 10;
    private readonly vaccinatedCaptureGoal = 6;
    private readonly timeLimitMs = 30000;

    private readonly playerScale = 0.75;
    private readonly virusScale = 0.70;

    private readonly playerCollisionScale = 0.92;
    private readonly virusCollisionScale = 0.65;

    private readonly virusSpeed = 130;
    private readonly maxViruses = 16;
    private readonly duplicateCooldown = 3500;

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
        [1,4,0,0,0,0,0,0,1,0,1,0,3,0,0,0,0,1,0,0,0,0,0,0,0,4,0,1],
        [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1],
        [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,4,1],
        [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1],
        [1,0,0,0,1,4,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
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
        this.captureGoal = this.isVaccinated
            ? this.vaccinatedCaptureGoal
            : this.normalCaptureGoal;

        this.levelStartTime = 0;
        this.remainingTimeMs = this.timeLimitMs;

        this.playerSpawn = { x: 0, y: 0 };
        this.virusSpawnPoints = [];
        this.duplicationZones = [];
    }

    preload() {
        this.load.image(
            'background_level6',
            '/assets/level6/background_level_6.png'
        );

        this.load.image(
            'wall_level6',
            '/assets/level6/wall.png'
        );

        this.load.image(
            'player_level6',
            '/assets/level6/player.png'
        );

        this.load.image(
            'virus_level6',
            '/assets/level6/virus.png'
        );

        this.load.image(
            'ABI_standard',
            '/assets/tutorial/ABI/ABI_standard.png'
        );
    }

    create() {
        this.physics.resume();

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.textures.get('player_level6').setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        this.textures.get('virus_level6').setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        this.textures.get('wall_level6').setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        this.createBackground(width, height);
        this.createMaze(width, height);
        this.createPlayer();
        this.createViruses();
        this.createControls();
        this.createCollisionHandler();
        this.createHud(width, height);

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(6);

        this.hasStartedPlaying = true;
        this.levelStartTime = this.time.now;
        this.updateHud();
    }

    private createBackground(width: number, height: number) {
        this.bg = this.add.image(
            width / 2,
            height / 2,
            'background_level6'
        );

        this.bg.setOrigin(0.5);
        this.bg.setDepth(0);
        this.bg.setAlpha(0.9);

        const texture = this.textures
            .get('background_level6')
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
            0x001020,
            0.48
        ).setDepth(1);
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
                    const wall = this.walls.create(
                        center.x,
                        center.y,
                        'wall_level6'
                    ) as Phaser.Physics.Arcade.Image;

                    wall.setDisplaySize(this.tileSize, this.tileSize);
                    wall.setDepth(5);
                    wall.setAlpha(0.94);
                    wall.refreshBody();
                }

                if (value === 2) {
                    this.playerSpawn = center;
                }

                if (value === 3) {
                    this.duplicationZones.push(center);
                    this.createDuplicationZone(center.x, center.y);
                }

                if (value === 4) {
                    this.virusSpawnPoints.push(center);
                }
            }
        }
    }

    private createDuplicationZone(x: number, y: number) {
        const zone = this.add.circle(
            x,
            y,
            this.tileSize * 0.28,
            0xff3bd4,
            0.35
        );

        zone.setDepth(8);
        zone.setStrokeStyle(4, 0xff9beb, 0.9);

        this.tweens.add({
            targets: zone,
            scale: 1.35,
            alpha: 0.12,
            duration: 850,
            yoyo: true,
            repeat: -1
        });
    }

    private createPlayer() {
        this.player = this.physics.add.image(
            this.playerSpawn.x,
            this.playerSpawn.y,
            'player_level6'
        );

        this.player.setDepth(20);
        this.player.setDisplaySize(
            this.tileSize * this.playerScale,
            this.tileSize * this.playerScale
        );
        this.player.setCollideWorldBounds(false);

        const body = this.player.body as Phaser.Physics.Arcade.Body;

        body.setAllowGravity(false);
        body.setImmovable(false);
        body.setDrag(0, 0);
        body.setAcceleration(0, 0);
        body.setMaxVelocity(this.playerSpeed, this.playerSpeed);

        body.setSize(
            this.player.width * this.playerCollisionScale,
            this.player.height * this.playerCollisionScale,
            true
        );

        body.updateFromGameObject();
    }

    private createViruses() {
        this.viruses = this.physics.add.group();

        const spawnPoints = Phaser.Utils.Array.Shuffle([
            ...this.virusSpawnPoints
        ]).slice(0, this.captureGoal);

        spawnPoints.forEach((point) => {
            this.spawnVirus(point.x, point.y);
        });
    }

    private spawnVirus(x: number, y: number, startWithCooldown = false) {
        if (this.gameEnded) {
            return false;
        }

        if (this.viruses && this.viruses.countActive(true) >= this.maxViruses) {
            return false;
        }

        const virus = this.physics.add.image(
            x,
            y,
            'virus_level6'
        );

        virus.setDepth(18);

        virus.setDisplaySize(
            this.tileSize * this.virusScale,
            this.tileSize * this.virusScale
        );

        virus.setData('captured', false);
        virus.setData('direction', null);
        virus.setData('duplicatingSince', 0);
        virus.setData(
            'duplicateCooldownUntil',
            startWithCooldown
                ? this.time.now + this.duplicateCooldown
                : 0
        );

        const body = virus.body as Phaser.Physics.Arcade.Body;

        body.setAllowGravity(false);
        body.setBounce(0);
        body.setDrag(0, 0);
        body.setAcceleration(0, 0);
        body.setMaxVelocity(this.virusSpeed, this.virusSpeed);

        body.setSize(
            virus.width * this.virusCollisionScale,
            virus.height * this.virusCollisionScale,
            true
        );

        body.updateFromGameObject();

        this.viruses.add(virus);
        this.chooseRandomVirusDirection(virus);

        return true;
    }

    private createControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();

        this.keyW = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.W
        );

        this.keyA = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.A
        );

        this.keyS = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.S
        );

        this.keyD = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.D
        );
    }

    private createCollisionHandler() {
        this.physics.add.collider(this.player, this.walls);

        this.physics.add.collider(
            this.viruses,
            this.walls,
            (virusObject) => {
                const virus = virusObject as Phaser.Physics.Arcade.Image;

                this.centerObjectOnCurrentCell(virus);
                this.chooseRandomVirusDirection(virus);
            }
        );

        this.physics.add.overlap(
            this.player,
            this.viruses,
            (_, virusObject) => {
                this.captureVirus(
                    virusObject as Phaser.Physics.Arcade.Image
                );
            }
        );
    }
    

    private createHud(width: number, height: number) {
        const panelWidth = width * 0.62;
        const panelX = width / 2;
        const panelY = 55;

        const panelLeft = panelX - panelWidth / 2;
        const panelRight = panelX + panelWidth / 2;

        const panel = this.add.rectangle(
            panelX,
            panelY,
            panelWidth,
            78,
            0x001b1d,
            0.72
        );

        panel.setDepth(50);
        panel.setStrokeStyle(4, 0x88e6ff, 0.55);

        this.capturedText = this.add.text(
            panelLeft + 25,
            37,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '28px',
                color: '#39ff7a',
                stroke: '#003b18',
                strokeThickness: 5,
                resolution: 2
            }
        );

        this.capturedText.setDepth(60);
        this.capturedText.setOrigin(0, 0);

        this.timerText = this.add.text(
            panelRight - 25,
            37,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '28px',
                color: '#ffffff',
                stroke: '#001020',
                strokeThickness: 5,
                resolution: 2
            }
        );

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
        if (
            row < 0 ||
            row >= this.mazeGrid.length ||
            col < 0 ||
            col >= this.mazeGrid[0].length
        ) {
            return false;
        }

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

        if (!this.isWalkableCell(row, col)) {
            return;
        }

        const center = this.getCellCenter(row, col);

        const body = sprite.body as Phaser.Physics.Arcade.Body;

        body.reset(center.x, center.y);
        body.setVelocity(0, 0);
    }

    private chooseRandomVirusDirection(virus: Phaser.Physics.Arcade.Image) {
        if (!virus.active || !virus.body) {
            return;
        }

        const availableDirections = this.getAvailableDirectionsFromPosition(
            virus.x,
            virus.y
        );

        if (availableDirections.length === 0) {
            virus.setVelocity(0, 0);
            virus.setData('direction', null);
            return;
        }

        const direction = Phaser.Utils.Array.GetRandom(availableDirections);

        virus.setData('direction', direction);

        const body = virus.body as Phaser.Physics.Arcade.Body;

        body.setAcceleration(0, 0);
        body.setVelocity(0, 0);
        body.setMaxVelocity(this.virusSpeed, this.virusSpeed);

        body.setVelocity(
            direction.x * this.virusSpeed,
            direction.y * this.virusSpeed
        );
    }

    private getDuplicationZoneAt(x: number, y: number) {
        return this.duplicationZones.find((zone) => {
            const distance = Phaser.Math.Distance.Between(
                x,
                y,
                zone.x,
                zone.y
            );

            return distance < this.tileSize * 0.48;
        });
    }

    private getZoneKey(zone: Point) {
        const { row, col } = this.getGridPositionFromWorld(zone.x, zone.y);

        return `${row},${col}`;
    }

    private updateVirusDuplication(virus: Phaser.Physics.Arcade.Image) {
        if (!virus.active || !virus.body || this.gameEnded) {
            return;
        }

        if (this.viruses.countActive(true) >= this.maxViruses) {
            return;
        }

        const zone = this.getDuplicationZoneAt(virus.x, virus.y);

        if (!zone) {
            virus.setData('lastDuplicationZoneKey', null);
            return;
        }

        const zoneKey = this.getZoneKey(zone);
        const lastZoneKey = virus.getData('lastDuplicationZoneKey') as string | null;
        const cooldownUntil = virus.getData('duplicateCooldownUntil') as number;

        if (lastZoneKey === zoneKey) {
            return;
        }

        if (this.time.now < cooldownUntil) {
            return;
        }

        virus.setData('lastDuplicationZoneKey', zoneKey);
        virus.setData(
            'duplicateCooldownUntil',
            this.time.now + this.duplicateCooldown
        );

        const spawnPoint = this.getSafeDuplicateSpawnPoint(zone);

        const duplicated = this.spawnVirus(spawnPoint.x, spawnPoint.y, true);

        if (duplicated) {
            this.createDuplicationEffect(zone.x, zone.y);
        }
    }

    private getSafeDuplicateSpawnPoint(zone: Point) {
        const { row, col } = this.getGridPositionFromWorld(zone.x, zone.y);

        const shuffledDirections = Phaser.Utils.Array.Shuffle([
            ...this.directions
        ]);

        for (const direction of shuffledDirections) {
            const nextRow = row + direction.y;
            const nextCol = col + direction.x;

            if (!this.isWalkableCell(nextRow, nextCol)) {
                continue;
            }

            const center = this.getCellCenter(nextRow, nextCol);

            const isOccupied = this.viruses.children.getArray().some((child) => {
                const virus = child as Phaser.Physics.Arcade.Image;

                if (!virus.active) {
                    return false;
                }

                const distance = Phaser.Math.Distance.Between(
                    virus.x,
                    virus.y,
                    center.x,
                    center.y
                );

                return distance < this.tileSize * 0.35;
            });

            if (!isOccupied) {
                return center;
            }
        }

        return zone;
    }

    private createDuplicationEffect(x: number, y: number) {
        const flash = this.add.circle(
            x,
            y,
            this.tileSize * 0.36,
            0xff9beb,
            0.85
        );

        flash.setDepth(45);

        this.tweens.add({
            targets: flash,
            scale: 2.2,
            alpha: 0,
            duration: 360,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
    }

    private updateVirusesMovement() {
        if (!this.viruses) {
            return;
        }

        this.viruses.children.iterate((child) => {
            const virus = child as Phaser.Physics.Arcade.Image;

            if (!virus || !virus.active || !virus.body) {
                return true;
            }

            this.updateVirusDuplication(virus);

            const direction = virus.getData('direction') as Direction | null;

            if (!direction) {
                this.chooseRandomVirusDirection(virus);
                return true;
            }

            const { row, col } = this.getGridPositionFromWorld(
                virus.x,
                virus.y
            );

            if (!this.isWalkableCell(row, col)) {
                this.centerObjectOnCurrentCell(virus);
                this.chooseRandomVirusDirection(virus);
                return true;
            }

            const center = this.getCellCenter(row, col);

            if (direction.x !== 0) {
                virus.setY(center.y);
            }

            if (direction.y !== 0) {
                virus.setX(center.x);
            }

            const distanceFromCenter = Phaser.Math.Distance.Between(
                virus.x,
                virus.y,
                center.x,
                center.y
            );

            const nextRow = row + direction.y;
            const nextCol = col + direction.x;

            if (
                distanceFromCenter < 8 &&
                !this.isWalkableCell(nextRow, nextCol)
            ) {
                this.chooseRandomVirusDirection(virus);
                return true;
            }

            const body = virus.body as Phaser.Physics.Arcade.Body;

            body.setAcceleration(0, 0);
            body.setMaxVelocity(this.virusSpeed, this.virusSpeed);

            body.setVelocity(
                direction.x * this.virusSpeed,
                direction.y * this.virusSpeed
            );

            return true;
        });
    }

    private updatePlayerMovement() {
        if (!this.player || !this.player.body) {
            return;
        }

        let velocityX = 0;
        let velocityY = 0;

        const movingLeft = this.keyA.isDown || !!this.cursors.left?.isDown;
        const movingRight = this.keyD.isDown || !!this.cursors.right?.isDown;
        const movingUp = this.keyW.isDown || !!this.cursors.up?.isDown;
        const movingDown = this.keyS.isDown || !!this.cursors.down?.isDown;

        if (movingLeft) {
            velocityX -= this.playerSpeed;
        }

        if (movingRight) {
            velocityX += this.playerSpeed;
        }

        if (movingUp) {
            velocityY -= this.playerSpeed;
        }

        if (movingDown) {
            velocityY += this.playerSpeed;
        }

        if (velocityX !== 0 && velocityY !== 0) {
            const diagonalSpeed = this.playerSpeed / Math.SQRT2;

            velocityX = velocityX > 0 ? diagonalSpeed : -diagonalSpeed;
            velocityY = velocityY > 0 ? diagonalSpeed : -diagonalSpeed;
        }

        const body = this.player.body as Phaser.Physics.Arcade.Body;

        body.setAcceleration(0, 0);
        body.setMaxVelocity(this.playerSpeed, this.playerSpeed);
        body.setVelocity(0, 0);
        body.setVelocity(velocityX, velocityY);
    }

    private updateTimer() {
        if (!this.hasStartedPlaying || this.gameEnded) {
            return;
        }

        const elapsed = this.time.now - this.levelStartTime;

        this.remainingTimeMs = Math.max(0, this.timeLimitMs - elapsed);

        if (this.remainingTimeMs <= 0) {
            this.loseGame();
        }
    }

    private updateHud() {
        if (!this.capturedText || !this.timerText) {
            return;
        }

        const remainingSeconds = Math.ceil(this.remainingTimeMs / 1000);

        this.capturedText.setText(
            `VIRUSES: ${this.capturedViruses}/${this.captureGoal}`
        );

        this.timerText.setText(
            `TIME: ${remainingSeconds}`
        );
    }

    private captureVirus(virus: Phaser.Physics.Arcade.Image) {
        if (this.gameEnded || virus.getData('captured')) {
            return;
        }

        virus.setData('captured', true);
        this.capturedViruses++;

        this.createCaptureEffect(virus.x, virus.y);
        this.viruses.remove(virus, true, true);

        this.updateHud();

        if (this.capturedViruses >= this.captureGoal) {
            this.completeLevel();
        }
    }

    private createCaptureEffect(x: number, y: number) {
        const flash = this.add.circle(
            x,
            y,
            this.tileSize * 0.28,
            0x66ffcc,
            0.82
        );

        flash.setDepth(45);

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
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.physics.pause();
        this.clearLevelObjects();

        this.postGameManager.showWinScreen();
    }

    private loseGame() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.physics.pause();
        this.clearLevelObjects();

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

        this.updatePlayerMovement();
        this.updateVirusesMovement();
        this.updateTimer();
        this.updateHud();
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
            debug: false,
            gravity: {
                x: 0,
                y: 0
            }
        }
    },

    render: {
        roundPixels: true,
    },

    scene: [Level6]
};

new Phaser.Game(config);