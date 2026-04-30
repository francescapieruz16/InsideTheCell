import { Vector } from 'matter';
import Phaser from 'phaser';

class Level2 extends Phaser.Scene {
    private paths: Phaser.Curves.Path[] = [];
    private graphics!: Phaser.GameObjects.Graphics;
    private virusKeys = ['virus_circle', 'virus_square', 'virus_triangle', 'virus_hexagon'];

    constructor() {
        super('Level2');
    }

    preload() {
        this.load.image('background_level_2', '/assets/level 2/background_level_2.png');
        this.virusKeys.forEach(key => {
            this.load.image(key, `/assets/level1/${key}.png`);
        });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Sfondo adattato alla finestra
        const bg = this.add.image(width / 2, height / 2, 'background_level_2');
        bg.setDisplaySize(width, height);
        bg.setDepth(0);

        // 2. Sistema di registrazione click (per rifiniture dell'ultimo secondo)
        this.setupPathRecorder(width, height);

        // 3. Generazione percorsi basata sull'immagine image_f0285a.jpg
        this.createPaths(width, height);

        // 4. Disegno linee rosse di debug
        //this.drawDebugPaths();

        // 5. Spawn dei virus
        this.time.addEvent({
            delay: 1500,
            loop: true,
            callback: () => this.spawnVirus()
        });
    }

    private setupPathRecorder(width: number, height: number) {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const xPct = (pointer.x / width).toFixed(3);
            const yPct = (pointer.y / height).toFixed(3);
            console.log(`width * ${xPct}, height * ${yPct},`);
            
            const dot = this.add.circle(pointer.x, pointer.y, 4, 0xff0000);
            this.tweens.add({ targets: dot, alpha: 0, duration: 800, onComplete: () => dot.destroy() });
        });
    }

    private createPaths(width: number, height: number) {
        this.paths = [];

        // PATH 1 - ALTO (Ricalibrato per la curva a gomito iniziale)
        const p1 = new Phaser.Curves.Path(width * 0.08, height * 0.14);
        p1.splineTo([
            new Phaser.Math.Vector2(width * 0.18, height * 0.20), 
            new Phaser.Math.Vector2(width * 0.24, height * 0.22),
            new Phaser.Math.Vector2(width * 0.29, height * 0.12),
            new Phaser.Math.Vector2(width * 0.32, height * 0.11),
            new Phaser.Math.Vector2(width * 0.34, height * 0.13),
            new Phaser.Math.Vector2(width * 0.38, height * 0.25),
            new Phaser.Math.Vector2(width * 0.45, height * 0.28),
            new Phaser.Math.Vector2(width * 0.53, height * 0.21),
            new Phaser.Math.Vector2(width * 0.62, height * 0.27),
            new Phaser.Math.Vector2(width * 0.75, height * 0.20),
            new Phaser.Math.Vector2(width * 0.84, height * 0.34), 
            new Phaser.Math.Vector2(width * 0.90, height * 0.38),
            new Phaser.Math.Vector2(width * 0.92, height * 0.48),
        ]);
        this.paths.push(p1);

        // PATH 2 - CENTRO-ALTO (Segue la linea marrone che passa sopra l'apparato di Golgi verde)
        const p2 = new Phaser.Curves.Path(width * 0.06, height * 0.43);
        p2.splineTo([
            new Phaser.Math.Vector2(width * 0.20, height * 0.42),
            new Phaser.Math.Vector2(width * 0.30, height * 0.39),
            new Phaser.Math.Vector2(width * 0.37, height * 0.40),
            new Phaser.Math.Vector2(width * 0.43, height * 0.35),
            new Phaser.Math.Vector2(width * 0.52, height * 0.40), 
            new Phaser.Math.Vector2(width * 0.62, height * 0.40), 
            new Phaser.Math.Vector2(width * 0.68, height * 0.44), 
            new Phaser.Math.Vector2(width * 0.75, height * 0.42), 
            new Phaser.Math.Vector2(width * 0.80, height * 0.50), 
            new Phaser.Math.Vector2(width * 0.85, height * 0.52),
            new Phaser.Math.Vector2(width * 0.90, height * 0.52)
        ]);
        this.paths.push(p2);

        // PATH 3 - CENTRO-BASSO (Passa sopra il mitocondrio rosso centrale)
        const p3 = new Phaser.Curves.Path(width * 0.06, height * 0.69);
        p3.splineTo([
            new Phaser.Math.Vector2(width * 0.13, height * 0.68), 
            new Phaser.Math.Vector2(width * 0.18, height * 0.62), 
            new Phaser.Math.Vector2(width * 0.23, height * 0.60),
            new Phaser.Math.Vector2(width * 0.27, height * 0.60),
            new Phaser.Math.Vector2(width * 0.35, height * 0.54),
            new Phaser.Math.Vector2(width * 0.46, height * 0.64),
            new Phaser.Math.Vector2(width * 0.55, height * 0.61),
            new Phaser.Math.Vector2(width * 0.60, height * 0.63),
            new Phaser.Math.Vector2(width * 0.66, height * 0.71),
            new Phaser.Math.Vector2(width * 0.73, height * 0.65),
            new Phaser.Math.Vector2(width * 0.78, height * 0.63),
            new Phaser.Math.Vector2(width * 0.83, height * 0.58),
            new Phaser.Math.Vector2(width * 0.88, height * 0.58),
            new Phaser.Math.Vector2(width * 0.90, height * 0.58)
        ]);
        this.paths.push(p3);

        // PATH 4 - BASSO (La linea più in basso di tutte)
        const p4 = new Phaser.Curves.Path(width * 0.12, height * 0.91);
        p4.splineTo([
            new Phaser.Math.Vector2(width * 0.18, height * 0.91),
            new Phaser.Math.Vector2(width * 0.25, height * 0.86),
            new Phaser.Math.Vector2(width * 0.30, height * 0.85),
            new Phaser.Math.Vector2(width * 0.38, height * 0.75),
            new Phaser.Math.Vector2(width * 0.43, height * 0.75),
            new Phaser.Math.Vector2(width * 0.50, height * 0.86),
            new Phaser.Math.Vector2(width * 0.58, height * 0.84),
            new Phaser.Math.Vector2(width * 0.69, height * 0.89),
            new Phaser.Math.Vector2(width * 0.86, height * 0.78), // Risalita verso portale
            new Phaser.Math.Vector2(width * 0.90, height * 0.60)
        ]);
        this.paths.push(p4);
    }

    private spawnVirus() {
        const path = Phaser.Utils.Array.GetRandom(this.paths);
        const virusKey = Phaser.Utils.Array.GetRandom(this.virusKeys);

        const virus = this.add.sprite(0, 0, virusKey);
        virus.setDisplaySize(40, 40);
        virus.setDepth(10);

        const follower = { t: 0 };
        this.tweens.add({
            targets: follower,
            t: 1,
            duration: 7000,
            ease: 'Linear',
            onUpdate: () => {
                const point = path.getPoint(follower.t);
                if (point) virus.setPosition(point.x, point.y);
            },
            onComplete: () => virus.destroy()
        });
    }

    private drawDebugPaths() {
        if (this.graphics) this.graphics.destroy();
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(3, 0xff0000, 1);
        this.graphics.setDepth(100);
        this.paths.forEach(p => p.draw(this.graphics));
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    scene: [Level2]
};

new Phaser.Game(config);