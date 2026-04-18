import Phaser from 'phaser';

class Level1 extends Phaser.Scene {
    private virusGroup!: Phaser.Physics.Arcade.Group;
    private receptorsGroup!: Phaser.Physics.Arcade.Group;
    private receptorVirusData = [
            { receptor: 'receptor_circle', virus: 'virus_circle', x: 200, y: 605 },
            { receptor: 'receptor_hexagon', virus: 'virus_hexagon', x: 600, y: 605 },
            { receptor: 'receptor_square', virus: 'virus_square', x: 1000, y: 605 },
            { receptor: 'receptor_triangle', virus: 'virus_triangle', x: 1400, y: 605 }
    ];
    private playerCart!: Phaser.Physics.Arcade.Sprite;
    private cartSpeed: number = 800;
    private cartFull: boolean = false;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private isGameOver: boolean = false;
    //-1 is left, 1 is right, 0 is stationary
    private moveDirection: number = 0;
    private progressBar!: Phaser.GameObjects.Graphics;
    private progressBox!: Phaser.GameObjects.Graphics;
    //time to win in ms
    private gameTime: number = 30000;
    private elapsedTime: number = 0;
    private isWin: boolean = false;
    //non vaccinated and vaccinated spawnrates
    private nonVaccinatedDelay: number = 1000;
    private vaccinatedDelay: number = 2000;

    constructor() {
        super('Level1');
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
    }

    create() {
        //add background image and scale it to fit the game dimensions
        const bg = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'background');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.receptorsGroup = this.physics.add.group();

        this.createReceptor();

        this.virusGroup = this.physics.add.group();

        this.time.addEvent({
            //modify the delay to increase/decrease the spawn rate of the viruses
            delay: this.nonVaccinatedDelay,
            callback: this.spawnVirus,
            callbackScope: this,
            loop: true
        });

        this.playerCart = this.physics.add.sprite(this.cameras.main.width / 2, 400, 'cart');
        this.playerCart.setScale(0.2);
        
        this.playerCart.setCollideWorldBounds(true); 

        this.playerCart.setMaxVelocity(this.cartSpeed, 0);
        this.playerCart.setDragX(3000);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        this.progressBox = this.add.graphics();
        this.progressBox.fillStyle(0x222222, 0.8);
        this.progressBox.fillRect(this.cameras.main.width / 2 - 200, 20, 400, 30);
        this.progressBar = this.add.graphics();

        this.physics.add.overlap(this.playerCart, this.virusGroup, this.catchVirus, undefined, this);

        this.physics.add.overlap(this.virusGroup, this.receptorsGroup, this.triggerGameOver, undefined, this);
    }

    createReceptor(){
        const rec1 = this.receptorsGroup.create(this.receptorVirusData[0].x, this.receptorVirusData[0].y, this.receptorVirusData[0].receptor);
        rec1.setScale(0.2); 
        rec1.refreshBody(); 
        const body1 = rec1.body as Phaser.Physics.Arcade.StaticBody;
        body1.setSize(80, 160); 
        body1.setOffset(0, 0);
        
        const rec2 = this.receptorsGroup.create(this.receptorVirusData[1].x, this.receptorVirusData[1].y, this.receptorVirusData[1].receptor);
        rec2.setScale(0.2); 
        rec2.refreshBody();
        const body2 = rec2.body as Phaser.Physics.Arcade.StaticBody;
        body2.setSize(80, 160); 
        body2.setOffset(0, 0);

        const rec3 = this.receptorsGroup.create(this.receptorVirusData[2].x, this.receptorVirusData[2].y, this.receptorVirusData[2].receptor);
        rec3.setScale(0.2); 
        rec3.refreshBody();
        const body3 = rec3.body as Phaser.Physics.Arcade.StaticBody;
        body3.setSize(80, 160); 
        body3.setOffset(0, 0);

        const rec4 = this.receptorsGroup.create(this.receptorVirusData[3].x, this.receptorVirusData[3].y, this.receptorVirusData[3].receptor);
        rec4.setScale(0.2); 
        rec4.refreshBody();
        const body4 = rec4.body as Phaser.Physics.Arcade.StaticBody;
        body4.setSize(80, 160); 
        body4.setOffset(0, 0);
    }

    spawnVirus() {
        const randomVirus = Phaser.Math.RND.pick(this.receptorVirusData);

        let virus = this.virusGroup.getFirstDead(false) as Phaser.Physics.Arcade.Sprite;

        if (!virus) {
            virus = this.virusGroup.create(randomVirus.x, -50, randomVirus.virus);
            virus.setScale(0.1);
        } else {
            virus.setTexture(randomVirus.virus);
            virus.enableBody(true, randomVirus.x, -50, true, true);
        }

        virus.setVelocityY(200);
    }

    update(time: number, delta: number) {
        if (this.isGameOver || this.isWin) return;

        this.elapsedTime += delta;

        const progress = Phaser.Math.Clamp(this.elapsedTime / this.gameTime, 0, 1);

        this.progressBar.clear();
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRect(this.cameras.main.width / 2 - 195, 25, 390 * progress, 20);

        if (progress >= 1 && !this.isGameOver) {
            this.triggerWin();
        }

        //keyboard input
        this.handleKeyboardInput();
        //TODO: implement camera input
        // this.handleCameraInput();

        this.virusGroup.children.iterate((child: Phaser.GameObjects.GameObject) => {
            const virus = child as Phaser.Physics.Arcade.Sprite;
            if (virus.active && virus.y > this.cameras.main.height + 50) {
                this.virusGroup.killAndHide(virus);
                virus.body?.stop();
            }
            return true;
        });
    }

    private handleKeyboardInput() {
        const accelerationForce = 4000; 

        if (this.cursors.left.isDown) {
            this.playerCart.setAccelerationX(-accelerationForce);
        } else if (this.cursors.right.isDown) {
            this.playerCart.setAccelerationX(accelerationForce);
        } else {
            this.playerCart.setAccelerationX(0);
        }
    }

    catchVirus(cartHit: any, virusHit: any) {
        this.virusGroup.killAndHide(virusHit);
        virusHit.body.stop();

        if (!this.cartFull) {
            this.cartFull = true; 
            this.playerCart.setTexture('cart_full');
        }
    }

    triggerGameOver(virusHit: any, receptorHit: any) {
        this.physics.pause();
        this.isGameOver = true;

        virusHit.setTint(0xff0000);
        receptorHit.setTint(0xff0000);

        const gameOverText = this.add.text(
            this.cameras.main.width / 2, 
            this.cameras.main.height / 2 - 200, 
            'GAME OVER', 
            { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }
        );
        gameOverText.setOrigin(0.5);
    }

    private triggerWin() {
    this.isWin = true;
    this.physics.pause();
    this.time.removeAllEvents();

    const winText = this.add.text(
        this.cameras.main.width / 2, 
        this.cameras.main.height / 2 - 200, 
        'YOU WON!', 
        { fontSize: '64px', color: '#00ff00', fontStyle: 'bold' }
    );
    winText.setOrigin(0.5);
}
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    render: {
        roundPixels: true
    },
    fps: {
        target: 60,
        forceSetTimeOut: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
            fixedStep: false
        }
    },
    scene: [Level1]
};

new Phaser.Game(config);