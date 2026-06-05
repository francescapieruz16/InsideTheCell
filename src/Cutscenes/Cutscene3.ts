import Phaser from 'phaser';

export default class Cutscene2 extends Phaser.Scene {

    constructor() {
        super('Cutscene3');
    }

    create() {
        this.scene.start('Level3');
    }
}