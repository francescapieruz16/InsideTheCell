import Phaser from 'phaser';

import ABI from '../classes/abi';
import Spaceship from '../classes/spaceship';
import defaultDialogues from '../../assets/default_dialogues.json';
import JournalScene from './JournalScene';
import { JournalItem } from './JournalScene';

export default class Scene1_External extends Phaser.Scene {
    private static hasShownControls = false;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private portal!: Phaser.GameObjects.Sprite;
    private isTransitioning: boolean = false;

    private debrisList: Phaser.GameObjects.Sprite[] = [];

    private gameState: 'EXPLORING' | 'TALKING' = 'EXPLORING';
    private hasSeenIntro: boolean = false;
    
    // UI Elements
    private hasSpikeModule: boolean = false;
    private spikeItem!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
        
    //variabili per lo sfondo
    private lipidOcean!: Phaser.GameObjects.TileSprite;

    //variabili per la raccolta dei moduli
    private spikePartsCollected: number = 0;
    private canShowReceptorWarning: boolean = true;
    private spikeCounterText!: Phaser.GameObjects.Text;
    private hasFoundACE2: boolean = false;
    private canShowDebrisWarning: boolean = true;

    private player!: Spaceship;
    private abi!: ABI;;

    private levelDiscoverables: JournalItem[] = [
        { id: 'virus_debris1', name: 'Green Virus', texture: 'virus_debris_1' },
        { id: 'virus_debris2', name: 'Yellow Virus', texture: 'virus_debris_2' },
        { id: 'virus_debris3', name: 'Purple Virus', texture: 'virus_debris_3' },
        { id: 'receptor_fake', name: 'Generic Receptor', texture: 'receptor_fake1' },
        { id: 'receptor_ace2', name: 'ACE2 Receptor', texture: 'receptor_ace2' }
    ];

    private initialDialogues: any = [];
    private dialogue2: string = "";
    private dialogue3: string = "";
    private dialogue4: string = "";
    private dialogue5: string = "";
    private dialogue6: string = "";
    private dialogue7: string = "";
    private dialogue8: string = "";
    private dialogue9: string = "";
    private dialogue10: string = "";
    private dialogue11: string = "";

    constructor() {
        super('ExternalScene'); 
    }

    preload() {
        this.load.image('nav_front', '/assets/tutorial/navicella/Navicella_Front.png');
        this.load.image('nav_back', '/assets/tutorial/navicella/Navicella_Back.png');
        this.load.image('nav_left', '/assets/tutorial/navicella/Navicella_Left.png');
        this.load.image('nav_right', '/assets/tutorial/navicella/Navicella_Right.png');
        this.load.image('ABI_standard', '/assets/tutorial/ABI/ABI_standard.png'); 
        this.load.image('lipid_pattern', '/assets/tutorial/sfondi/lipid_pattern2.png');
        this.load.image('virus_debris_1', '/assets/tutorial/virus/virus1.png');
        this.load.image('virus_debris_2', '/assets/tutorial/virus/virus2.png');
        this.load.image('virus_debris_3', '/assets/tutorial/virus/virus3.png');
        this.load.image('receptor_fake1', '/assets/level1/receptor_circle.png');
        this.load.image('receptor_fake2', '/assets/level1/receptor_square.png');
        this.load.image('receptor_fake3', '/assets/level1/receptor_triangle.png');
        this.load.image('receptor_ace2', '/assets/level1/receptor_hexagon.png');

        this.load.audio('bg_music', '/assets/tutorial/music/cell_exploration1.mp3');
    }

