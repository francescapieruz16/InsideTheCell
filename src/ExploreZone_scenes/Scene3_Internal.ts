import Phaser from 'phaser';

import ABI from '../classes/abi';
import Spaceship from '../classes/spaceship';

export default class Scene3_Internal extends Phaser.Scene {

    private player!: Spaceship;
    private interactKey!: Phaser.Input.Keyboard.Key;

    private startingTexture: string = 'nav_front';

    private abi!: ABI;

    private background_scene!: Phaser.GameObjects.TileSprite;
    private background_deep!: Phaser.GameObjects.TileSprite;

    private lysosomesGroup!: Phaser.Physics.Arcade.StaticGroup;
    private mitochondriaGroup!: Phaser.Physics.Arcade.StaticGroup;

    private relWallsGroup!: Phaser.Physics.Arcade.StaticGroup;
    private rerWallsGroup!: Phaser.Physics.Arcade.StaticGroup;

    private golgiWallsGroup!: Phaser.Physics.Arcade.StaticGroup;

    preload() {
        // Carichiamo l'immagine che useremo per lo sfondo scorrevole
        this.load.image('background_scene3', '/assets/tutorial/sfondi/scene3_background4.png'); 
        this.load.image('organelle_lysosome', '/assets/tutorial/obstacles/lysosome4.png'); 
        this.load.image('organelle_mitochondrion', '/assets/tutorial/obstacles/mitochondrion2.png');
        this.load.image('organelle_golgi', '/assets/tutorial/obstacles/golgi3.png');
        this.load.image('golgi_wall', '/assets/tutorial/obstacles/golgi_wall.png');
        this.load.image('nucleo', '/assets/tutorial/obstacles/nucleo.png');
        this.load.image('organelle_rel_tile', '/assets/tutorial/obstacles/REL.png');
        this.load.image('organelle_rer_tile', '/assets/tutorial/obstacles/RER.png');
        this.load.image('background_deep', '/assets/tutorial/sfondi/scene3_background_deep.png');
    }

    constructor() {
        super('Scene3_Internal');
    }

    init(data: any) {
        // Se il pacchetto dati contiene 'incomingTexture', lo salviamo per la navicella
        if (data && data.incomingTexture) {
            this.startingTexture = data.incomingTexture;
        }
    }

