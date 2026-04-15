import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
  }

  create(): void {
    this.add.text(250, 250, 'Phaser funziona!', {
      fontSize: '32px',
      color: '#ffffff'
    });
  }

  update(): void {
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#800080',
  scene: MainScene 
};

new Phaser.Game(config);