    create() {

        const savedSettings = localStorage.getItem('gameSettings');
        const volume = savedSettings ? JSON.parse(savedSettings).musicVol / 100 : 1;

        const music = this.sound.add('bg_music', { loop: true, volume: volume });
        music.play();

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
        
       this.isTransitioning = true; 
        
        // 2. RECUPERO SALVATAGGI DELLA SCENA
        const savedStateStr = localStorage.getItem('scene1_state');
        const savedState = savedStateStr ? JSON.parse(savedStateStr) : {
            hasSeenIntro: false,
            spikePartsCollected: 0,
            hasSpikeModule: false,
            hasFoundACE2: false,
            destroyedDebrisIds: []
        };

        this.gameState = 'EXPLORING';
        this.debrisList = []; 
        this.canShowDebrisWarning = true;
        this.canShowReceptorWarning = true;

        // Ripristiniamo i valori salvati dal database
        this.hasSeenIntro = savedState.hasSeenIntro;
        this.spikePartsCollected = savedState.spikePartsCollected;
        this.hasSpikeModule = savedState.hasSpikeModule;
        this.hasFoundACE2 = savedState.hasFoundACE2;
        
        const WORLD_SIZE = 2000;
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

        // CREAZIONE DELLA MEMBRANA FLUIDA
        this.lipidOcean = this.add.tileSprite(
            WORLD_SIZE / 2, 
            WORLD_SIZE / 2, 
            WORLD_SIZE, 
            WORLD_SIZE, 
            'lipid_pattern'
        );
        
        // Variabili per la raccolta dei moduli
        this.canShowReceptorWarning = true;

        // GIOCATORE
        this.player = new Spaceship(this, 1000, 1800, 'nav_front');
        this.player.setScale(0.35);
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        this.abi = new ABI(this);

        this.abi.MoveDialogueY(0); 

        //this.scene.launch('ABIScene');

        const abiScene = this.scene.get('ABIScene');

         // --- 1. GENERAZIONE DEI RELITTI VIRALI (6 in totale) ---
        // Array che definisce quali virus hanno il pezzo (true) e quali no (false)
        const debrisData = [
            { id: 0, x: 800, y: 1200, key: 'virus_debris_1', hasPart: true },
            { id: 1, x: 500, y: 800, key: 'virus_debris_2', hasPart: false },
            { id: 2, x: 1500, y: 1500, key: 'virus_debris_3', hasPart: true },
            { id: 3, x: 500, y: 100, key: 'virus_debris_1', hasPart: false },
            { id: 4, x: 100, y: 1000, key: 'virus_debris_2', hasPart: true },
            { id: 5, x: 1700, y: 500, key: 'virus_debris_3', hasPart: false }
        ];

        debrisData.forEach((data) => {
            // Controllo se questo detrito è già stato distrutto in una sessione precedente
            if (savedState.destroyedDebrisIds.includes(data.id)) return;
            
            let debris = this.add.sprite(data.x, data.y, data.key);
            debris.setScale(0.2);
            debris.setName(data.id.toString()); // Memorizziamo l'ID nel nome dello sprite
            this.physics.add.existing(debris);

            this.debrisList.push(debris);
            
            this.physics.add.overlap(this.player, debris, () => {
                this.extractSpikePart(debris, data.hasPart);
            });
        });


        // --- 2. GENERAZIONE DEI RECETTORI FINTI (6 in totale) ---
        const fakeReceptorsCoords = [
            { x: 500, y: 350, key: 'receptor_fake1' }, 
            { x: 1600, y: 1100, key: 'receptor_fake2' }, 
            { x: 250, y: 1750, key: 'receptor_fake3' },
            { x: 1750, y: 750, key: 'receptor_fake1' }, 
            { x: 1600, y: 1800, key: 'receptor_fake2' }, 
            { x: 750, y: 1000, key: 'receptor_fake3' }
        ];

        fakeReceptorsCoords.forEach((data) => {
            // Crea lo sprite usando la 'key' definita nell'array
            let fakeReceptor = this.add.sprite(data.x, data.y, data.key);
            
            fakeReceptor.setScale(0.2); // Decommenta e modifica se sono troppo grandi
            
            this.physics.add.existing(fakeReceptor, true); // true = corpo statico
            
            this.physics.add.collider(this.player, fakeReceptor, () => {
                this.hitWrongReceptor();
                JournalScene.unlockItem(this, 'receptor_fake', this.levelDiscoverables);
            });
        });


        // --- 3. IL RECETTORE CORRETTO (ACE2 - 1 solo) ---
        this.portal = this.add.sprite(1000, 200, 'receptor_ace2'); 
        this.portal.setScale(0.2); 
        this.physics.add.existing(this.portal, true);
       
        this.physics.add.collider(this.player, this.portal, () => {
            this.tryEnterACE2();
            JournalScene.unlockItem(this, 'receptor_ace2', this.levelDiscoverables);
        });


       // INPUTS
        if (this.input.keyboard) {
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

            this.input.keyboard.on('keydown-ESC', () => {
                if (!this.abi.isTalking) {
                    this.scene.pause();
                    this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
                }
            });

            // --- NUOVO: Tasto 'I' per aprire il Data Log ---
            this.input.keyboard.on('keydown-I', () => {
                // Impedisce di aprire il diario durante un dialogo o una transizione
                if (this.isTransitioning || this.abi.isTalking) return;

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

        // --- NUOVO: Riattiva la fisica quando chiudi il diario ---
        // Questo evento scatta automaticamente quando JournalScene chiama this.scene.resume()
        this.events.on('pause', () => {
            this.scene.sleep('ABIScene'); // Nasconde istantaneamente il contatore
        });

        // Quando la scena riprende
        this.events.on('resume', () => {
            this.physics.world.resume();
            this.scene.wake('ABIScene'); // Fa riapparire il contatore intatto
        });
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // --- COLLISIONI E OVERLAP ---
        this.physics.add.overlap(this.player, this.spikeItem, () => {
            this.collectSpikeModule();
        });

        //Toccare il portale (Collider = ci sbatti contro e ti blocca)
        this.physics.add.collider(this.player, this.portal, () => {
            this.tryEnterACE2();
        });

        // --- CREAZIONE CONTATORE UI ---
        this.spikeCounterText = abiScene.add.text(this.scale.width/2, 20, 'Spike Fragments: 0/3', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffeb3b',
            backgroundColor: '#00000088',
            padding: { x: 15, y: 10 }
        })
        .setOrigin(0.5, 0) // Ancorato in alto a destra
        .setScrollFactor(0) // Incollato alla telecamera
        .setDepth(10)
        .setVisible(false)

        if (this.spikePartsCollected > 0) {
            this.spikeCounterText.setText(`Spike Fragments: ${this.spikePartsCollected}/3`);
            this.spikeCounterText.setVisible(true);
            if (this.hasSpikeModule) {
                this.spikeCounterText.setColor('#4caf50');
            }
        }

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            if (this.spikeCounterText) {
                this.spikeCounterText.setPosition(gameSize.width/2, 20);
            }
        });

        //TODO: remove shortcut
        this.input.keyboard!.on('keydown-O', () => {
            console.log("DEBUG: Salto direttamente alla Scene2_Membrane!");
            
            // Ferma eventuali musiche o robe in sospeso
            this.scene.start('Scene2_Membrane', { incomingTexture: this.player.texture.key });
        });

        
        // -----------------------------------------------------------------

        // Mostra i controlli la prima volta che si entra nella scena
        if (!Scene1_External.hasShownControls) {
            Scene1_External.hasShownControls = true;
            this.scene.pause(this.scene.key);
            this.scene.launch('ControlsScene', { parentScene: this.scene.key });
        }

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

        this.initialDialogues = [];

        this.initialDialogues.push(allDialogues.tutorials.tutorial_1.dialogue_1);
        this.initialDialogues.push(allDialogues.tutorials.tutorial_1.dialogue_2);
        this.initialDialogues.push(allDialogues.tutorials.tutorial_1.dialogue_3);
        this.initialDialogues.push(allDialogues.tutorials.tutorial_1.dialogue_4);
        this.initialDialogues.push(allDialogues.tutorials.tutorial_1.dialogue_5);
        this.initialDialogues.push(allDialogues.tutorials.tutorial_1.dialogue_6);
        this.initialDialogues.push(allDialogues.tutorials.tutorial_1.dialogue_7);

        this.dialogue2 = allDialogues.tutorials.tutorial_1.dialogue_8;
        this.dialogue3 = allDialogues.tutorials.tutorial_1.dialogue_9;
        this.dialogue4 = allDialogues.tutorials.tutorial_1.dialogue_10;
        this.dialogue5 = allDialogues.tutorials.tutorial_1.dialogue_11;
        this.dialogue6 = allDialogues.tutorials.tutorial_1.dialogue_12;
        this.dialogue7 = allDialogues.tutorials.tutorial_1.dialogue_13;
        this.dialogue8 = allDialogues.tutorials.tutorial_1.dialogue_14;
        this.dialogue9 = allDialogues.tutorials.tutorial_1.dialogue_15;
        this.dialogue10 = allDialogues.tutorials.tutorial_1.dialogue_16;
        this.dialogue11 = allDialogues.tutorials.tutorial_1.dialogue_17;



        if (!this.sound.get('bg_music')) {
        const music = this.sound.add('bg_music', {
            loop: true,
            volume: 0.5 // Puoi collegarlo ai tuoi settings!
        });
        music.play();
        }

        this.events.once('shutdown', () => {
            if (wrapper) wrapper.remove();

            if (this.spikeCounterText) {
                this.spikeCounterText.destroy();
            }
            
            this.scene.sleep('ABIScene');
        });

        this.time.delayedCall(150, () => {
            this.isTransitioning = false;
        });

    }

