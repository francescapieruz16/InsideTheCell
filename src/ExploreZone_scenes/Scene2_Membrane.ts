import Phaser from 'phaser';

import ABI from '../classes/abi';
import Spaceship from '../classes/spaceship'; // Assicurati che il percorso sia corretto
import defaultDialogues from '../../assets/default_dialogues.json';
import JournalScene from './JournalScene';
import { JournalItem } from './JournalScene';


export default class Scene2_Membrane extends Phaser.Scene {
    private player!: Spaceship;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactKey!: Phaser.Input.Keyboard.Key;

    private startingTexture: string = 'nav_front';

    // Elementi della scena
    private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;
    private exitPortal!: Phaser.Physics.Arcade.Sprite;
    private loreItemsGroup!: Phaser.Physics.Arcade.StaticGroup; // Per relitti e iceberg

    private abi!: ABI;

    private background_scene!: Phaser.GameObjects.TileSprite;

    private isTransitioning: boolean = false;

    private dialogue2: any = [];
    private dialogue3: any = [];


    private dialogue1: string = "";
    private dialogue4: string = ""; 

    private levelDiscoverables: JournalItem[] = [
        { id: 'viral_wreck', name: 'Viral Wreck', texture: 'viral_wreck' },
        { id: 'lipid_iceberg', name: 'Lipid Iceberg', texture: 'lipid_iceberg' },
        { id: 'exit_portal', name: 'Exit Portal', texture: 'exit_portal' }
    ];

    preload() {

        this.load.image('nav_front', '/assets/tutorial/navicella/Navicella_Front.png');
        this.load.image('nav_back', '/assets/tutorial/navicella/Navicella_Back.png');
        this.load.image('nav_left', '/assets/tutorial/navicella/Navicella_Left.png');
        this.load.image('nav_right', '/assets/tutorial/navicella/Navicella_Right.png');
        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png'); 
     
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
        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
                z-index: 990 !important;
            }

            button {
                padding: 12px 24px;
                font-size: 1.2rem;
                font-weight: bold;
                cursor: pointer;
                border: 2px solid #333;
                border-radius: 8px;
                background-color: rgba(255, 255, 255, 0.8);
                transition: background-color 0.2s, transform 0.1s;
            }

            button:hover {
                background-color: rgba(255, 255, 255, 1);
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);

        const backBtn = document.createElement('button');
        backBtn.className = 'Back';
        backBtn.innerText = 'PAUSE';
        backBtn.style.pointerEvents = 'auto';
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.top = '20px';
        wrapper.style.right = '40px';
        wrapper.style.transform = 'none';
        wrapper.style.zIndex = '1000';
        wrapper.style.pointerEvents = 'none';
        wrapper.appendChild(backBtn);
        const gameContainer = document.getElementById('app') || document.body;
        gameContainer.appendChild(wrapper);

        backBtn.addEventListener('click', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        const savedDialogues = localStorage.getItem('DIALOGUES_JSON');
        let allDialogues = null;    
        if (savedDialogues) {
            try {
                allDialogues = JSON.parse(savedDialogues);
            } catch (e) {
                console.warn("Error reading saved dialogues. Using defaults.", e);
                allDialogues = defaultDialogues;
            }
        } else {
            allDialogues = defaultDialogues;
        }

        this.dialogue1 = allDialogues.tutorials.tutorial_2.dialogue_1;

        this.dialogue2.push(allDialogues.tutorials.tutorial_2.dialogue_2_1);
        this.dialogue2.push(allDialogues.tutorials.tutorial_2.dialogue_2_2);
        this.dialogue2.push(allDialogues.tutorials.tutorial_2.dialogue_2_3);

        this.dialogue3.push(allDialogues.tutorials.tutorial_2.dialogue_3_1);
        this.dialogue3.push(allDialogues.tutorials.tutorial_2.dialogue_3_2);

        this.dialogue4 = allDialogues.tutorials.tutorial_2.dialogue_4;
    

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
                    this.exitPortal = this.physics.add.staticSprite(posX, posY, 'exit_portal');
                    this.exitPortal.setScale(0.2);
                    this.exitPortal.refreshBody();
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
                                    7500
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
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

            this.input.keyboard.on('keydown-ESC', () => {
                if (!this.abi.isTalking) {
                    this.scene.pause();
                    this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
                }
            });

            this.input.keyboard.on('keydown-I', () => {
                if (this.isTransitioning || this.abi.isTalking) return;

                this.physics.world.pause(); 
                this.scene.pause(); 

                this.scene.launch('JournalScene', { 
                    parentScene: this.scene.key, 
                    items: this.levelDiscoverables 
                });
            });
        }

        this.events.on('resume', () => {
            this.physics.world.resume();
        });

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // FISICA: Aggiungiamo le collisioni
        this.physics.add.collider(this.player, this.wallsGroup);
        this.physics.add.overlap(this.player, this.exitPortal, this.handleExit, undefined, this);

        this.abi = new ABI(this);
    
        this.abi.MoveDialogueY(0); 

        const abiScene = this.scene.get('ABIScene');

        this.abi.showDialogue(
            "A.B.I.",
            this.dialogue1,
        );

        // L'Overlap fa scattare l'evento appena la navicella tocca lo sprite dell'oggetto
        this.physics.add.overlap(this.player, this.loreItemsGroup, (player, item) => {
            const loreItem = item as Phaser.Physics.Arcade.Sprite;

            const itemDef = this.levelDiscoverables.find(i => i.texture === loreItem.texture.key);
            if (itemDef) {
                JournalScene.unlockItem(this, itemDef.id, this.levelDiscoverables);
            }

            // Se l'oggetto NON è stato scansionato e A.B.I. è libero
            if (!loreItem.getData('hasBeenScanned') && !this.abi.isTalking) {
                
                // 1. Segnalo come scansionato (non si ripeterà più)
                loreItem.setData('hasBeenScanned', true);
                
                // 2. Ferma immediatamente la navicella per comodità del giocatore
                (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

                // 3. Mostra il dialogo corrispondente
                if (loreItem.getData('itemName') === 'ViralWreck') {
                    this.abi.showDialogue("A.B.I.", [
                        this.dialogue2
                    ]);
                } 
                else if (loreItem.getData('itemName') === 'CholesterolIceberg') {
                    this.abi.showDialogue("A.B.I.", [
                        this.dialogue3
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

        this.events.once('shutdown', () => {
            wrapper.remove();
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

        JournalScene.unlockItem(this, 'exit_portal', this.levelDiscoverables);
        this.isTransitioning = true;

        const currentProgress = parseInt(localStorage.getItem('maxUnlockedLevel') || '1', 10);
        if (currentProgress < 3) {
            localStorage.setItem('maxUnlockedLevel', '3');
        }

        // Ferma il giocatore
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        // Mostra il dialogo e, alla chiusura, avvia la transizione di scena
        this.abi.showDialogue(
            "A.B.I.",
            this.dialogue4,
            () => { // Questa è la funzione di callback che viene eseguita alla fine del dialogo
                this.scene.stop('ABIScene');
                this.cameras.main.fadeOut(800, 0, 0, 0);
                this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                    this.scene.start('Scene3_Internal', { incomingTexture: this.player.texture.key });
                });
            }
        );
    }
}