const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d1d1d',
  scene: {
    preload,
    create,
    update
  }
};

new Phaser.Game(config);

function preload() {}

function create() {
  this.add.text(250, 250, 'Phaser funziona!', {
    fontSize: '32px',
    color: '#ffffff'
  });
}

function update() {}