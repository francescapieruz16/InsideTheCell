import Phaser from 'phaser';

import ABI from '../classes/abi';
import Spaceship from '../classes/spaceship';
import defaultDialogues from '../../assets/default_dialogues.json';
import JournalScene from './JournalScene';
import { JournalItem } from './JournalScene';

export default class Scene3_Internal extends Phaser.Scene {

    private player!: Spaceship;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private isTransitioning: boolean = false;

    private startingTexture: string = 'nav_front';
    private hasSeenIntro: boolean = false;

    private abi!: ABI;

    private background_scene!: Phaser.GameObjects.TileSprite;
    private background_deep!: Phaser.GameObjects.TileSprite;

    private lysosomesGroup!: Phaser.Physics.Arcade.StaticGroup;
    private mitochondriaGroup!: Phaser.Physics.Arcade.StaticGroup;

    private relWallsGroup!: Phaser.Physics.Arcade.StaticGroup;
    private rerWallsGroup!: Phaser.Physics.Arcade.StaticGroup;

    private relTriggerGroup!: Phaser.Physics.Arcade.StaticGroup;
    private rerTriggerGroup!: Phaser.Physics.Arcade.StaticGroup;

    private levelDiscoverables: JournalItem[] = [
        { id: 'lysosome', name: 'Lysosome', texture: 'organelle_lysosome' },
        { id: 'mitochondrion', name: 'Mitochondrion', texture: 'organelle_mitochondrion' },
        { id: 'golgi_apparatus', name: 'Golgi Apparatus', texture: 'organelle_golgi' },
        { id: 'nucleo', name: 'Nucleus', texture: 'nucleo' },
        { id: 'virus_debris1', name: 'RNA Virus', texture: 'virus_debris_1' },
        { id: 'virus_debris2', name: 'Retrovirus', texture: 'virus_debris_2' },
        { id: 'virus_debris3', name: 'DNA Virus', texture: 'virus_debris_3' }
    ];


    //dialoghi
    private dialogue1: string = "";
    
    private dialogue2: any = [];
    private dialogue3: any = [];
    private dialogue4: any = [];
    private dialogue5: any = [];
    private dialogue6: any = [];
    private dialogue7: any = [];

    // --- DIALOGHI DATA LOG VIRALI ---
    private dialogueLog1: any= [];
    private dialogueLog2: any= [];
    private dialogueLog3: any= [];
    
    private dataLogsGroup!: Phaser.Physics.Arcade.StaticGroup;

    // --- VARIABILI COOLDOWN E FLAG DIALOGHI ---
    private lastMitoDialogueTime: number = 0; 
    private lastLysoDialogueTime: number = 0;
    private lastGolgiDialogueTime: number = 0;
    private lastNucleusDialogueTime: number = 0; // Per il Nucleo
    private readonly DIALOGUE_COOLDOWN: number = 1000;

    private lastLog1Time: number = 2000;
    private lastLog2Time: number = 2000;
    private lastLog3Time: number = 2000;

    private hasTriggeredSER: boolean = false; // Trigger unico
    private hasTriggeredRER: boolean = false; // Trigger unico



