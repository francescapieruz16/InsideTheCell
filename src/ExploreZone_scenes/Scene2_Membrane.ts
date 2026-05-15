import Phaser from 'phaser';

import ABI from '../classes/abi';
import Spaceship from '../classes/spaceship'; // Assicurati che il percorso sia corretto

export default class Scene2_Membrane extends Phaser.Scene {
    private player!: Spaceship;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactKey!: Phaser.Input.Keyboard.Key;

    private startingTexture: string = 'nav_front';

    // Elementi della scena
    private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;
    private exitPortal!: Phaser.GameObjects.Sprite;
    private loreItemsGroup!: Phaser.Physics.Arcade.StaticGroup; // Per relitti e iceberg

    private abi!: ABI;

    private background_scene!: Phaser.GameObjects.TileSprite;

    preload() {
     
        this.load.image('wall_cytoskeleton', '/assets/tutorial/sfondi/wall_labyrinth2.png');        // Ipotetico filamento del citoscheletro o organello che fa da muro
        this.load.image('nuclear_pore', '/assets/tutorial/sfondi/nuclear_pore.png');     // L'uscita, ad esempio un poro nucleare
        this.load.image('background_scene2', '/assets/tutorial/sfondi/scene2_background.png'); 
        this.load.image('exit_portal', '/assets/tutorial/sfondi/exit_labyrinth.png') 
        this.load.image('viral_wreck', '/assets/tutorial/obstacles/viral_wreck.png');
        this.load.image('lipid_iceberg', '/assets/tutorial/obstacles/lipid_iceberg.png');         
    }

    constructor() {
        super('Scene2_Membrane');
    }

    init(data: any) {
        // Se il pacchetto dati contiene 'incomingTexture', lo salviamo
        if (data && data.incomingTexture) {
            this.startingTexture = data.incomingTexture;
        }
    }

