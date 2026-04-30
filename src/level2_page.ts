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
        this.drawDebugPaths();

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
        const p1 = new Phaser.Curves.Path(width * 0.08, height * 0.23);
        p1.splineTo([
            new Phaser.Math.Vector2(width * 0.18, height * 0.22), 
            new Phaser.Math.Vector2(width * 0.24, height * 0.18), // Inizio salita
            new Phaser.Math.Vector2(width * 0.29, height * 0.17), // CIMA della prima gobba (fondamentale)
            new Phaser.Math.Vector2(width * 0.33, height * 0.22), // Inizio discesa rapida
            new Phaser.Math.Vector2(width * 0.38, height * 0.38), // Curva verso il centro
            new Phaser.Math.Vector2(width * 0.45, height * 0.48), // Punto di incrocio centrale basso
            new Phaser.Math.Vector2(width * 0.58, height * 0.40), // Risalita verso la seconda gobba
            new Phaser.Math.Vector2(width * 0.70, height * 0.25), // Picco alto a destra
            new Phaser.Math.Vector2(width * 0.85, height * 0.32), 
            new Phaser.Math.Vector2(width * 0.94, height * 0.50)  // Ingresso portale
        ]);
        this.paths.push(p1);

        // PATH 2 - CENTRO-ALTO (Segue la linea marrone che passa sopra l'apparato di Golgi verde)
        const p2 = new Phaser.Curves.Path(width * 0.08, height * 0.46);
        p2.splineTo([
            new Phaser.Math.Vector2(width * 0.20, height * 0.47),
            new Phaser.Math.Vector2(width * 0.30, height * 0.43),
            new Phaser.Math.Vector2(width * 0.40, height * 0.41), // Gobba sopra il verde
            new Phaser.Math.Vector2(width * 0.55, height * 0.51), // Avvallamento
            new Phaser.Math.Vector2(width * 0.72, height * 0.47), // Gobba sopra il Golgi arancione
            new Phaser.Math.Vector2(width * 0.88, height * 0.48),
            new Phaser.Math.Vector2(width * 0.94, height * 0.52)
        ]);
        this.paths.push(p2);

        // PATH 3 - CENTRO-BASSO (Passa sopra il mitocondrio rosso centrale)
        const p3 = new Phaser.Curves.Path(width * 0.08, height * 0.69);
        p3.splineTo([
            new Phaser.Math.Vector2(width * 0.20, height * 0.65),
            new Phaser.Math.Vector2(width * 0.35, height * 0.58), // Picco sopra il mitocondrio
            new Phaser.Math.Vector2(width * 0.48, height * 0.65), // Discesa
            new Phaser.Math.Vector2(width * 0.62, height * 0.77), // Punto basso tra i due organelli
            new Phaser.Math.Vector2(width * 0.78, height * 0.76), // Segue la curva piatta
            new Phaser.Math.Vector2(width * 0.88, height * 0.68), // Risalita finale
            new Phaser.Math.Vector2(width * 0.94, height * 0.63)
        ]);
        this.paths.push(p3);

        // PATH 4 - BASSO (La linea più in basso di tutte)
        const p4 = new Phaser.Curves.Path(width * 0.08, height * 0.88);
        p4.splineTo([
            new Phaser.Math.Vector2(width * 0.25, height * 0.85),
            new Phaser.Math.Vector2(width * 0.38, height * 0.75), // Picco sopra l'organello viola
            new Phaser.Math.Vector2(width * 0.55, height * 0.85), // Discesa
            new Phaser.Math.Vector2(width * 0.72, height * 0.88), // Segue il bordo inferiore
            new Phaser.Math.Vector2(width * 0.88, height * 0.82), // Risalita verso portale
            new Phaser.Math.Vector2(width * 0.94, height * 0.68)
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