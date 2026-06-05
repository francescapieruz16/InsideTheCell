import Phaser from 'phaser';

export default class Cutscene2 extends Phaser.Scene {

    constructor() {
        super('CutsceneFinalBoss');
    }

    create() {
        this.scene.start('FinalBoss');
    }
}