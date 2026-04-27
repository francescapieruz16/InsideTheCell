import Phaser from 'phaser';

const SCREEN_W = 1280;
const SCREEN_H = 720;

// --- SCENA 1: ESTERNO DELLA CELLULA ---
class ExternalScene extends Phaser.Scene {
    // Il tipo cambia da Rectangle a Sprite
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private portal!: Phaser.GameObjects.Rectangle;
    private isTransitioning: boolean = false;

    constructor() {
        super('ExternalScene'); 
    }

    // NUOVO METODO: Carica le immagini in memoria prima di avviare la scena
    preload() {
        // I parametri sono: (Chiave univoca, Percorso del file)
        this.load.image('nav_front', '/assets/Navicella_Front.png');
        this.load.image('nav_back', '/assets/Navicella_Back.png');
        this.load.image('nav_left', '/assets/Navicella_Left.png');
        this.load.image('nav_right', '/assets/Navicella_Right.png');
    }

    create() {
        this.isTransitioning = false;
        
        const WORLD_SIZE = 4000;
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

        this.add.rectangle(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 0xe0f7fa);

        this.portal = this.add.rectangle(SCREEN_W, 200, 60, 60, 0x4caf50);
        this.physics.add.existing(this.portal, true);

        this.add.text(SCREEN_W, 140, 'Tocca per entrare', { color: '#000', fontSize: '24px' }).setOrigin(0.5);

        // GIOCATORE: Ora usiamo this.physics.add.sprite e passiamo la chiave dell'immagine iniziale
        this.player = this.physics.add.sprite(SCREEN_W, SCREEN_H, 'nav_front');

        this.player.setScale(0.35);
        
        // Assicuriamoci che mantenga i limiti del mondo
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        if (this.input.keyboard) this.cursors = this.input.keyboard.createCursorKeys();

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.fadeIn(500, 0, 0, 0);

        this.physics.add.overlap(this.player, this.portal, () => this.changeZone());
    }

    update() {
        if (this.isTransitioning || !this.cursors) return;
        this.handleMovement();
    }

    private handleMovement() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        const speed = 400;

        // Gestione asse X e cambio texture laterale
        if (this.cursors.left.isDown) {
            body.setVelocityX(-speed);
            this.player.setTexture('nav_left');
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(speed);
            this.player.setTexture('nav_right');
        }

        // Gestione asse Y e cambio texture verticale
        if (this.cursors.up.isDown) {
            body.setVelocityY(-speed);
            // Evita di sovrascrivere l'animazione laterale se ci si muove in diagonale
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
                this.player.setTexture('nav_back');
            }
        } else if (this.cursors.down.isDown) {
            body.setVelocityY(speed);
            // Evita di sovrascrivere l'animazione laterale se ci si muove in diagonale
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
                this.player.setTexture('nav_front');
            }
        }

        body.velocity.normalize().scale(speed);
    }

    private changeZone() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        this.cameras.main.fadeOut(800, 0, 0, 0);

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('InternalScene');
        });
    }
}

// --- SCENA 2: INTERNO DELLA CELLULA ---
class InternalScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('InternalScene');
    }

    create() {

        // Sfondo rosa per l'interno
        this.add.rectangle(SCREEN_W, SCREEN_H, SCREEN_W * 2, SCREEN_H * 2, 0xfce4ec);

        this.add.text(SCREEN_W, SCREEN_H - 100, 'Sei dentro la cellula', { color: '#000', fontSize: '32px' }).setOrigin(0.5);

        this.player = this.add.rectangle(SCREEN_W, SCREEN_H, 40, 40, 0xff5252);
        this.physics.add.existing(this.player);
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        if (this.input.keyboard) this.cursors = this.input.keyboard.createCursorKeys();

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Effetto di Fade In quando si entra nella nuova stanza
        this.cameras.main.fadeIn(800, 0, 0, 0);

        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);
    }

    update() {
        if (!this.cursors) return;
        
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        const speed = 400;

        if (this.cursors.left.isDown) body.setVelocityX(-speed);
        else if (this.cursors.right.isDown) body.setVelocityX(speed);

        if (this.cursors.up.isDown) body.setVelocityY(-speed);
        else if (this.cursors.down.isDown) body.setVelocityY(speed);

        body.velocity.normalize().scale(speed);
    }
}

// --- CONFIGURAZIONE E AVVIO ---
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: SCREEN_W,
    height: SCREEN_H,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    // ATTENZIONE QUI: Entrambe le scene devono essere registrate nell'array.
    // La prima scena dell'array è quella che viene avviata all'apertura del gioco.
    scene: [ExternalScene, InternalScene] 
};

const game = new Phaser.Game(config);