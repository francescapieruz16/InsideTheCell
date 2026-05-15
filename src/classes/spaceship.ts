import Phaser from 'phaser';

export default class Spaceship extends Phaser.Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    // Memorizza la dimensione della hitbox di riferimento (quella di 'nav_front')
    private static bodySize: { width: number, height: number } | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        // Chiama il costruttore del Phaser.Sprite originale
        super(scene, x, y, texture);

        // Aggiunge la navicella alla scena visiva e alla fisica
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Impostazioni base che avevi nel create()
        this.setCollideWorldBounds(true);

        // Inizializza i controlli
        this.cursors = scene.input.keyboard!.createCursorKeys();

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
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        const speed = 400;

        if (this.cursors.left.isDown) {
            body.setVelocityX(-speed);
            this.setTexture('nav_left');
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(speed);
            this.setTexture('nav_right');
        }

        if (this.cursors.up.isDown) {
            body.setVelocityY(-speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.setTexture('nav_back');
        } else if (this.cursors.down.isDown) {
            body.setVelocityY(speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.setTexture('nav_front');
        }

        body.velocity.normalize().scale(speed);
    }
}