    preload() {
       
        this.load.image('nav_front', '/assets/tutorial/navicella/Navicella_Front.png');
        this.load.image('nav_back', '/assets/tutorial/navicella/Navicella_Back.png');
        this.load.image('nav_left', '/assets/tutorial/navicella/Navicella_Left.png');
        this.load.image('nav_right', '/assets/tutorial/navicella/Navicella_Right.png');
        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png'); 
        
        this.load.image('background_scene3', '/assets/tutorial/sfondi/scene3_background4.png'); 
        this.load.image('organelle_lysosome', '/assets/tutorial/obstacles/lysosome4.png'); 
        this.load.image('organelle_mitochondrion', '/assets/tutorial/obstacles/mitochondrion2.png');
        this.load.image('organelle_golgi', '/assets/tutorial/obstacles/golgi3.png');
        this.load.image('golgi_wall', '/assets/tutorial/obstacles/golgi_wall.png');
        this.load.image('nucleo', '/assets/tutorial/obstacles/nucleo.png');
        this.load.image('organelle_rel_tile', '/assets/tutorial/obstacles/REL3.png');
        this.load.image('organelle_rer_tile', '/assets/tutorial/obstacles/RER3.png');
        this.load.image('background_deep', '/assets/tutorial/sfondi/scene3_background_deep.png');
        this.load.image('circle', '/assets/tutorial/sfondi/circle.png');

        this.load.image('virus_debris_1', '/assets/tutorial/virus/virus1.png');
        this.load.image('virus_debris_2', '/assets/tutorial/virus/virus2.png');
        this.load.image('virus_debris_3', '/assets/tutorial/virus/virus3.png');
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
            wrapper.style.display = 'none';

            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        const bioLogBtn = document.createElement('button');
        bioLogBtn.className = 'BioLog';
        bioLogBtn.innerText = 'BIOLOG';
        bioLogBtn.style.pointerEvents = 'auto';
        const wrapper2 = document.createElement('div');
        wrapper2.style.position = 'absolute';
        wrapper2.style.top = '20px';
        wrapper2.style.left = '40px';
        wrapper2.style.transform = 'none';
        wrapper2.style.zIndex = '1000';
        wrapper2.style.pointerEvents = 'none';
        wrapper2.appendChild(bioLogBtn);
        gameContainer.appendChild(wrapper2);

        bioLogBtn.addEventListener('click', () => {
            wrapper2.style.display = 'none';

            this.physics.world.pause();  
            this.scene.pause(); 

            this.scene.launch('JournalScene', { 
                parentScene: this.scene.key, 
                items: this.levelDiscoverables 
            });
        });

        // --- RECUPERO SALVATAGGIO SCENA 3 ---
        const savedStateStr = localStorage.getItem('scene3_state');
        const savedState = savedStateStr ? JSON.parse(savedStateStr) : {
            hasSeenIntro: false
        };
        this.hasSeenIntro = savedState.hasSeenIntro;

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
        
        this.dialogue1 = allDialogues.tutorials.tutorial_3.dialogue_1;

        //Svuotiamo e riempiamo gli array dei dialoghi specifici per questa scena, in modo da poterli usare facilmente negli eventi di collisione/overlap
        this.dialogue2 = [];
        this.dialogue3 = [];
        this.dialogue4 = [];
        this.dialogue5 = [];
        this.dialogue6 = [];
        this.dialogue7 = [];
        this.dialogueLog1 = [];
        this.dialogueLog2 = [];
        this.dialogueLog3 = [];

        this.dialogue2.push(allDialogues.tutorials.tutorial_3.dialogue_2_1);
        this.dialogue2.push(allDialogues.tutorials.tutorial_3.dialogue_2_2);

        this.dialogue3.push(allDialogues.tutorials.tutorial_3.dialogue_3_1);
        this.dialogue3.push(allDialogues.tutorials.tutorial_3.dialogue_3_2);

        this.dialogue4.push(allDialogues.tutorials.tutorial_3.dialogue_4_1);
        this.dialogue4.push(allDialogues.tutorials.tutorial_3.dialogue_4_2);

        this.dialogue5.push(allDialogues.tutorials.tutorial_3.dialogue_5_1);
        this.dialogue5.push(allDialogues.tutorials.tutorial_3.dialogue_5_2);

        this.dialogue6.push(allDialogues.tutorials.tutorial_3.dialogue_6_1);
        this.dialogue6.push(allDialogues.tutorials.tutorial_3.dialogue_6_2);

        this.dialogue7.push(allDialogues.tutorials.tutorial_3.dialogue_7_1);
        this.dialogue7.push(allDialogues.tutorials.tutorial_3.dialogue_7_2);
        this.dialogue7.push(allDialogues.tutorials.tutorial_3.dialogue_7_3);

        this.dialogueLog1.push(allDialogues.tutorials.tutorial_3.dialogue_Log1_1);
        this.dialogueLog1.push(allDialogues.tutorials.tutorial_3.dialogue_Log1_2);
        this.dialogueLog1.push(allDialogues.tutorials.tutorial_3.dialogue_Log1_3);

        this.dialogueLog2.push(allDialogues.tutorials.tutorial_3.dialogue_Log2_1);
        this.dialogueLog2.push(allDialogues.tutorials.tutorial_3.dialogue_Log2_2);
        this.dialogueLog2.push(allDialogues.tutorials.tutorial_3.dialogue_Log2_3);

        this.dialogueLog3.push(allDialogues.tutorials.tutorial_3.dialogue_Log3_1);
        this.dialogueLog3.push(allDialogues.tutorials.tutorial_3.dialogue_Log3_2);
        this.dialogueLog3.push(allDialogues.tutorials.tutorial_3.dialogue_Log3_3);



        // 1. Definiamo una dimensione molto grande per il nostro mondo di gioco
        const WORLD_SIZE = 6000;
        const CENTER_X = WORLD_SIZE / 2;
        const CENTER_Y = WORLD_SIZE / 2;

        const membrane = this.add.image(CENTER_X, CENTER_Y, 'circle');
        
        // Stira l'immagine 3k per coprire i 6k del mondo fisico
        membrane.setDisplaySize(WORLD_SIZE, WORLD_SIZE);
        
        // Depth 100 garantisce che la maschera nera copra tutto ciò che c'è sotto, 
        // inclusi gli organuli che potresti aver inavvertitamente piazzato negli angoli
        membrane.setDepth(100);

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
                visX: 2022, visY: 5352, angle: 0, 
                hitX: 2022, hitY: 5352, hitW: 480, hitH: 280 
            },
            { 
                visX: 1630, visY: 947, angle: 15, 
                hitX: 1630, hitY: 947, hitW: 480, hitH: 300 
            },
            { 
                visX: 742, visY: 4452, angle: 45, 
                hitX: 742, hitY: 4452, hitW: 400, hitH: 450 
            },
            { 
                visX: 4646, visY: 4857, angle: 315, 
                hitX: 4646, hitY: 4857, hitW: 400, hitH: 450 
            },
            { 
                visX: 4576, visY: 1115, angle: 215, 
                hitX: 4576, hitY: 1115, hitW: 400, hitH: 450 
            },
            { 
                visX: 5300, visY: 2800, angle: 270, 
                hitX: 5300, hitY: 2800, hitW: 400, hitH: 450 
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
          { x: 2345, y: 547 },
            { x: 3711, y: 1050 },
            { x: 3661, y: 391 },
            { x: 4915, y: 2077 },
            { x: 4859, y: 3954 },
            { x: 5766, y: 3284 },
            { x: 4100, y: 5318 },
            { x: 2722, y: 4899 },
            { x: 2505, y: 5576 },
            { x: 1176, y: 4131 },
            { x: 581, y: 1827 }
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

        //  =================================================
        // --- CONFIGURAZIONE APPARATO DI GOLGI (DISACCOPPIATO) ---
        // =========================================================

        const GOLGI_WIDTH = 1200;
        const GOLGI_HEIGHT = 800;
        const golgiConfig = {
            // Dati Visivi
            visX: 700,
            visY: 2400,
            angle: 330, // Imposta qui l'angolo di rotazione manuale dello sprite (es. -30 gradi)

            // Dati Fisici della Hitbox (Assoluti nel mondo)
            // Centrati sulla parte solida reale dell'organulo
            hitX: 700, // Spostiamo l'hitbox a sinistra per allinearla alla parte solida del Golgi
            hitY: 2400,  // Spostiamo l'hitbox verso il basso per allinearla alla parte solida del Golgi
            hitW: GOLGI_WIDTH *0.85,  // Larghezza del muro invisibile
            hitH: GOLGI_HEIGHT *0.92   // Altezza del muro invisibile
        };


        // --- B. SPRITE VISIVO GOLGI ---
        const golgiVisual = this.add.image(golgiConfig.visX, golgiConfig.visY, 'organelle_golgi');
        golgiVisual.setDisplaySize(GOLGI_WIDTH, GOLGI_HEIGHT);
        golgiVisual.setAngle(golgiConfig.angle); // Applica la rotazione visiva desiderata
        golgiVisual.setDepth(1);

        // --- C. HITBOX FISICA INVISIBILE (ZONA) ---
        // Creiamo la zona statica usando le coordinate assolute dell'oggetto di configurazione
        const golgiHitZone = this.add.zone(golgiConfig.hitX, golgiConfig.hitY, golgiConfig.hitW, golgiConfig.hitH);
        this.physics.add.existing(golgiHitZone, true); // true = corpo statico

    // NUCLEO
        const NUCLEUS_X = WORLD_SIZE / 2; // Centriamo il nucleo orizzontalmente
        const NUCLEUS_SIZE = 800;
        const NUCLEUS_Y = WORLD_SIZE /2; 

        const nucleus = this.physics.add.staticImage(NUCLEUS_X, NUCLEUS_Y, 'nucleo');
        nucleus.setDisplaySize(NUCLEUS_SIZE, NUCLEUS_SIZE);
        nucleus.refreshBody();
        this.physics.add.collider(this.player, nucleus, () => {
            this.handleNucleusCollision();
        });

        // =========================================================
        // --- RETICOLO ENDOPLASMATICO (Matrice Unificata REL + RER) ---
        // =========================================================
        
        this.relWallsGroup = this.physics.add.staticGroup();
        this.rerWallsGroup = this.physics.add.staticGroup();

        this.relTriggerGroup = this.physics.add.staticGroup();
        this.rerTriggerGroup = this.physics.add.staticGroup();

        

        const ER_TILE_W = 128; // Esempio: largo il doppio
        const ER_TILE_H = 128;  // Altezza invariata
        
        // Posizioniamo l'intera struttura al centro, sotto il Nucleo
        const ER_START_X = 1350; 
        const ER_START_Y = 1464; 

        // 0 = Lume, 1 = REL, 2 = RER, 3 = Trigger Dialogo REL, 4 = Trigger Dialogo RER
        const erGrid = [
            [1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0],
            [0,1,1,1,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,1,1,1,0,0], // <-- 3: Ingressi REL Nord
            [0,1,1,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0],
            [0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0],
            [0,1,1,0,0,1,1,1,1,1,1,1,1,0,4,1,1,1,1,0,0,1,0,0], 
            [0,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0],
            [1,0,1,0,0,1,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0], // <-- 4: Ingressi RER Nord
            [1,0,1,0,0,1,0,0,2,2,2,0,0,2,2,2,2,2,1,0,0,1,0,0], 
            [1,0,1,0,0,1,0,0,2,2,0,0,0,0,0,0,2,2,1,0,0,1,0,1],
            [1,0,1,0,0,0,0,0,2,2,0,0,0,0,0,0,2,2,1,0,0,0,3,1], // <-- 3: Ingressi REL Laterali
            [1,0,1,0,0,0,0,0,2,2,0,0,0,0,0,0,2,2,1,0,0,0,0,1], 
            [0,0,1,0,0,1,1,1,2,2,0,0,0,0,0,0,2,2,0,0,0,0,0,1], 
            [0,0,1,0,0,1,1,0,2,2,0,0,0,0,0,0,2,2,0,0,0,1,1,1],
            [0,0,1,0,0,1,0,0,2,2,0,0,0,0,0,0,2,2,1,1,1,1,0,0],
            [1,3,1,0,0,1,0,0,2,2,2,2,2,2,2,0,0,2,1,1,0,1,0,0], 
            [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,4,0,0,0,1,0,0], // <-- 4: Ingressi RER Sud
            [1,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,4,0,0,0,1,0,0],
            [0,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,0,0], 
            [0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1],
            [0,0,1,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,1,1,1,1,0,1], // <-- 3: Ingressi REL Sud
            [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
            [0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0]
        ];

        // Generazione procedurale dell'intero labirinto 
        for (let row = 0; row < erGrid.length; row++) {
            for (let col = 0; col < erGrid[row].length; col++) {
                
                const cellValue = erGrid[row][col];
                
                if (cellValue !== 0) {
                    const posX = ER_START_X + (col * ER_TILE_W) + (ER_TILE_W / 2);
                    const posY = ER_START_Y + (row * ER_TILE_H) + (ER_TILE_H / 2);
                    
                    // --- MURI SOLIDI ---
                    if (cellValue === 1 || cellValue === 2) {
                        let wall;
                        if (cellValue === 1) {
                            wall = this.relWallsGroup.create(posX, posY, 'organelle_rel_tile');
                        } else if (cellValue === 2) {
                            wall = this.rerWallsGroup.create(posX, posY, 'organelle_rer_tile');
                        }

                        if (wall) {
                            wall.setDisplaySize(ER_TILE_W, ER_TILE_H);
                            wall.refreshBody(); 
                        }
                    } 
                    // --- TRIGGER INVISIBILI (3 e 4) ---
                    else if (cellValue === 3) {
                        const trigger = this.add.zone(posX, posY, ER_TILE_W, ER_TILE_H);
                        this.physics.add.existing(trigger, true); // true = corpo statico
                        this.relTriggerGroup.add(trigger);
                    }
                    else if (cellValue === 4) {
                        const trigger = this.add.zone(posX, posY, ER_TILE_W, ER_TILE_H);
                        this.physics.add.existing(trigger, true); // true = corpo statico
                        this.rerTriggerGroup.add(trigger);
                    }
                }
            }
        }

        // =========================================================
        // --- COLLEZIONABILI: DATA LOG VIRALI (RIUTILIZZABILI) ---
        // =========================================================
        this.dataLogsGroup = this.physics.add.staticGroup();

        // Usa i 3 sprite virali diversi
        const log1 = this.dataLogsGroup.create(2200, 4000, 'virus_debris_1');
        log1.name = 'log1';
        
        const log2 = this.dataLogsGroup.create(3800, 3100, 'virus_debris_2');
        log2.name = 'log2';

        const log3 = this.dataLogsGroup.create(2681, 2405, 'virus_debris_3');
        log3.name = 'log3';

        // Impostiamo l'aspetto visivo
        this.dataLogsGroup.getChildren().forEach((child) => {
            const log = child as Phaser.GameObjects.Sprite;
            log.setDisplaySize(100, 100); // Regola la grandezza se necessario
            log1.refreshBody();
            log2.refreshBody(); 
            log3.refreshBody(); 

            // Effetto fluttuante per indicare che si può interagire
            this.tweens.add({
                targets: log,
                y: log.y - 15,
                alpha: 0.6,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        // Aggiungiamo l'overlap
        this.physics.add.overlap(this.player, this.dataLogsGroup, (player, log) => {
            this.handleLogCollection(log as Phaser.GameObjects.Sprite);
        });

        this.physics.add.collider(this.player, this.mitochondriaGroup, () => {
            this.handleMitoCollision();
        });
        
        this.physics.add.collider(this.player, this.lysosomesGroup, () => {
            this.handleLysoCollision();
        });
        
        this.physics.add.collider(this.player, golgiHitZone, () => {
            this.handleGolgiCollision();
        });

        this.physics.add.collider(this.player, this.relWallsGroup);
        this.physics.add.collider(this.player, this.rerWallsGroup);

        this.physics.add.overlap(this.player, this.relTriggerGroup, () => {
                    this.handleSEROverlap();
                });

        this.physics.add.overlap(this.player, this.rerTriggerGroup, () => {
            this.handleREROverlap();
        });

        // 5. La telecamera segue il giocatore
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.fadeIn(800, 0, 0, 0); // Effetto di transizione in entrata

        this.abi = new ABI(this);
        this.abi.MoveDialogueY(0); 

        const abiScene = this.scene.get('ABIScene');
        this.scene.launch('ABIScene');

        if (this.input.keyboard) {
                    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
                    this.input.keyboard.on('keydown-ESC', () => {
                        if (!this.abi.isTalking) {
                            wrapper.style.display = 'none';

                            this.scene.pause();
                            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
                        }
                    });
        
                    // --- NUOVO: Tasto 'I' per aprire il Data Log ---
                    this.input.keyboard.on('keydown-I', () => {
                        // Impedisce di aprire il diario durante un dialogo o una transizione
                        if (this.isTransitioning || this.abi.isTalking) return;

                        wrapper2.style.display = 'none';
        
                        // Mette in pausa la fisica (ferma la navicella e i detriti)
                        this.physics.world.pause(); 
                        
                        // Mette in pausa l'update di questa scena
                        this.scene.pause(); 
        
                        // Lancia la scena del Journal passando gli oggetti scopribili di QUESTO livello
                        this.scene.launch('JournalScene', { 
                            parentScene: this.scene.key, 
                            items: this.levelDiscoverables 
                        });
                    });
                }

        this.events.on('pause', () => {
            this.scene.sleep('ABIScene'); // Nasconde istantaneamente il contatore
            wrapper.style.display = 'none';
            wrapper2.style.display = 'none';
        });

        this.events.on('resume', () => {
            this.physics.world.resume();
            wrapper.style.display = 'block';
            wrapper2.style.display = 'block';
        });
            

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

        this.events.once('shutdown', () => {
            if (wrapper) wrapper.remove();
            if (wrapper2) wrapper2.remove();
        });
    }

    update() {

        if (this.isTransitioning) return;

        // --- FIX: TRIGGER DIALOGO INIZIALE AL PRIMO MOVIMENTO ---
        if (!this.hasSeenIntro && this.isTryingToMove()) {
            this.hasSeenIntro = true;
            this.saveProgress();
            
            // FONDAMENTALE: Passiamo dialogue1 senza parentesi quadre
            this.abi.showDialogue("A.B.I.", this.dialogue1);
            return;
        }

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

        if (this.player && this.player.body) {
            const body = this.player.body as Phaser.Physics.Arcade.Body;

            const WORLD_SIZE = 6000;
            const CENTER = WORLD_SIZE / 2; // 3000
            
            // Regola questo raggio per l'allineamento visivo con la tua cornice
            // Il tile ha raggio 128, ma la navicella è 0.3.
            const CELL_RADIUS = 2950; 
            
            // Fattore di restituzione (rimbalzo): 0.1 = gratta, 0.9 = rimbalza molto
            const RESTITUTION = 0.65; 

            // Calcoliamo la distanza radiale (D)
            const dx = this.player.x - CENTER;
            const dy = this.player.y - CENTER;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Se la navicella supera o tocca il raggio
            if (distance > CELL_RADIUS) {
                // 1. Calcoliamo l'angolo di incidenza (per posizionarla)
                const angle = Math.atan2(dy, dx);

                // 2. RIPOSIZIONAMENTO (Clamp): la teniamo dentro
                this.player.x = CENTER + Math.cos(angle) * CELL_RADIUS;
                this.player.y = CENTER + Math.sin(angle) * CELL_RADIUS;

                // 3. FISICA: Calcoliamo il vettore normale della collisione (fuori)
                const nx = dx / distance; // Normale normalizzata X
                const ny = dy / distance; // Normale normalizzata Y

                // 4. FISICA: Calcoliamo il Prodotto Scalare (Velocità attuale dot Normale)
                // Questo ci dice quanto stiamo andando "fuori"
                const velocityX = body.velocity.x;
                const velocityY = body.velocity.y;
                const dotProduct = (velocityX * nx + velocityY * ny);

                // Se stiamo andando verso l'esterno (dotProduct > 0)
                if (dotProduct > 0) {
                    // 5. RIFLESSIONE VETTORIALE (Il trucco fisico)
                    // Vnew = Vold - (1 + RESTITUTION) * dotProduct * Normal
                    const newVelocityX = velocityX - (1 + RESTITUTION) * dotProduct * nx;
                    const newVelocityY = velocityY - (1 + RESTITUTION) * dotProduct * ny;

                    // Applichiamo la nuova velocità (riflessa verso dentro)
                    body.setVelocity(newVelocityX, newVelocityY);
                }
            }
        }
    }
   // =========================================================
    // --- CALLBACK DELLE COLLISIONI (TRIGGER DIALOGHI) ---
    // =========================================================

    private handleMitoCollision(): void {
        // Se ABI sta già parlando, non fare nulla (come nella Scena 1)
        if (this.abi.isTalking) return;

        // Controlla se il tempo trascorso è maggiore del cooldown
        if (this.time.now > this.lastMitoDialogueTime + this.DIALOGUE_COOLDOWN) {
            this.lastMitoDialogueTime = this.time.now;
            JournalScene.unlockItem(this, 'mitochondrion', this.levelDiscoverables);
            this.abi.showDialogue("A.B.I.", this.dialogue2);
        }
    }

    private handleLysoCollision(): void {
        if (this.abi.isTalking) return;

        if (this.time.now > this.lastLysoDialogueTime + this.DIALOGUE_COOLDOWN) {
            this.lastLysoDialogueTime = this.time.now;
            JournalScene.unlockItem(this, 'lysosome', this.levelDiscoverables);
            this.abi.showDialogue("A.B.I.", this.dialogue3);
        }
    }

    private handleGolgiCollision(): void {
        if (this.abi.isTalking) return;

        if (this.time.now > this.lastGolgiDialogueTime + this.DIALOGUE_COOLDOWN) {
            this.lastGolgiDialogueTime = this.time.now;
            JournalScene.unlockItem(this, 'golgi_apparatus', this.levelDiscoverables);
            this.abi.showDialogue("A.B.I.", this.dialogue4);
        }
    }

    private handleNucleusCollision(): void {
        if (this.abi.isTalking) return;

        // Comportamento a cooldown come gli altri organuli fisici
        if (this.time.now > this.lastNucleusDialogueTime + this.DIALOGUE_COOLDOWN) {
            this.lastNucleusDialogueTime = this.time.now;
            JournalScene.unlockItem(this, 'nucleo', this.levelDiscoverables);
            this.abi.showDialogue("A.B.I.", this.dialogue7);
        }
    }

    private handleSEROverlap(): void {
        // Se ABI sta già parlando o se il dialogo è già scattato in precedenza, ignora
        if (this.abi.isTalking || this.hasTriggeredSER) return;
        
        this.hasTriggeredSER = true; // Blocca future attivazioni
        this.abi.showDialogue("A.B.I.", this.dialogue5);
    }

    private handleREROverlap(): void {
        if (this.abi.isTalking || this.hasTriggeredRER) return;
        
        this.hasTriggeredRER = true;
        this.abi.showDialogue("A.B.I.", this.dialogue6);
    }
    // =========================================================
    // --- CALLBACK RACCOLTA DATA LOG (FIX LOOP INFINITO) ---
    // =========================================================
    private handleLogCollection(log: Phaser.GameObjects.Sprite): void {
        const logName = log.name;

        // FIX: Se A.B.I. sta parlando e la navicella è ferma sul virus,
        // aggiorniamo il timer al tempo attuale. In questo modo il cooldown
        // vero e proprio inizierà a scalare solo DOPO la chiusura del dialogo.
        if (this.abi.isTalking) {
            if (logName === 'log1') this.lastLog1Time = this.time.now;
            else if (logName === 'log2') this.lastLog2Time = this.time.now;
            else if (logName === 'log3') this.lastLog3Time = this.time.now;
            return;
        }

        // Usiamo un cooldown dedicato per i log (es. 5000 ms = 5 secondi).
        // Questo ti dà 5 secondi di tempo per spostare la navicella dallo sprite
        // prima che il dialogo scatti di nuovo.
        const LOG_COOLDOWN = 5000;

        if (logName === 'log1') {
            if (this.time.now > this.lastLog1Time + LOG_COOLDOWN) {
                this.lastLog1Time = this.time.now;
                JournalScene.unlockItem(this, 'virus_debris1', this.levelDiscoverables);
                this.abi.showDialogue("A.B.I.", this.dialogueLog1);
            }
        } 
        else if (logName === 'log2') {
            if (this.time.now > this.lastLog2Time + LOG_COOLDOWN) {
                this.lastLog2Time = this.time.now;
                JournalScene.unlockItem(this, 'virus_debris2', this.levelDiscoverables);
                this.abi.showDialogue("A.B.I.", this.dialogueLog2);
            }
        } 
        else if (logName === 'log3') {
            if (this.time.now > this.lastLog3Time + LOG_COOLDOWN) {
                this.lastLog3Time = this.time.now;
                JournalScene.unlockItem(this, 'virus_debris3', this.levelDiscoverables);
                this.abi.showDialogue("A.B.I.", this.dialogueLog3);
            }
        }
    }

    private isTryingToMove(): boolean {
        if (!this.player || !this.player.body) {
            return false;
        }
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        return body.velocity.x !== 0 || body.velocity.y !== 0;
    }

    // Salva i progressi della Scena 3
    private saveProgress() {
        const state = {
            hasSeenIntro: this.hasSeenIntro
        };
        localStorage.setItem('scene3_state', JSON.stringify(state));
    }
}