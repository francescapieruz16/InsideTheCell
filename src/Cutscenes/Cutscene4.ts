import Phaser from 'phaser';

export default class Cutscene2 extends Phaser.Scene {

    constructor() {
        super('Cutscene4');
    }

    create() {
        this.scene.start('Level4');
    }
}