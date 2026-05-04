import Phaser from 'phaser';

const SCREEN_W = 1280;
const SCREEN_H = 720;

// --- SCENA 1: ESTERNO DELLA CELLULA ---
// --- SCENA 1: ESTERNO DELLA CELLULA ---
class ExternalScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Sprite;
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

        //this.lipidOcean.setTileScale(2, 2); //Scala il pattern per renderlo più grande e meno ripetitivo
        //Verifica presenza del modulo Spike         

        // // LA CHIAVE (Modulo Spike)
        // this.spikeItem = this.add.circle(SCREEN_W, 400, 20, 0xffeb3b); // Cerchietto giallo         //Valuta di rimuovere
        // this.physics.add.existing(this.spikeItem);

        // // Animazione fluttuante per la chiave (opzionale ma molto carina)
        // this.tweens.add({
        //     targets: this.spikeItem,
        //     y: '-=20',
        //     duration: 1500,
        //     yoyo: true,
        //     repeat: -1
        // });

        // GIOCATORE
        this.player = this.physics.add.sprite(SCREEN_W, SCREEN_H, 'nav_front');
        this.player.setScale(0.35);
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

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
            { x: 1250, y: 175, key: 'receptor_fake2' }, 
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
        this.portal = this.add.sprite(800, 1800, 'receptor_ace2');
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
    }

    update() {
        if (this.isTransitioning || !this.cursors) return;

        //TRIGGER SEQUENZA INTRODUTTIVA
        if (!this.hasSeenIntro && this.isTryingToMove()) {
            this.hasSeenIntro = true;
            this.showDialogue(
                "A.B.I.",
                ["Hey! I am A.B.I.: Advanced Biometric Informer! I will be your assistant during this exploration!", "Systems online! Everything is ready for the exploration.", "We are in the extracellular space, and that thing under us is the plasma membrane—the cell's actual logistical border.", "Our mission is to infiltrate and map the internal processes.", "My sensors are detecting an ACE2 receptor on the membrane; it could be our gateway. Let's go take a closer look!"]            );
            return;
        }

        // 2. GESTIONE STATO "TALKING": Ora manda avanti le pagine
        if (this.gameState === 'TALKING') {
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
            
            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                this.nextDialoguePage(); // Va alla pagina successiva invece di chiudere subito
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
        this.uiContainer = this.add.container(SCREEN_W / 2, SCREEN_H - 120);
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

    private showDialogue(name: string, text: string | string[]) {
        this.gameState = 'TALKING';
        this.dialogueName.setText(name);

        // Se è una stringa singola, la dividiamo automaticamente
        if (typeof text === 'string') {
            // 180 è il limite indicativo di caratteri per pagina. Puoi alzarlo o abbassarlo.
            this.dialoguePages = this.autoSplitText(text, 180); 
        } else {
            // Se gli passi un Array, usi i tuoi tagli personalizzati, per farlo usa ["Prima pagina", "Seconda pagina", "Terza pagina"] invece di una stringa lunga
            this.dialoguePages = text;
        }

        this.currentDialoguePage = 0;
        this.updateDialogueView();
        this.uiContainer.setVisible(true);
    }

    // Mostra la pagina corrente e aggiorna il testo
    private updateDialogueView() {
        this.dialogueText.setText(this.dialoguePages[this.currentDialoguePage]);
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

    // Gestisce il click sullo SPAZIO
    private nextDialoguePage() {
        if (this.currentDialoguePage < this.dialoguePages.length - 1) {
            this.currentDialoguePage++;
            this.updateDialogueView();
        } else {
            this.hideDialogue();
        }
        if (this.waitingForTransition) {
                this.startTransitionToInside();
            }
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

        this.showDialogue(
            "A.B.I.",
            "Great job! You've retrieved a Spike Protein Module. Our external surface now perfectly mimics the envelope of SARS-CoV-2. We can trick the ACE2 receptor. Let's return to the docking point."        );
    }

    // Funzione chiamata quando sbatti contro il rettangolo verde
    private tryEnterACE2() {
        if (this.gameState === 'TALKING' || this.isTransitioning) return;

        if (!this.hasSpikeModule) {
            if (this.canShowReceptorWarning) {
                this.canShowReceptorWarning = false;
                
                this.showDialogue(
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
            this.waitingForTransition = true;

            this.showDialogue(
                "A.B.I.",
                "Molecular recognition confirmed. Docking sequence initiated. Hold on tight, the membrane is forming an invagination to pull us inside!"
            );
        }
    }

    private extractSpikePart(debris: Phaser.GameObjects.GameObject, hasPart: boolean) {
        if (this.gameState === 'TALKING' || this.isTransitioning) return;

        // Distruggi il relitto in modo che non possa essere interagito di nuovo
        debris.destroy();

        if (hasPart) {
            this.spikePartsCollected++;
            
            if (this.spikePartsCollected < 3) {
                this.showDialogue(
                    "A.B.I.",
                    `Usable protein fragment extracted! We currently have ${this.spikePartsCollected} out of 3 necessary components. Let's keep searching the area for more viable debris.`
                );
            } else {
                this.hasSpikeModule = true;
                this.showDialogue(
                    "A.B.I.",
                    "Third fragment acquired! The Spike Module is fully assembled. Our hull now mimics the viral envelope perfectly. Let's locate the specific ACE2 receptor and initiate docking."
                );
            }
        } else {
            this.showDialogue(
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
            
            this.showDialogue(
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
    // width e height diventano le dimensioni "logiche" (o native) del tuo gioco
    width: SCREEN_W, 
    height: SCREEN_H,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },
    // Gestione della scalabilità
    scale: {
        // FIT: Ridimensiona il canvas per riempire la finestra mantenendo le proporzioni esatte. 
        // Aggiungerà bande nere ai lati o sopra/sotto se lo schermo ha un formato diverso.
        mode: Phaser.Scale.FIT,
        
        // CENTER_BOTH: Centra il gioco sia verticalmente che orizzontalmente nella pagina
        autoCenter: Phaser.Scale.CENTER_BOTH,
        
        // Risoluzione minima e massima (opzionale, ma utile per evitare che diventi minuscolo su mobile)
        min: {
            width: 800,
            height: 450
        },
        max: {
            width: 1920,
            height: 1080
        }
    },
    scene: [ExternalScene, InternalScene] 
};

const game = new Phaser.Game(config);