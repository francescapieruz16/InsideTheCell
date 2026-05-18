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

    private isTransitioning: boolean = false;

    preload() {
     
        //this.load.image('wall_cytoskeleton', '/assets/tutorial/sfondi/wall_labyrinth2.png');        // Ipotetico filamento del citoscheletro o organello che fa da muro
        this.load.image('background_scene2', '/assets/tutorial/sfondi/scene2_background.png'); 
        this.load.image('exit_portal', '/assets/tutorial/sfondi/exit_labyrinth3.png') 
        this.load.image('viral_wreck', '/assets/tutorial/obstacles/viral_wreck.png');
        this.load.image('lipid_iceberg', '/assets/tutorial/obstacles/lipid_iceberg.png');    
        this.load.spritesheet('wall_cytoskeleton_anim', '/assets/tutorial/sfondi/wall_spritesheet.png', {
            frameWidth: 313, // La larghezza di UN singolo fotogramma nel PNG
            frameHeight: 313 // L'altezza del fotogramma
        });     
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

        this.isTransitioning = false;

        // 0 = Vuoto, 1 = Muro (Actina), 2 = Spawn, 3 = Uscita (Poro Nucleare), 4= relitto, 5= iceberg lipidico, 6=messaggio1, 7=messaggio2
        const mazeGrid = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,0,8,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,1,0,1,1,1,1,5,0,1,1,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,1,0,1],
            [1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1],
            [1,4,0,0,1,6,0,0,0,0,1,0,1,0,1,0,0,0,0,1],
            [1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1],
            [1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,1,0,0,7,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,1,3,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        // Imposta TILE_SIZE ad almeno 150 per garantire spazio fisico.
        const TILE_SIZE = 150;

        // 2. Calcola i limiti del mondo DINAMICAMENTE
        const worldWidth = mazeGrid[0].length * TILE_SIZE;  // 20 * 150 = 3000
        const worldHeight = mazeGrid.length * TILE_SIZE;    // 20 * 150 = 3000

        // 3. Imposta i Bounds con i calcoli esatti
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        // 4. Crea il Background basato sulle nuove dimensioni
        this.background_scene = this.add.tileSprite(
            worldWidth / 2, 
            worldHeight / 2, 
            worldWidth, 
            worldHeight, 
            'background_scene2'
        ).setDepth(-1);
        
        this.background_scene.setTileScale(0.5, 0.5);

        // Effetto di Fade In
        this.cameras.main.fadeIn(800, 0, 0, 0);

        // GIOCATORE: Lo creiamo QUI, prima del ciclo, così esiste per gli overlap
        this.player = new Spaceship(this, 0, 0, this.startingTexture);
        this.player.setVisible(false); // Lo nascondiamo finché non troviamo lo spawn
        this.player.setScale(0.25); // La navicella è leggermente più piccola in questa scena
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        this.anims.create({
            key: 'wall_shimmer',
            frames: this.anims.generateFrameNumbers('wall_cytoskeleton_anim', { start: 0, end: 3 }), // Usa i frame da 0 a 3
            frameRate: 2, // Velocità dell'animazione (fotogrammi al secondo)
            repeat: -1,   // Ripeti all'infinito
            yoyo: true    // Torna indietro (0-1-2-3-2-1-0) per un movimento più fluido
        });

        // Creiamo il gruppo statico per i muri
        this.wallsGroup = this.physics.add.staticGroup();

        this.loreItemsGroup = this.physics.add.staticGroup();
        
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
                    let wall = this.wallsGroup.create(posX, posY, 'wall_cytoskeleton_anim');
                    // Moltiplica TILE_SIZE (es. per 1.2) per rendere il muro del 20% più grande e far sovrapporre meglio i blocchi
                    wall.setDisplaySize(TILE_SIZE * 1.2, TILE_SIZE * 1.2); 
                    wall.refreshBody(); // Aggiorna la hitbox statica
                    wall.anims.play('wall_shimmer', true);
                } 
                else if (cellValue === 2) {
                    // È l'entrata: posizioniamo la navicella e la rendiamo visibile
                    this.player.setPosition(posX, posY);
                    this.player.setVisible(true);
                }
                else if (cellValue === 3) {
                    // È l'uscita: creiamo il portale del nucleo
                    this.exitPortal = this.add.sprite(posX, posY, 'exit_portal');
                    this.exitPortal.setScale(0.2);
                    this.physics.add.existing(this.exitPortal, true);
                }
                else if (cellValue === 4) {
                    let wreck = this.loreItemsGroup.create(posX, posY, 'viral_wreck');
                    wreck.setDisplaySize(TILE_SIZE * 0.6, TILE_SIZE * 0.6);
                    // Salviamo i dati per riconoscerlo
                    wreck.setData('itemName', 'ViralWreck');
                    wreck.setData('hasBeenScanned', false);
                    wreck.refreshBody(); // Aggiorna la hitbox statica
                }
                else if (cellValue === 5) {
                    let iceberg = this.loreItemsGroup.create(posX, posY, 'lipid_iceberg');
                    iceberg.setDisplaySize(TILE_SIZE*0.6, TILE_SIZE*0.6);
                    // Salviamo i dati per riconoscerlo
                    iceberg.setData('itemName', 'CholesterolIceberg');
                    iceberg.setData('hasBeenScanned', false);
                    iceberg.refreshBody(); // Aggiorna la hitbox statica
                }
                else if (cellValue === 6 || cellValue === 7 || cellValue === 8) {
                    // 1. Creiamo una zona invisibile grande quanto un blocco TILE_SIZE
                    let triggerZone = this.add.zone(posX, posY, TILE_SIZE, TILE_SIZE);
                    
                    // 2. Aggiungiamo la fisica statica alla zona
                    this.physics.add.existing(triggerZone, true);
                    
                    // 3. Usiamo i Data per assicurarci che si attivi una volta sola
                    triggerZone.setData('hasTriggered', false);

                    // 4. Creiamo immediatamente l'overlap tra navicella e QUESTA specifica zona
                    this.physics.add.overlap(this.player, triggerZone, () => {
                        
                        // Se non è ancora scattata...
                        if (!triggerZone.getData('hasTriggered')) {
                            
                            // Segnala come scattata per il futuro
                            triggerZone.setData('hasTriggered', true);
                            
                            // Mostra il testo corretto in base al numero
                            if (cellValue === 6) {
                                this.abi.showRadioMessage(
                                    "Hey! Can you see it? The structures around us are constantly shifting! This membrane isn't a solid wall, but a two-dimensional liquid. The lipids and proteins drift laterally, like icebergs in a microscopic ocean. Biologists call this the 'Fluid Mosaic Model'.",
                                    7500
                                );
                            } 
                            else if (cellValue === 7) {
                                this.abi.showRadioMessage(
                                    "We are approaching the nuclear pore complex. Once we breach this gate, we will enter the deep cytoplasm. Prepare yourself: the environment will expand dramatically, filled with massive organelles like mitochondria and free-floating ribosomes.", 
                                    7000
                                );
                            }
                                else if (cellValue === 8) {
                                this.abi.showRadioMessage(
                                    "Analyzing barrier depth... Did you know this membrane is only about 8 nanometers thick? To put that in perspective, a standard sheet of paper is about 12,000 times thicker than this structure.",
                                    6000
                                );
                            }
                        }
                    });
                }
            }
        }

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

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // FISICA: Aggiungiamo le collisioni
        this.physics.add.collider(this.player, this.wallsGroup);
        this.physics.add.overlap(this.player, this.exitPortal, this.handleExit, undefined, this);

        // ABI: Inizializziamo l'assistente e mostriamo un dialogo iniziale
        this.abi = new ABI(this);
        // this.abi.showRadioMessage("Entering the cytoplasm. Sensors are picking up complex structures and obstacles. Stay alert, we need to find the nuclear pore to proceed.");

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
                        "It seems the host organism has built up rigid 'lipid icebergs' within its fluid membrane."
                    ]);
                }
            }
        });

          // --- SCORCIATOIA DI DEBUG (Da rimuovere prima della consegna!) ---
            this.input.keyboard!.on('keydown-O', () => {
            console.log("DEBUG: Salto direttamente alla Scene3_Internal!");
            
            // Ferma eventuali musiche o robe in sospeso
            this.scene.start('Scene3_Internal', { incomingTexture: this.player.texture.key });
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
        this.player.update(); // La logica di movimento è ora nella classe Spaceship

        // L'EFFETTO FLUIDO: come in Scene1, lo sfondo si muove
        this.background_scene.tilePositionX += 0.1;
        this.background_scene.tilePositionY += 0.05;
    }

    private handleExit() {
        // Se stiamo già facendo la transizione o parlando, non fare nulla
        if (this.isTransitioning || this.abi.isTalking) {
            return;
        }
        this.isTransitioning = true;

        // Ferma il giocatore
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        // Mostra il dialogo e, alla chiusura, avvia la transizione di scena
        this.abi.showDialogue(
            "A.B.I.",
            "Nuclear pore complex breached. We are proceeding into the cytoplasm. Brace for environmental shift.",
            () => { // Questa è la funzione di callback che viene eseguita alla fine del dialogo
                this.cameras.main.fadeOut(800, 0, 0, 0);
                this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                    this.scene.start('Scene3_Internal', { incomingTexture: this.player.texture.key });
                });
            }
        );
    }
}