    create() {
        // Imposta i limiti di mondo e telecamera a 2000x2000 (come in Scene1_External)
        const WORLD_SIZE = 5000;
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

        this.background_scene = this.add.tileSprite(
            WORLD_SIZE / 2, 
            WORLD_SIZE / 2, 
            WORLD_SIZE, 
            WORLD_SIZE, 
            'background_scene2'
        ).setDepth(-1); // Assicura che sia sempre il livello più basso
        
        // Ridimensiona il pattern dell'immagine all'interno del TileSprite (es. 0.5 = 50%)
        this.background_scene.setTileScale(0.5, 0.5);

        
        // Effetto di Fade In quando si entra nella nuova stanza
        this.cameras.main.fadeIn(800, 0, 0, 0);

        // 0 = Vuoto, 1 = Muro (Actina), 2 = Spawn, 3 = Uscita (Poro Nucleare), 4= relitto, 5= iceberg lipidico
        const mazeGrid = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,1,0,1,1,1,1,5,0,1,1,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,1,0,1],
            [1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1],
            [1,4,0,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,1],
            [1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1],
            [1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1],
            [1,1,1,0,0,0,1,1,1,1,1,3,1,1,1,1,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        // Imposta TILE_SIZE ad almeno 150 per garantire spazio fisico.
        const TILE_SIZE = 150;

        // Creiamo il gruppo statico per i muri
        this.wallsGroup = this.physics.add.staticGroup();

        this.loreItemsGroup = this.physics.add.staticGroup();
        
        let spawnX = 0;
        let spawnY = 0;
        
        // Cicliamo sulla matrice: 'row' è la riga (Y), 'col' è la colonna (X)
        for (let row = 0; row < mazeGrid.length; row++) {
            for (let col = 0; col < mazeGrid[row].length; col++) {
                
                const cellValue = mazeGrid[row][col];
                
                // Calcoliamo le coordinate reali moltiplicando indice per dimensione
                // Aggiungiamo TILE_SIZE/2 per centrare correttamente lo sprite
                const posX = (col * TILE_SIZE) + (TILE_SIZE / 2);
                const posY = (row * TILE_SIZE) + (TILE_SIZE / 2);

                if (cellValue === 1) {
                    // È un muro: crealo e mettilo nel gruppo
                    let wall = this.wallsGroup.create(posX, posY, 'wall_cytoskeleton');
                    // Moltiplica TILE_SIZE (es. per 1.2) per rendere il muro del 20% più grande e far sovrapporre meglio i blocchi
                    wall.setDisplaySize(TILE_SIZE * 1.2, TILE_SIZE * 1.2); 
                    wall.refreshBody(); // Aggiorna la hitbox statica
                } 
                else if (cellValue === 2) {
                    // È l'entrata: salviamo queste coordinate per la navicella
                    spawnX = posX;
                    spawnY = posY;
                }
                else if (cellValue === 3) {
                    // È l'uscita: creiamo il portale del nucleo
                    this.exitPortal = this.add.sprite(posX, posY, 'exit_portal');
                    this.exitPortal.setScale(0.2);
                    this.physics.add.existing(this.exitPortal, true);
                }
                else if (cellValue === 4) {
                    let wreck = this.loreItemsGroup.create(posX, posY, 'viral_wreck');
                    wreck.setDisplaySize(TILE_SIZE, TILE_SIZE);
                    // Salviamo i dati per riconoscerlo
                    wreck.setData('itemName', 'ViralWreck');
                    wreck.setData('hasBeenScanned', false);
                    wreck.refreshBody(); // Aggiorna la hitbox statica
                }
                else if (cellValue === 5) {
                    let iceberg = this.loreItemsGroup.create(posX, posY, 'lipid_iceberg');
                    iceberg.setDisplaySize(TILE_SIZE, TILE_SIZE);
                    // Salviamo i dati per riconoscerlo
                    iceberg.setData('itemName', 'CholesterolIceberg');
                    iceberg.setData('hasBeenScanned', false);
                    iceberg.refreshBody(); // Aggiorna la hitbox statica
                }
            }
        }

        
        // GIOCATORE: Usiamo la classe Spaceship e lo posizioniamo allo spawn
        this.player = new Spaceship(this, spawnX, spawnY, this.startingTexture);
        this.player.setScale(0.25); // La navicella è leggermente più piccola in questa scena
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        // INPUTS
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // FISICA: Aggiungiamo le collisioni
        this.physics.add.collider(this.player, this.wallsGroup);
        this.physics.add.overlap(this.player, this.exitPortal, this.exitScene, undefined, this);

        // ABI: Inizializziamo l'assistente e mostriamo un dialogo iniziale
        this.abi = new ABI(this);
        this.abi.showDialogue(
            "A.B.I.",
            "We're inside the cytoplasm! It's a maze of cytoskeletal filaments. We must navigate carefully to reach the nuclear pore, our next destination."
        );

        // L'Overlap fa scattare l'evento appena la navicella tocca lo sprite dell'oggetto
        this.physics.add.overlap(this.player, this.loreItemsGroup, (player, item) => {
            const loreItem = item as Phaser.Physics.Arcade.Sprite;

            // Se l'oggetto NON è stato scansionato e A.B.I. è libero
            if (!loreItem.getData('hasBeenScanned') && !this.abi.isTalking) {
                
                // 1. Segnalo come scansionato (non si ripeterà più)
                loreItem.setData('hasBeenScanned', true);
                
                // 2. Ferma immediatamente la navicella per comodità del giocatore
                (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

                // 3. Mostra il dialogo corrispondente
                if (loreItem.getData('itemName') === 'ViralWreck') {
                    this.abi.showDialogue("A.B.I.", [
                        "Warning. I am detecting the hardened remains of an unknown pathogen.",
                        "A previous viral incursion that failed to breach the cortical matrix and got entombed in the membrane.",
                        "A grim reminder of our mission's stakes. We must find the correct path."
                    ]);
                } 
                else if (loreItem.getData('itemName') === 'CholesterolIceberg') {
                    this.abi.showDialogue("A.B.I.", [
                        "Path blocked. Scanners show a massive accumulation of crystallized cholesterol molecules.",
                        "It seems the host organism has built up rigid 'lipid icebergs' within its fluid membrane.",
                        "Our drills cannot penetrate this density."
                    ]);
                }
            }
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

        // Altrimenti, se non sta parlando, gestiamo il movimento e lo sfondo
        this.handleMovement();

        // L'EFFETTO FLUIDO: come in Scene1, lo sfondo si muove
        this.background_scene.tilePositionX += 0.1;
        this.background_scene.tilePositionY += 0.05;
    }

    private handleMovement() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        const speed = 400;

        // Gestione asse X e cambio texture laterale
        if (this.cursors.left.isDown) {
            body.setVelocityX(-speed);
            this.player.setTexture('nav_left');
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(speed);
            this.player.setTexture('nav_right');
        }

        // Gestione asse Y e cambio texture verticale
        if (this.cursors.up.isDown) {
            body.setVelocityY(-speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
                this.player.setTexture('nav_back');
            }
        } else if (this.cursors.down.isDown) {
            body.setVelocityY(speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
                this.player.setTexture('nav_front');
            }
        }

        body.velocity.normalize().scale(speed);
    }

    private exitScene() {
        // Funzione per gestire la transizione alla scena successiva
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // this.scene.start('NextScene'); // TODO: Cambia con il nome della scena successiva
            console.log("Reached the exit!");
        });
    }
}