    update() {
        if (this.isTransitioning) return;

        //TRIGGER SEQUENZA INTRODUTTIVA
        if (!this.hasSeenIntro && this.isTryingToMove()) {
            this.hasSeenIntro = true;
            this.saveProgress();
            this.abi.showDialogue(
                "A.B.I.",
                this.initialDialogues          
            );
            return;
        }

        // 2. GESTIONE STATO "TALKING": Ora manda avanti le pagine
        if (this.abi.isTalking) {
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
            
            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                this.abi.nextDialoguePage();
            }
            return; 
        }
        if (this.gameState === 'EXPLORING') {
            this.player.update(); // La logica di movimento è ora nella classe Spaceship
            
            // L'EFFETTO FLUIDO:
            this.lipidOcean.tilePositionX += 0.1;
            this.lipidOcean.tilePositionY += 0.05;
        }


    }

    private startTransitionToInside() {
        this.isTransitioning = true;

        this.scene.sleep('ABIScene');

        // Assicuriamoci che il giocatore resti fermo durante il nero
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        const currentProgress = parseInt(localStorage.getItem('maxUnlockedLevel') || '1', 10);
        if (currentProgress < 2) {
            localStorage.setItem('maxUnlockedLevel', '2');
        }

        this.cameras.main.fadeOut(1500, 0, 0, 0);
        
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('Scene2_Membrane', { incomingTexture: this.player.texture.key });
        });
    }

    // Controlla se il giocatore sta premendo almeno un tasto direzionale
    private isTryingToMove(): boolean {
        if (!this.player || !this.player.body) {
            return false;
        }
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        return body.velocity.x !== 0 || body.velocity.y !== 0;
    }

    // --- LOGICA DI MOVIMENTO E TRANSIZIONE ---

    private changeZone() {
        if (this.isTransitioning || this.gameState === 'TALKING') return;
        this.isTransitioning = true;

        this.scene.stop('ABIScene');
        
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        this.cameras.main.fadeOut(800, 0, 0, 0);

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            const currentTexture = this.player.texture.key;
            this.scene.start('Scene2_Membrane', { incomingTexture: currentTexture });
        });
    }

    // Funzione chiamata quando tocchi la chiave gialla
    private collectSpikeModule() {
        if (this.hasSpikeModule) return; // Evita esecuzioni doppie
        
        this.hasSpikeModule = true;
        this.spikeItem.destroy(); // Fai sparire l'oggetto dalla mappa

        this.abi.showDialogue(
            "A.B.I.",
            this.dialogue2
        );
    }

    // Funzione chiamata quando sbatti contro il rettangolo verde
    private tryEnterACE2() {
        if (this.gameState === 'TALKING' || this.isTransitioning) return;
        
        if (!this.hasFoundACE2) {
            this.hasFoundACE2 = true; // Sblocca la raccolta dei frammenti!
            this.saveProgress();
            
            // Fermiamo il player per fargli leggere il dialogo
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
            
            this.abi.showDialogue(
                "A.B.I.",
                this.dialogue3
            );
            return; // Usciamo dalla funzione
        }
        
        if (!this.hasSpikeModule) {
            if (this.canShowReceptorWarning) {
                this.canShowReceptorWarning = false;
                
                this.abi.showDialogue(
                    "A.B.I.",
                    this.dialogue4
                );

                this.time.delayedCall(3000, () => {
                    this.canShowReceptorWarning = true;
                });
            }
        } else {
            // Hai la chiave completa e sei sul recettore giusto
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

            this.abi.showDialogue(
                "A.B.I.",
                this.dialogue5, 
                () => {
                    this.startTransitionToInside();
                }
            );
        }
    }

    private extractSpikePart(debris: Phaser.GameObjects.GameObject, hasPart: boolean) {
        // 1. Usiamo this.abi.isTalking invece del vecchio gameState!
        if (this.abi.isTalking || this.isTransitioning) return;

        const sprite = debris as Phaser.GameObjects.Sprite;
        const itemDef = this.levelDiscoverables.find(i => i.texture === sprite.texture.key);
        
        if (itemDef) {
            JournalScene.unlockItem(this, itemDef.id, this.levelDiscoverables);
        }
        
        if (!this.hasFoundACE2) {
            // 2. Controllo Anti-Spam
            if (this.canShowDebrisWarning) {
                this.canShowDebrisWarning = false;
                
                // 3. Fermiamo fisicamente la navicella
                (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

                this.abi.showDialogue(
                    "A.B.I.",
                    this.dialogue6
                );

                // Ripristiniamo l'avviso dopo 3 secondi
                this.time.delayedCall(3000, () => {
                    this.canShowDebrisWarning = true;
                });
            }
            return; // Interrompe la funzione qui: il detrito NON viene distrutto
        }

        // Distruggi il relitto in modo che non possa essere interagito di nuovo
        debris.destroy();

        if (hasPart) {
            this.spikePartsCollected++;

            this.spikeCounterText.setText(`Spike Fragments: ${this.spikePartsCollected}/3`);
            
            // Se è il primissimo pezzo che troviamo, rendiamo visibile il contatore
            if (this.spikePartsCollected === 1) {
                this.spikeCounterText.setVisible(true);
                this.abi.showDialogue(
                    "A.B.I.",
                    this.dialogue7
                );
            }
            else if (this.spikePartsCollected == 2) {
                this.abi.showDialogue(
                    "A.B.I.",
                    this.dialogue8
                );
            } else {
                this.hasSpikeModule = true;
                this.spikeCounterText.setColor('#4caf50');
                
                
                this.abi.showDialogue(
                    "A.B.I.",
                    this.dialogue9
                );
            }
        } else {
            
            this.abi.showDialogue(
                "A.B.I.",
                this.dialogue10
            );
        }

        this.saveProgress();
    }

    // LOGICA RECETTORI FINTI
    private hitWrongReceptor() {
        if (this.gameState === 'TALKING' || this.isTransitioning) return;

        if (this.canShowReceptorWarning) {
            this.canShowReceptorWarning = false;
            
            this.abi.showDialogue(
                "A.B.I.",
                this.dialogue11
            );

            this.time.delayedCall(3000, () => {
                this.canShowReceptorWarning = true;
            });
        }
    }

    private saveProgress() {
        // Calcola quali virus sono ancora attivi leggendo i loro Nomi/ID
        const activeIds = this.debrisList.filter(d => d.active).map(d => parseInt(d.name));
        const allIds = [0, 1, 2, 3, 4, 5];
        
        // La differenza tra tutti gli ID e quelli attivi ci dà i virus distrutti
        const destroyedDebrisIds = allIds.filter(id => !activeIds.includes(id));

        const state = {
            hasSeenIntro: this.hasSeenIntro,
            spikePartsCollected: this.spikePartsCollected,
            hasSpikeModule: this.hasSpikeModule,
            hasFoundACE2: this.hasFoundACE2,
            destroyedDebrisIds: destroyedDebrisIds
        };
        localStorage.setItem('scene1_state', JSON.stringify(state));
    }

    
}