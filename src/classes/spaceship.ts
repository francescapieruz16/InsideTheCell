import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';

export default class Spaceship extends Phaser.Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    // Memorizza la dimensione della hitbox di riferimento (quella di 'nav_front')
    private static bodySize: { width: number, height: number } | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {

        // Chiama il costruttore del Phaser.Sprite originale
        super(scene, x, y, texture);
        
        scene.input.keyboard!.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT');

        // Aggiunge la navicella alla scena visiva e alla fisica
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        // Inizializza i controlli
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasd = {
            up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };

        // Questo codice viene eseguito DOPO che il corpo fisico è stato creato e adattato alla texture iniziale.
        const body = this.body as Phaser.Physics.Arcade.Body;

        // Se questa è la prima navicella creata (il riferimento non esiste) ED è quella 'frontale',
        // salviamo le dimensioni del suo corpo fisico. Questa diventerà la dimensione di riferimento.
        if (!Spaceship.bodySize && texture === 'nav_front') {
            Spaceship.bodySize = { width: body.width, height: body.height };
        }

        // Se la dimensione di riferimento esiste, la applichiamo.
        // Questo garantisce la coerenza anche se la navicella viene creata con una texture diversa (es. in Scene2).
        if (Spaceship.bodySize) {
            body.setSize(Spaceship.bodySize.width, Spaceship.bodySize.height);
        }
        
    }

    // Sovrascriviamo il metodo originale setTexture
    public setTexture(key: string, frame?: string | number): this {
        // Chiamiamo il metodo originale per cambiare la texture visiva.
        // Questo, di default, adatta anche la hitbox alla nuova immagine.
        super.setTexture(key, frame);

        // Se il corpo fisico esiste e abbiamo una dimensione di riferimento,
        // ripristiniamo immediatamente la nostra hitbox personalizzata.
        if (this.body && Spaceship.bodySize) {
            (this.body as Phaser.Physics.Arcade.Body).setSize(Spaceship.bodySize.width, Spaceship.bodySize.height);
        }

        return this;
    }

    // Spostiamo qui la vecchia funzione handleMovement
    update() {
        if (!this.body) return;
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        const speed = 400;

        body.setVelocity(0);

        const inputMode = this.scene.registry.get('inputMode');

        const left = this.cursors.left.isDown || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const up = this.cursors.up.isDown || this.wasd.up.isDown;
        const down = this.cursors.down.isDown || this.wasd.down.isDown;

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();

            if (tracker.targetX !== -1 && tracker.targetY !== -1) {
                const pixelX = tracker.targetX * this.scene.scale.gameSize.width;
                const pixelY = tracker.targetY * this.scene.scale.gameSize.height;

                const worldPoint = this.scene.cameras.main.getWorldPoint(pixelX, pixelY);

                const distance = Phaser.Math.Distance.Between(this.x, this.y, worldPoint.x, worldPoint.y);

                if (distance > 15) {
                    this.scene.physics.moveTo(this, worldPoint.x, worldPoint.y, speed);
                } else {
                    body.setVelocity(0);
                }
            }
        } else {
            if (left) {
                body.setVelocityX(-speed);
            } else if (right) {
                body.setVelocityX(speed);
            }

            // Gestione movimento verticale e texture fronte/retro
            if (up) {
                body.setVelocityY(-speed);
            } else if (down) {
                body.setVelocityY(speed);
            }
        }

        const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;

        if (isMoving) {
            // Se la velocità orizzontale è maggiore di quella verticale:
            if (Math.abs(body.velocity.x) > Math.abs(body.velocity.y)) {
                if (body.velocity.x < 0) {
                    this.setTexture('nav_left');
                } else {
                    this.setTexture('nav_right');
                }
            } 
            // Altrimenti, prevale il movimento verticale:
            else {
                if (body.velocity.y < 0) {
                    this.setTexture('nav_back');
                } else {
                    this.setTexture('nav_front');
                }
            }
        }
}
}