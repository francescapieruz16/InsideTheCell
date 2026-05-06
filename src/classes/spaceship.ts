import Phaser from 'phaser';

export default class Spaceship extends Phaser.Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        // Chiama il costruttore del Phaser.Sprite originale
        super(scene, x, y, texture);

        // Aggiunge la navicella alla scena visiva e alla fisica
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Impostazioni base che avevi nel create()
        this.setScale(0.35);
        this.setCollideWorldBounds(true);

        // Inizializza i controlli
        this.cursors = scene.input.keyboard!.createCursorKeys();
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