    create() {
        // 1. Definiamo una dimensione molto grande per il nostro mondo di gioco
        const WORLD_SIZE = 6000;
        const CENTER_X = WORLD_SIZE / 2;
        const CENTER_Y = WORLD_SIZE / 2;

        // 2. Impostiamo i limiti della fisica e della telecamera a questa dimensione
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

        // 1. Sfondo profondo (fuori fuoco)
        this.background_deep = this.add.tileSprite(CENTER_X, CENTER_Y, WORLD_SIZE, WORLD_SIZE, 'background_deep')
            .setDepth(-2)
            .setTileScale(0.5, 0.5);

        // 2. Il tuo sfondo attuale (rimuovi il setDepth(-1) se lo avevi, 
        // per farlo stare sopra background_deep ma sotto gli organuli)
        this.background_scene = this.add.tileSprite(CENTER_X, CENTER_Y, WORLD_SIZE, WORLD_SIZE, 'background_scene3')
            .setDepth(-1)
            .setAlpha(0.75) // Leggermente trasparente per far intravedere il fondo!
            .setTileScale(0.25, 0.25);


        // --- 1. INIZIALIZZAZIONE GRUPPI ORGANULI ---
        this.lysosomesGroup = this.physics.add.staticGroup();
        this.mitochondriaGroup = this.physics.add.staticGroup();
        this.relWallsGroup = this.physics.add.staticGroup();
        this.rerWallsGroup = this.physics.add.staticGroup();

            
        const MITO_WIDTH = 500;
        const MITO_HEIGHT = 300;
        // Struttura:
        // visX, visY, angle: Dove appare il disegno e come è ruotato
        // hitX, hitY, hitW, hitH: Le coordinate ASSOLUTE NEL MONDO e le dimensioni del muro invisibile
        const mitochondriaPositions = [
            { 
                visX: 4443, visY: 4815, angle: 0, 
                hitX: 4443, hitY: 4815, hitW: 480, hitH: 280 
            },
            { 
                visX: 1560, visY: 5457, angle: 15, 
                hitX: 1560, hitY: 5457, hitW: 480, hitH: 300 
            },
            { 
                visX: 742, visY: 4452, angle: 45, 
                hitX: 742, hitY: 4452, hitW: 400, hitH: 450 
            },
            { 
                visX: 4842, visY: 3670, angle: 315, 
                hitX: 4842, hitY: 3670, hitW: 400, hitH: 450 
            }
        ];

       

        mitochondriaPositions.forEach(pos => {
            
            // --- 1. PARTE VISIVA (Nessuna fisica, solo grafica) ---
            // Aggiungiamo l'aura luminosa
            const glow = this.add.image(pos.visX, pos.visY, 'organelle_mitochondrion');
            glow.setDisplaySize(MITO_WIDTH * 1.2, MITO_HEIGHT * 1.2); 
            glow.setAngle(pos.angle); 
            glow.setTint(0xffaa00); 
            glow.setBlendMode(Phaser.BlendModes.ADD); 
            glow.setAlpha(0.3); 
            glow.setDepth(0); 

            this.tweens.add({
                targets: glow,
                alpha: 0.6,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Aggiungiamo l'organulo visivo
            const mitoVisual = this.add.image(pos.visX, pos.visY, 'organelle_mitochondrion');
            mitoVisual.setDisplaySize(MITO_WIDTH, MITO_HEIGHT);
            mitoVisual.setAngle(pos.angle);
            mitoVisual.setDepth(1);


            // --- 2. PARTE FISICA (Coordinate assolute nel mondo) ---
            // Creiamo un rettangolo invisibile nel gruppo statico usando le tue coordinate esatte
            const hitZone = this.add.zone(pos.hitX, pos.hitY, pos.hitW, pos.hitH);
            this.physics.add.existing(hitZone, true); // true = corpo statico
            
            // Aggiungiamo la zona al gruppo per la collisione
            this.mitochondriaGroup.add(hitZone);
        });

        // Fai la stessa identica cosa per i Lisosomi
        const lysosomesPositions = [
          { x: 4124, y: 5387 },
            { x: 1129, y: 4931 },
            { x: 2276, y: 4745 },
            { x: 3685, y: 4401 },
            { x: 4096, y: 3218 },
            { x: 5691, y: 4196 },
            { x: 1670, y: 3349 },
        ];

        lysosomesPositions.forEach(pos => {
            const lysosome = this.lysosomesGroup.create(pos.x, pos.y, 'organelle_lysosome');
            lysosome.setDisplaySize(120, 120);
            
            const lysoBody = lysosome.body as Phaser.Physics.Arcade.Body;
            lysoBody.setSize(120, 120);
            lysoBody.updateFromGameObject();
        });

        // 4. Creiamo il giocatore
        this.player = new Spaceship(this, CENTER_X, WORLD_SIZE - 300, this.startingTexture);        this.player.setScale(0.3); // Impostiamo una scala per la navicella
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);


    //     // --- APPARATO DI GOLGI (Ostacolo + Corrente) ---

    //   // 1. Creiamo lo sprite visibile e solido (le cisterne del Golgi)
    //     const GOLGI_X = 1500;
    //     const GOLGI_Y = 2500; // Posizionato a nord del punto di spawn
        
    //     const golgi = this.physics.add.staticImage(GOLGI_X, GOLGI_Y, 'organelle_golgi');
        
    //     // 2. Impostiamo le dimensioni visive
    //     golgi.setDisplaySize(1200, 600);
        
    //     // 3. FONDAMENTALE: Questo comando dice ad Arcade Physics di ricalcolare 
    //     // e centrare la hitbox basandosi sulla nuova dimensione visiva.
    //     golgi.refreshBody();
        
    //     // La navicella colliderà fisicamente con le cisterne
    //     this.physics.add.collider(this.player, golgi);

        // --- APPARATO DI GOLGI (Mini-Labirinto Locale) ---

        this.golgiWallsGroup = this.physics.add.staticGroup();

        // // Punto di partenza del Golgi nel mondo
        // const GOLGI_START_X = 100;
        // const GOLGI_START_Y = 1000;
        
        // // Dimensione del singolo blocco (non troppo grande, per permettere manovre)
        // const G_TILE = 128; 

// =========================================================
        // --- APPARATO DI GOLGI (Macro-Sprite Statico) ---
        // =========================================================
        const GOLGI_X = 700;
        const GOLGI_Y = 2900; 
        const GOLGI_WIDTH = 1200;
        const GOLGI_HEIGHT = 600;

        // 1. Creiamo l'immagine statica con fisica
        const golgi = this.physics.add.staticImage(GOLGI_X, GOLGI_Y, 'organelle_golgi');
        
        // 2. Impostiamo la dimensione visiva desiderata
        golgi.setDisplaySize(GOLGI_WIDTH, GOLGI_HEIGHT);
        
        // 3. FONDAMENTALE: Sincronizziamo la hitbox con le nuove dimensioni visive.
        // Questo evita qualsiasi disallineamento o sfasamento geometrico.
        golgi.refreshBody();
        
        this.physics.add.collider(this.player, golgi);


    // NUCLEO
        const NUCLEUS_X = WORLD_SIZE / 2; // Centriamo il nucleo orizzontalmente
        const NUCLEUS_SIZE = 800;
        const NUCLEUS_Y = NUCLEUS_SIZE / 2 + 50; // Posizioniamo il nucleo in alto, lasciando spazio per la navicella

        const nucleus = this.physics.add.staticImage(NUCLEUS_X, NUCLEUS_Y, 'nucleo');
        nucleus.setDisplaySize(NUCLEUS_SIZE, NUCLEUS_SIZE);
        nucleus.refreshBody();
        this.physics.add.collider(this.player, nucleus);
        // 1 = Muro della cisterna, 0 = Spazio vuoto/lume
        // 1 = Muro della cisterna, 0 = Spazio vuoto navigabile


        // const golgiGrid = [
        //     [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
        //     [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
        //     [0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0],
        //     [1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1],
        //     [1,1,0,0,0,1,1,1,1,1,1,0,0,0,1,1],
        //     [1,1,0,0,1,1,1,1,1,1,1,1,0,0,1,1],
        //     [1,1,0,0,1,1,0,0,0,0,1,1,0,0,0,0], // <-- Uscita / Entrata Est
        //     [1,1,0,0,1,1,0,0,0,0,1,1,0,0,0,0], // <-- Uscita / Entrata Est
        //     [1,1,0,0,1,1,0,0,1,1,1,1,0,0,1,1],
        //     [1,1,0,0,1,1,0,0,1,1,1,1,0,0,1,1],
        //     [1,1,0,0,0,0,0,0,0,0,1,1,0,0,1,1], // <-- Connessione corridoi
        //     [0,1,1,0,0,0,0,0,0,0,1,1,0,0,1,1], // <-- Connessione corridoi
        //     [0,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1],
        //     [0,0,1,1,1,0,0,1,1,1,1,0,0,1,1,0],
        //     [0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0],
        //     [0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0]
        // ];

        // // Costruiamo la griglia leggendo la matrice
        // for (let row = 0; row < golgiGrid.length; row++) {
        //     for (let col = 0; col < golgiGrid[row].length; col++) {
                
        //         if (golgiGrid[row][col] === 1) {
        //             // Calcoliamo la posizione assoluta sommando l'offset iniziale
        //             const posX = GOLGI_START_X + (col * G_TILE) + (G_TILE / 2);
        //             const posY = GOLGI_START_Y + (row * G_TILE) + (G_TILE / 2);

        //             // Assicurati di caricare 'golgi_wall_tile' nel preload()
        //             const wall = this.golgiWallsGroup.create(posX, posY, 'golgi_wall');
        //             wall.scale=1.25;
                    
        //             wall.setDisplaySize(G_TILE, G_TILE);
                    
        //             const wallBody = wall.body as Phaser.Physics.Arcade.Body;
        //             wallBody.setSize(G_TILE, G_TILE);
        //             wallBody.updateFromGameObject();
        //         }
        //     }
        // }
        
        // // Collisione con i muri del Golgi
        // this.physics.add.collider(this.player, this.golgiWallsGroup);

        // =========================================================
        // --- RETICOLO ENDOPLASMATICO (Matrice Unificata REL + RER) ---
        // =========================================================
        
        this.relWallsGroup = this.physics.add.staticGroup();
        this.rerWallsGroup = this.physics.add.staticGroup();

        const ER_TILE_W = 128; // Esempio: largo il doppio
        const ER_TILE_H = 128;  // Altezza invariata
        
        // Posizioniamo l'intera struttura al centro, sotto il Nucleo
        const ER_START_X = 500; 
        const ER_START_Y = 700; 

        // 0 = Lume (Vuoto), 1 = REL (Liscio), 2 = RER (Ruvido con Ribosomi)
        const erGrid = [
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0], // Ex R1
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0], // Ex R3
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0], // Ex R5
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0], // Ex R7
    [0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0], // Ex R9
    [0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,2,2,2,2,0,0,1,1,0,0,0,0], // Ex R11
    [0,0,1,1,0,0,0,0,2,2,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,0,0,0,0], // Ex R13
    [0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,2,2,2,2,0,0,0,0], // Ex R15
    [2,2,2,2,2,2,2,2,2,2,0,0,0,0,2,2,2,2,2,2,2,2,0,0,2,2,0,0,1,1,1,1,2,2,2,2,2,2,0,0,0,0], // Ex R17
    [0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2], // Ex R19
    [0,0,2,2,2,2,2,2,2,2,0,0,2,2,0,0,2,2,2,2,2,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,2,0,0,0,0], // Ex R21
    [0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,0,0,0,0]  // Ex R23
];

        // Generazione procedurale dell'intero labirinto ER
        // Generazione procedurale del labirinto ER rettangolare
        for (let row = 0; row < erGrid.length; row++) {
            for (let col = 0; col < erGrid[row].length; col++) {
                
                const cellValue = erGrid[row][col];
                
                if (cellValue !== 0) {
                    // Calcolo di posX usando la LARGHEZZA
                    const posX = ER_START_X + (col * ER_TILE_W) + (ER_TILE_W / 2);
                    // Calcolo di posY usando l'ALTEZZA
                    const posY = ER_START_Y + (row * ER_TILE_H) + (ER_TILE_H / 2);
                    
                    let wall;

                    if (cellValue === 1) {
                        wall = this.relWallsGroup.create(posX, posY, 'organelle_rel_tile');
                    } else if (cellValue === 2) {
                        wall = this.rerWallsGroup.create(posX, posY, 'organelle_rer_tile');
                    }

                    if (wall) {
                        // Applica la nuova forma rettangolare e allinea l'hitbox
                        wall.setDisplaySize(ER_TILE_W, ER_TILE_H);
                        wall.refreshBody(); 
                    }
                }
            }
        }

        //Collisioni tra giocatore e organuli
        this.physics.add.collider(this.player, this.lysosomesGroup);
        this.physics.add.collider(this.player, this.mitochondriaGroup);

        this.physics.add.collider(this.player, this.relWallsGroup);
        this.physics.add.collider(this.player, this.rerWallsGroup);

        // 5. La telecamera segue il giocatore
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.fadeIn(800, 0, 0, 0); // Effetto di transizione in entrata

        // 6. Inizializziamo l'assistente A.B.I.
        this.abi = new ABI(this);

        // INPUTS
                if (this.input.keyboard) {
                    // this.cursors = this.input.keyboard.createCursorKeys();
                    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
                    this.input.keyboard.on('keydown-ESC', () => {
                        // Se A.B.I. sta parlando, potresti voler bloccare la pausa per evitare conflitti grafici
                        if (!this.abi.isTalking) {
                            this.scene.pause();
                            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
                        }
                    });
                }

        // Messaggio di benvenuto da A.B.I.
        this.abi.showDialogue(
            "A.B.I.",
            "We have successfully entered the cytoplasm. The environment is vast and teeming with organelles. Our next objective is to locate the Endoplasmic Reticulum."
        );

        // DEBUG: Clicca col mouse per ottenere le coordinate esatte
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // pointer.worldX e worldY tengono conto dello scorrimento della telecamera
            console.log(`{ x: ${Math.round(pointer.worldX)}, y: ${Math.round(pointer.worldY)} },`);
        });


        // --- CONTROLLO DINAMICO DELLO ZOOM CON IL MOUSE ---
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
            // Ottieni lo zoom attuale
            let currentZoom = this.cameras.main.zoom;

            // Se deltaY è positivo si sta scorrendo in basso (zoom out), altrimenti in alto (zoom in)
            if (deltaY > 0) {
                currentZoom -= 0.05; // Allontana
            } else {
                currentZoom += 0.05; // Avvicina
            }

            // Limitiamo lo zoom per evitare che vada a valori negativi o troppo alti
            // Minimo 0.15 (visione amplissima), Massimo 1.5 (molto vicino)
            currentZoom = Phaser.Math.Clamp(currentZoom, 0.15, 1.5);

            // Applica il nuovo zoom
            this.cameras.main.setZoom(currentZoom);
        });
    }

    update() {
        // Se ABI sta parlando, blocchiamo il gioco e aspettiamo l'input
        if (this.abi.isTalking) {
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                this.abi.nextDialoguePage();
            }
            return; // Interrompe l'update qui per non processare il movimento
        }

        // Altrimenti, gestiamo il movimento del giocatore
        this.player.update();

        // Facciamo scorrere lo sfondo per dare un'illusione di movimento e profondità
        this.background_scene.tilePositionX += 0.25;
        this.background_scene.tilePositionY += 0.15;

        this.background_deep.tilePositionX += 0.10;
        this.background_deep.tilePositionY += 0.05;
    }
}