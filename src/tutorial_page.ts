import Phaser from 'phaser';

import ABI from './classes/abi';
import Spaceship from './classes/spaceship';

const SCREEN_W = 1280;
const SCREEN_H = 720;

// --- SCENA 1: ESTERNO DELLA CELLULA ---
// --- SCENA 1: ESTERNO DELLA CELLULA ---
class ExternalScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactKey!: Phaser.Input.Keyboard.Key;
    private portal!: Phaser.GameObjects.Sprite;
    private isTransitioning: boolean = false;

    // --- NUOVE VARIABILI PER IL DIALOGO ---
    private gameState: 'EXPLORING' | 'TALKING' = 'EXPLORING';
    private hasSeenIntro: boolean = false;
    
    // UI Elements
    private uiContainer!: Phaser.GameObjects.Container;
    private dialogueName!: Phaser.GameObjects.Text;
    private dialogueText!: Phaser.GameObjects.Text;
    private portrait!: Phaser.GameObjects.Image;
    private dialoguePages: string[] = [];
    private currentDialoguePage: number = 0;
    private hasSpikeModule: boolean = false;
    private spikeItem!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
    private canShowAce2Warning: boolean = true; // Evita lo spam del dialogo
    private waitingForTransition: boolean = false;

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
    }

    create() {
        this.isTransitioning = false;
        this.hasSeenIntro = false;
        this.gameState = 'EXPLORING';
        
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
        this.spikePartsCollected = 0;
        this.hasSpikeModule = false;
        this.canShowReceptorWarning = true;

        // GIOCATORE
        this.player = new Spaceship(this, 1000, 1800, 'nav_front');
        this.player.setScale(0.35);
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        this.abi = new ABI(this);

         // --- 1. GENERAZIONE DEI RELITTI VIRALI (6 in totale) ---
        // Array che definisce quali virus hanno il pezzo (true) e quali no (false)
        const debrisData = [
            { x: 800, y: 1200, key: 'virus_debris_1', hasPart: true },
            { x: 500, y: 800, key: 'virus_debris_2', hasPart: false },
            { x: 1500, y: 1500, key: 'virus_debris_3', hasPart: true },
            { x: 500, y: 100, key: 'virus_debris_1', hasPart: false },
            { x: 100, y: 1000, key: 'virus_debris_2', hasPart: true },
            { x: 1700, y: 500, key: 'virus_debris_3', hasPart: false }
        ];

        debrisData.forEach((data) => {
            
            let debris = this.add.sprite(data.x, data.y, data.key);
            debris.setScale(0.2)
            this.physics.add.existing(debris);
            
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
            });
        });


        // --- 3. IL RECETTORE CORRETTO (ACE2 - 1 solo) ---
        this.portal = this.add.sprite(1000, 200, 'receptor_ace2'); 
        this.portal.setScale(0.2); 
        this.physics.add.existing(this.portal, true);
       
        this.physics.add.collider(this.player, this.portal, () => {
            this.tryEnterACE2();
        });


        // INPUTS
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }

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

        // --- CREAZIONE DELL'INTERFACCIA DI DIALOGO ---
        this.createDialogueUI();

        // --- CREAZIONE CONTATORE UI ---
        // Lo posizioniamo in alto a destra (SCREEN_W - 20 pixel di margine)
        this.spikeCounterText = this.add.text(this.scale.width - 20, 20, 'Spike Fragments: 0/3', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffeb3b',
            backgroundColor: '#00000088',
            padding: { x: 15, y: 10 }
        })
        .setOrigin(1, 0) // Ancorato in alto a destra
        .setScrollFactor(0) // Incollato alla telecamera
        .setDepth(100)
        .setVisible(false)

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            if (this.spikeCounterText) {
                this.spikeCounterText.setPosition(gameSize.width - 20, 20);
            }
        });
    }

    update() {
        if (this.isTransitioning || !this.cursors) return;

        //TRIGGER SEQUENZA INTRODUTTIVA
        if (!this.hasSeenIntro && this.isTryingToMove()) {
            this.hasSeenIntro = true;
            this.abi.showDialogue(
                "A.B.I.",
                ["Hey! I am A.B.I.: Advanced Biometric Informer! I will be your assistant during this exploration!", 
                "We are in the extracellular space. Below us is the plasma membrane. To enter, we will mimic the infection strategy of the Coronavirus.", 
                "The virus uses a specific 'molecular handshake': its Spike protein must bind to a human receptor called ACE2 to unlock the cell.",
                "Step 1: Locate the target gateway. You must search the membrane and find the ACE2 receptor first, just like a real virus would.",
                "Step 2: Once scanned, our systems will calculate the exact shape of the Spike protein fragments we need to synthesize the key.",
                "Step 3: Only then can we scavenge those floating viral remnants to extract the necessary protein components.",
                "Let's move! Explore the area and locate the ACE2 receptor first!" ]            );
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
            this.handleMovement();
            
            // L'EFFETTO FLUIDO:
            this.lipidOcean.tilePositionX += 0.1;
            this.lipidOcean.tilePositionY += 0.05;
        }

    }

    // --- LOGICA DI DIALOGO ---

    private createDialogueUI() {
        // Creiamo un Container fissato allo schermo (ScrollFactor = 0)
        this.uiContainer = this.add.container(this.scale.width / 2, this.scale.height - 120);
        this.uiContainer.setScrollFactor(0); 
        this.uiContainer.setDepth(100); // Assicura che sia sempre in primo piano

        // Sfondo del dialogo (Nero semitrasparente con bordo verde)
        const bg = this.add.rectangle(0, 0, 1000, 200, 0x000000, 0.8);
        bg.setStrokeStyle(4, 0x4caf50);

        // Ritratto (Box per l'immagine sulla sinistra)
        const portraitBg = this.add.rectangle(-400, 0, 150, 150, 0x333333);
        this.portrait = this.add.image(-400, 0, 'ABI_standard');
        this.portrait.setDisplaySize(140, 140);

        // Testo del Nome
        this.dialogueName = this.add.text(-280, -70, "", { 
            fontSize: '28px', 
            fontStyle: 'bold',
            color: '#4caf50' 
        });

        // Testo del Messaggio
        this.dialogueText = this.add.text(-280, -30, "", { 
            fontSize: '22px', 
            color: '#ffffff',
            wordWrap: { width: 750 } // Manda a capo il testo automaticamente
        });

        // Suggerimento per proseguire
        const promptText = this.add.text(480, 70, "Press SPACE  ▼", { 
            fontSize: '18px', 
            color: '#aaaaaa' 
        }).setOrigin(1, 0.5);

        // Aggiungiamo tutto al container
        this.uiContainer.add([bg, portraitBg, this.portrait, this.dialogueName, this.dialogueText, promptText]);
        
        // Nascondiamo il container all'inizio
        this.uiContainer.setVisible(false);
    }


    private startTransitionToInside() {
        this.isTransitioning = true;
        this.waitingForTransition = false; // Resettiamo la variabile per sicurezza

        // Assicuriamoci che il giocatore resti fermo durante il nero
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        this.cameras.main.fadeOut(1500, 0, 0, 0);
        
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('InternalScene', { incomingTexture: this.player.texture.key });
        });
    }


    // Funzione che divide il testo in modo intelligente a fine frase
    private autoSplitText(text: string, maxLength: number): string[] {
        // Divide usando punto, esclamativo o interrogativo seguiti da spazio
        const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
        const pages: string[] = [];
        let currentPage = "";

        for (let sentence of sentences) {
            // Se aggiungendo la frase superiamo il limite e la pagina attuale non è vuota...
            if ((currentPage + sentence).length > maxLength && currentPage.trim() !== "") {
                pages.push(currentPage.trim());
                currentPage = sentence; // Inizia una nuova pagina con questa frase
            } else {
                currentPage += sentence; // Aggiunge la frase alla pagina corrente
            }
        }
        
        // Aggiunge l'ultima pagina rimanente
        if (currentPage.trim() !== "") {
            pages.push(currentPage.trim());
        }
        
        return pages;
    }

    private hideDialogue() {
        this.gameState = 'EXPLORING';
        this.uiContainer.setVisible(false);
    }

    // Controlla se il giocatore sta premendo almeno un tasto direzionale
    private isTryingToMove(): boolean {
        return this.cursors.left.isDown || this.cursors.right.isDown || 
               this.cursors.up.isDown || this.cursors.down.isDown;
    }

    // --- LOGICA DI MOVIMENTO E TRANSIZIONE ---

    private handleMovement() {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        const speed = 400;

        if (this.cursors.left.isDown) {
            body.setVelocityX(-speed);
            this.player.setTexture('nav_left');
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(speed);
            this.player.setTexture('nav_right');
        }

        if (this.cursors.up.isDown) {
            body.setVelocityY(-speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.setTexture('nav_back');
        } else if (this.cursors.down.isDown) {
            body.setVelocityY(speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.setTexture('nav_front');
        }

        body.velocity.normalize().scale(speed);
    }

    private changeZone() {
        if (this.isTransitioning || this.gameState === 'TALKING') return;
        this.isTransitioning = true;
        
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

        this.cameras.main.fadeOut(800, 0, 0, 0);

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            const currentTexture = this.player.texture.key;
            this.scene.start('InternalScene', { incomingTexture: currentTexture });
        });
    }

    // Funzione chiamata quando tocchi la chiave gialla
    private collectSpikeModule() {
        if (this.hasSpikeModule) return; // Evita esecuzioni doppie
        
        this.hasSpikeModule = true;
        this.spikeItem.destroy(); // Fai sparire l'oggetto dalla mappa

        this.abi.showDialogue(
            "A.B.I.",
            "Great job! You've retrieved a Spike Protein Module. Our external surface now perfectly mimics the envelope of SARS-CoV-2. We can trick the ACE2 receptor. Let's return to the docking point."        );
    }

    // Funzione chiamata quando sbatti contro il rettangolo verde
    private tryEnterACE2() {
        if (this.gameState === 'TALKING' || this.isTransitioning) return;
        
        if (!this.hasFoundACE2) {
            this.hasFoundACE2 = true; // Sblocca la raccolta dei frammenti!
            
            // Fermiamo il player per fargli leggere il dialogo
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
            
            this.abi.showDialogue(
                "A.B.I.",
                "Excellent! Target identified: the Angiotensin-Converting Enzyme 2 (ACE2) receptor. This is our gateway. However, we cannot trigger endocytosis without the correct molecular key. Search the viral debris scattered nearby for Spike protein fragments!"
            );
            return; // Usciamo dalla funzione
        }
        
        if (!this.hasSpikeModule) {
            if (this.canShowReceptorWarning) {
                this.canShowReceptorWarning = false;
                
                this.abi.showDialogue(
                    "A.B.I.",
                    "This is the correct ACE2 receptor, but access is denied. Our biochemical affinity is currently insufficient. We need to fully assemble the Spike Module first. Let's search the area for usable viral debris to extract the missing components."
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
                "Molecular recognition confirmed. Docking sequence initiated. Hold on tight, the membrane is forming an invagination to pull us inside!"
            , () => {
                    this.startTransitionToInside();
                }
            );
        }
    }

    private extractSpikePart(debris: Phaser.GameObjects.GameObject, hasPart: boolean) {
        // 1. Usiamo this.abi.isTalking invece del vecchio gameState!
        if (this.abi.isTalking || this.isTransitioning) return;
        
        if (!this.hasFoundACE2) {
            // 2. Controllo Anti-Spam
            if (this.canShowDebrisWarning) {
                this.canShowDebrisWarning = false;
                
                // 3. Fermiamo fisicamente la navicella
                (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);

                this.abi.showDialogue(
                    "A.B.I.",
                    "Wait! Don't extract random materials yet. We must locate our specific target, the ACE2 receptor, before we know exactly which viral components we need to synthesize the key."
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
            }
            
            if (this.spikePartsCollected < 3) {
                // 4. Corretto: this.abi.showDialogue
                this.abi.showDialogue(
                    "A.B.I.",
                    `Usable protein fragment extracted! We currently have ${this.spikePartsCollected} out of 3 necessary components. Let's keep searching the area for more viable debris.`
                );
            } else {
                this.hasSpikeModule = true;
                this.spikeCounterText.setColor('#4caf50');
                
                // 4. Corretto: this.abi.showDialogue
                this.abi.showDialogue(
                    "A.B.I.",
                    "Third fragment acquired! The Spike Module is fully assembled. Our hull now mimics the viral envelope perfectly. Let's locate the specific ACE2 receptor and initiate docking."
                );
            }
        } else {
            // 4. Corretto: this.abi.showDialogue
            this.abi.showDialogue(
                "A.B.I.",
                "Scanning... Negative. This viral particle is too degraded. The glycoproteins have completely denatured. There is nothing useful to extract here."
            );
        }
    }

    // LOGICA RECETTORI FINTI
    private hitWrongReceptor() {
        if (this.gameState === 'TALKING' || this.isTransitioning) return;

        if (this.canShowReceptorWarning) {
            this.canShowReceptorWarning = false;
            
            this.abi.showDialogue(
                "A.B.I.",
                "Negative. This is not the target receptor. The molecular structure does not match our parameters. We need to find the specific Angiotensin-Converting Enzyme 2 (ACE2) to gain entry."
            );

            this.time.delayedCall(3000, () => {
                this.canShowReceptorWarning = true;
            });
        }
    }
}

// --- SCENA 2: INTERNO DELLA CELLULA ---
class InternalScene extends Phaser.Scene {
    // CORREZIONE 1: Il tipo deve essere Sprite, non Rectangle
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private startingTexture: string = 'nav_front';

    constructor() {
        super('InternalScene');
    }

    init(data: any) {
        // Se il pacchetto dati contiene 'incomingTexture', lo salviamo
        if (data && data.incomingTexture) {
            this.startingTexture = data.incomingTexture;
        }
    }

    create() {
        // CORREZIONE 2: Ripristinati i limiti di mondo e telecamera a 4000x4000
        const WORLD_SIZE = 4000;
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

        // Sfondo rosa adattato alle nuove dimensioni
        this.add.rectangle(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, 0xfce4ec);

        this.add.text(SCREEN_W, SCREEN_H - 100, 'Sei dentro la cellula', { color: '#000', fontSize: '32px' }).setOrigin(0.5);

        // CORREZIONE 3: Creazione dello Sprite invece del rettangolo rosso
        this.player = this.physics.add.sprite(SCREEN_W, SCREEN_H, this.startingTexture);
        this.player.setScale(0.35);
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        if (this.input.keyboard) this.cursors = this.input.keyboard.createCursorKeys();

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Effetto di Fade In quando si entra nella nuova stanza
        this.cameras.main.fadeIn(800, 0, 0, 0);
    }

    update() {
        if (!this.cursors) return;
        this.handleMovement();
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
}

// --- CONFIGURAZIONE E AVVIO ---
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    // --- NUOVA CONFIGURAZIONE DELLO SCHERMO ---
    scale: {
        mode: Phaser.Scale.RESIZE, // Adatta il gioco alla finestra
        parent: 'game-container', // Assicurati di avere un div con questo ID nel tuo file HTML (se usi un container)
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // ------------------------------------------
    physics: {
        default: 'arcade',
        arcade: {
            debug: false // (o true se stai ancora testando le hitbox!)
        }
    },
    scene: [ExternalScene, InternalScene]
};

const game = new Phaser.Game(config);