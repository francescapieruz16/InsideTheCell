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

type VirusRecord = {
    sprite: Phaser.Physics.Arcade.Image;
    nextDecisionAt: number;
    duplicatingSince: number;
};

class Level6 extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Image;
    private viruses!: Phaser.Physics.Arcade.Group;
    private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    private postGameManager!: PostGameManager;

    private backgroundScene!: Phaser.GameObjects.TileSprite;

    private isVaccinated = false;
    private hasShownQuiz = false;
    private gameEnded = false;

    private readonly tileSize = 150;

    private playerSpawn: Point = { x: 0, y: 0 };
    private virusSpawnPoints: Point[] = [];
    private duplicationZones: Point[] = [];
    private virusRecords: VirusRecord[] = [];

    private virusSpeed = 135;
    private duplicateDelay = 4200;
    private maxViruses = 10;

    private readonly directions: Direction[] = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
    ];

    // 0 = vuoto
    // 1 = muro animato
    // 2 = spawn player
    // 3 = zona finale / rilascio
    // 4, 6, 7, 8 = spawn virus
    // 5 = zona duplicazione
    private readonly mazeGrid = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,0,8,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
        [1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,1],
        [1,0,1,1,1,0,1,0,1,1,0,1,1,1,1,5,0,1,1,1],
        [1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
        [1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,1],
        [1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1],
        [1,4,0,0,1,6,0,0,0,0,1,0,1,0,1,0,0,0,0,1],
        [1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1],
        [1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1],
        [1,0,0,0,1,0,0,7,0,0,0,0,0,0,0,0,0,1,0,1],
        [1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,1,3,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    constructor() {
        super('Level6');
    }

    init(data: { vaccinated?: boolean } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;
        this.gameEnded = false;

        this.playerSpawn = { x: 0, y: 0 };
        this.virusSpawnPoints = [];
        this.duplicationZones = [];
        this.virusRecords = [];

        if (this.isVaccinated) {
            this.virusSpeed = 115;
            this.duplicateDelay = 6500;
            this.maxViruses = 14;
        } else {
            this.virusSpeed = 155;
            this.duplicateDelay = 3600;
            this.maxViruses = 9;
        }
    }

    preload() {
        this.load.image(
            'background_level6',
            '/assets/level6/background_level_6.png'
        );

        this.load.spritesheet(
            'wall_cytoskeleton_anim',
            '/assets/tutorial/sfondi/wall_spritesheet.png',
            {
                frameWidth: 313,
                frameHeight: 313
            }
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
        this.textures.get('player_level6').setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        this.textures.get('virus_level6').setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        this.createWallAnimation();

        const worldWidth = this.mazeGrid[0].length * this.tileSize;
        const worldHeight = this.mazeGrid.length * this.tileSize;

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        this.createBackground(worldWidth, worldHeight);

        this.player = this.physics.add.image(
            0,
            0,
            'player_level6'
        );

        this.player.setVisible(false);
        this.player.setDepth(20);

        this.setSmallArcadeCircleBody(
            this.player,
            120,
            22
        );

        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);
        playerBody.setAllowGravity(false);
        playerBody.setImmovable(false);
        playerBody.moves = true;

        this.createMaze();
        this.createViruses();
        this.createPhysicsInteractions();

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(0.72);
        this.cameras.main.fadeIn(800, 0, 0, 0);

        this.input.keyboard!.enabled = true;

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.wasd = this.input.keyboard!.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        }) as {
            W: Phaser.Input.Keyboard.Key;
            A: Phaser.Input.Keyboard.Key;
            S: Phaser.Input.Keyboard.Key;
            D: Phaser.Input.Keyboard.Key;
        };

        this.input.keyboard!.addCapture([
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.W,
            Phaser.Input.Keyboard.KeyCodes.A,
            Phaser.Input.Keyboard.KeyCodes.S,
            Phaser.Input.Keyboard.KeyCodes.D
        ]);

        this.game.canvas.setAttribute('tabindex', '0');
        this.game.canvas.focus();

        this.input.on('pointerdown', () => {
            this.game.canvas.focus();
        });

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(6);
    }

    private createWallAnimation() {
        if (this.anims.exists('wall_shimmer')) {
            return;
        }

        this.anims.create({
            key: 'wall_shimmer',
            frames: this.anims.generateFrameNumbers(
                'wall_cytoskeleton_anim',
                {
                    start: 0,
                    end: 3
                }
            ),
            frameRate: 2,
            repeat: -1,
            yoyo: true
        });
    }

    private createBackground(worldWidth: number, worldHeight: number) {
        this.backgroundScene = this.add.tileSprite(
            worldWidth / 2,
            worldHeight / 2,
            worldWidth,
            worldHeight,
            'background_level6'
        );

        this.backgroundScene.setDepth(-1);
        this.backgroundScene.setTileScale(0.55, 0.55);

        const overlay = this.add.rectangle(
            worldWidth / 2,
            worldHeight / 2,
            worldWidth,
            worldHeight,
            0x001020,
            0.10
        );

        overlay.setDepth(0);
    }

    private createMaze() {
        this.wallsGroup = this.physics.add.staticGroup();

        for (let row = 0; row < this.mazeGrid.length; row++) {
            for (let col = 0; col < this.mazeGrid[row].length; col++) {
                const cellValue = this.mazeGrid[row][col];

                const x = col * this.tileSize + this.tileSize / 2;
                const y = row * this.tileSize + this.tileSize / 2;

                if (cellValue === 1) {
                    const wall = this.wallsGroup.create(
                        x,
                        y,
                        'wall_cytoskeleton_anim'
                    ) as Phaser.Physics.Arcade.Sprite;

                    wall.setDisplaySize(
                        this.tileSize * 1.2,
                        this.tileSize * 1.2
                    );

                    wall.anims.play('wall_shimmer', true);
                    wall.setDepth(4);

                    const body = wall.body as Phaser.Physics.Arcade.StaticBody;

                    body.setSize(
                        this.tileSize * 0.62,
                        this.tileSize * 0.62
                    );

                    body.setOffset(
                        (wall.width - this.tileSize * 0.62) / 2,
                        (wall.height - this.tileSize * 0.62) / 2
                    );

                    wall.refreshBody();
                }

                if (cellValue === 2) {
                    this.playerSpawn = { x, y };
                    this.player.setPosition(x, y);
                    this.player.setVisible(true);
                }

                if (
                    cellValue === 4 ||
                    cellValue === 6 ||
                    cellValue === 7 ||
                    cellValue === 8
                ) {
                    this.virusSpawnPoints.push({ x, y });
                }

                if (cellValue === 5 || cellValue === 3) {
                    this.duplicationZones.push({ x, y });
                    this.createDuplicationZone(x, y);
                }
            }
        }
    }

    private createDuplicationZone(x: number, y: number) {
        const zone = this.add.circle(
            x,
            y,
            this.tileSize * 0.25,
            0xff3bd4,
            0.32
        );

        zone.setDepth(3);
        zone.setStrokeStyle(6, 0xff9beb, 0.9);

        this.tweens.add({
            targets: zone,
            scale: 1.35,
            alpha: 0.13,
            duration: 850,
            yoyo: true,
            repeat: -1
        });
    }

    private createViruses() {
        this.viruses = this.physics.add.group();

        this.virusSpawnPoints.forEach((point) => {
            this.spawnVirus(point.x, point.y);
        });
    }

    private setSmallArcadeCircleBody(
        sprite: Phaser.Physics.Arcade.Image,
        visualSize: number,
        collisionRadiusOnScreen: number
    ) {
        sprite.setDisplaySize(visualSize, visualSize);

        const body = sprite.body as Phaser.Physics.Arcade.Body;

        const scaleX = sprite.displayWidth / sprite.width;
        const radiusInTexturePixels = collisionRadiusOnScreen / scaleX;

        const offsetX = sprite.width / 2 - radiusInTexturePixels;
        const offsetY = sprite.height / 2 - radiusInTexturePixels;

        body.setCircle(
            radiusInTexturePixels,
            offsetX,
            offsetY
        );

        body.updateFromGameObject();
    }

    private spawnVirus(x: number, y: number) {
        if (this.gameEnded) {
            return;
        }

        if (this.virusRecords.length + 1 >= this.maxViruses) {
            this.loseGame();
            return;
        }

        const virus = this.physics.add.image(
            x,
            y,
            'virus_level6'
        );

        virus.setDepth(18);

        this.setSmallArcadeCircleBody(
            virus,
            108,
            22
        );

        virus.setCollideWorldBounds(true);

        this.viruses.add(virus);

        const record: VirusRecord = {
            sprite: virus,
            nextDecisionAt: 0,
            duplicatingSince: 0
        };

        this.virusRecords.push(record);
        this.chooseVirusDirection(record);
    }

    private createPhysicsInteractions() {
        this.physics.add.collider(this.player, this.wallsGroup);

        this.physics.add.collider(
            this.viruses,
            this.wallsGroup,
            (virusObject) => {
                const virus = virusObject as Phaser.Physics.Arcade.Image;
                const record = this.getVirusRecord(virus);

                if (record) {
                    record.nextDecisionAt = 0;
                    this.chooseVirusDirection(record);
                }
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

    private updateVirusAI() {
        if (this.gameEnded) {
            return;
        }

        this.virusRecords.forEach((record) => {
            const virus = record.sprite;

            if (!virus.active || !virus.body) {
                return;
            }

            const body = virus.body as Phaser.Physics.Arcade.Body;

            const isAlmostStopped =
                Math.abs(body.velocity.x) < 6 &&
                Math.abs(body.velocity.y) < 6;

            if (
                this.time.now >= record.nextDecisionAt ||
                isAlmostStopped
            ) {
                this.chooseVirusDirection(record);
            }

            this.updateVirusDuplication(record);
        });
    }

    private chooseVirusDirection(record: VirusRecord) {
        const virus = record.sprite;

        if (!virus.active) {
            return;
        }

        const availableDirections = this.directions.filter((direction) =>
            this.canMoveFrom(virus.x, virus.y, direction)
        );

        if (availableDirections.length === 0) {
            virus.setVelocity(0, 0);
            record.nextDecisionAt = this.time.now + 250;
            return;
        }

        let chosenDirection: Direction;

        if (
            this.duplicationZones.length > 0 &&
            Phaser.Math.Between(1, 100) <= 70
        ) {
            chosenDirection = this.pickDirectionTowardNearestZone(
                virus.x,
                virus.y,
                availableDirections
            );
        } else {
            chosenDirection = Phaser.Utils.Array.GetRandom(
                availableDirections
            );
        }

        virus.setVelocity(
            chosenDirection.x * this.virusSpeed,
            chosenDirection.y * this.virusSpeed
        );

        record.nextDecisionAt = this.time.now + Phaser.Math.Between(
            700,
            1300
        );
    }

    private canMoveFrom(
        x: number,
        y: number,
        direction: Direction
    ) {
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);

        const nextRow = row + direction.y;
        const nextCol = col + direction.x;

        if (
            nextRow < 0 ||
            nextRow >= this.mazeGrid.length ||
            nextCol < 0 ||
            nextCol >= this.mazeGrid[0].length
        ) {
            return false;
        }

        return this.mazeGrid[nextRow][nextCol] !== 1;
    }

    private pickDirectionTowardNearestZone(
        x: number,
        y: number,
        availableDirections: Direction[]
    ) {
        let bestDirection = availableDirections[0];
        let bestDistance = Number.MAX_SAFE_INTEGER;

        availableDirections.forEach((direction) => {
            const nextX = x + direction.x * this.tileSize;
            const nextY = y + direction.y * this.tileSize;

            const nearestDistance = this.getNearestZoneDistance(
                nextX,
                nextY
            );

            if (nearestDistance < bestDistance) {
                bestDistance = nearestDistance;
                bestDirection = direction;
            }
        });

        return bestDirection;
    }

    private getNearestZoneDistance(x: number, y: number) {
        let nearest = Number.MAX_SAFE_INTEGER;

        this.duplicationZones.forEach((zone) => {
            const distance = Phaser.Math.Distance.Between(
                x,
                y,
                zone.x,
                zone.y
            );

            nearest = Math.min(nearest, distance);
        });

        return nearest;
    }

    private updateVirusDuplication(record: VirusRecord) {
        const virus = record.sprite;

        const zone = this.duplicationZones.find((duplicationZone) => {
            const distance = Phaser.Math.Distance.Between(
                virus.x,
                virus.y,
                duplicationZone.x,
                duplicationZone.y
            );

            return distance < this.tileSize * 0.38;
        });

        if (!zone) {
            record.duplicatingSince = 0;
            return;
        }

        if (!record.duplicatingSince) {
            record.duplicatingSince = this.time.now;
            return;
        }

        if (this.time.now - record.duplicatingSince < this.duplicateDelay) {
            return;
        }

        record.duplicatingSince = 0;

        this.spawnVirus(
            zone.x + Phaser.Math.Between(-20, 20),
            zone.y + Phaser.Math.Between(-20, 20)
        );
    }

    private captureVirus(virus: Phaser.Physics.Arcade.Image) {
        if (this.gameEnded || !virus.active) {
            return;
        }

        this.createCaptureEffect(virus.x, virus.y);

        this.virusRecords = this.virusRecords.filter(
            (record) => record.sprite !== virus
        );

        this.viruses.remove(virus, true, true);

        if (this.virusRecords.length === 0) {
            this.completeLevel();
        }
    }

    private getVirusRecord(virus: Phaser.Physics.Arcade.Image) {
        return this.virusRecords.find(
            (record) => record.sprite === virus
        );
    }

    private createCaptureEffect(x: number, y: number) {
        const effect = this.add.circle(
            x,
            y,
            42,
            0x66ffcc,
            0.85
        );

        effect.setDepth(50);

        this.tweens.add({
            targets: effect,
            scale: 2.2,
            alpha: 0,
            duration: 320,
            ease: 'Power2',
            onComplete: () => {
                effect.destroy();
            }
        });
    }

    private completeLevel() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.physics.pause();

        this.virusRecords.forEach((record) => {
            record.sprite.destroy();
        });

        this.virusRecords = [];

        if (this.player) {
            this.player.destroy();
        }

        this.postGameManager.showWinScreen();
    }

    private loseGame() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.physics.pause();

        this.time.delayedCall(500, () => {
            if (this.isVaccinated) {
                this.postGameManager.showGameOverScreen();
            } else if (!this.hasShownQuiz) {
                this.hasShownQuiz = true;
                this.postGameManager.showLearningPhase();
            }
        });
    }

    private updatePlayerMovement() {
        const speed = 260;
        const body = this.player.body as Phaser.Physics.Arcade.Body;

        body.setVelocity(0, 0);

        const left =
            this.cursors.left?.isDown ||
            this.wasd.A.isDown;

        const right =
            this.cursors.right?.isDown ||
            this.wasd.D.isDown;

        const up =
            this.cursors.up?.isDown ||
            this.wasd.W.isDown;

        const down =
            this.cursors.down?.isDown ||
            this.wasd.S.isDown;

        if (left) {
            body.setVelocityX(-speed);
        } else if (right) {
            body.setVelocityX(speed);
        }

        if (up) {
            body.setVelocityY(-speed);
        } else if (down) {
            body.setVelocityY(speed);
        }

        if (body.velocity.length() > 0) {
            body.velocity.normalize().scale(speed);
        }
    }

    update() {
        if (this.gameEnded) {
            return;
        }

        this.updatePlayerMovement();
        this.updateVirusAI();

        this.backgroundScene.tilePositionX += 0.04;
        this.backgroundScene.tilePositionY += 0.02;
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
            debug: false
        }
    },

    render: {
        roundPixels: true,
        pixelArt: true
    },

    scene: [Level6]
};

new Phaser.Game(config);