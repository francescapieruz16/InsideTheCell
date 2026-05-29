import Phaser from 'phaser';

import ABI from '../classes/abi';
import Spaceship from '../classes/spaceship';

export default class Scene3_Internal extends Phaser.Scene {

    private player!: Spaceship;
    private interactKey!: Phaser.Input.Keyboard.Key;

    private startingTexture: string = 'nav_front';

    private abi!: ABI;

    private background_scene!: Phaser.GameObjects.TileSprite;

    preload() {
        // Carichiamo l'immagine che useremo per lo sfondo scorrevole
        this.load.image('background_scene3', '/assets/tutorial/sfondi/scene3_background3.png'); // ATTENZIONE: Sostituisci con il percorso reale!
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
        const WORLD_SIZE = 4000;

        // 2. Impostiamo i limiti della fisica e della telecamera a questa dimensione
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

        // 3. Creiamo lo sfondo animato (TileSprite) che copre l'intero mondo
        this.background_scene = this.add.tileSprite(
            WORLD_SIZE / 2,
            WORLD_SIZE / 2,
            WORLD_SIZE,
            WORLD_SIZE,
            'background_scene3'
        ).setDepth(-1); // Lo mettiamo dietro a tutto

        this.background_scene.setTileScale(0.25, 0.25);

        // 4. Creiamo il giocatore al centro del mondo
        this.player = new Spaceship(this, WORLD_SIZE / 2, WORLD_SIZE / 2, this.startingTexture);
        this.player.setScale(0.3); // Impostiamo una scala per la navicella
        (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

        // 5. La telecamera segue il giocatore
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.fadeIn(800, 0, 0, 0); // Effetto di transizione in entrata

        // 6. Inizializziamo l'assistente A.B.I.
        this.abi = new ABI(this);

        // 7. Gestiamo gli input da tastiera
        if (this.input.keyboard) {
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

            // Mettiamo in pausa il gioco con il tasto ESC
            this.input.keyboard.on('keydown-ESC', () => {
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
    }
}