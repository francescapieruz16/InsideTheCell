import Phaser from 'phaser';

export default class ABI {
    private scene: Phaser.Scene;
    private uiContainer!: Phaser.GameObjects.Container;
    private dialogueText!: Phaser.GameObjects.Text;
    private dialogueName!: Phaser.GameObjects.Text;
    private portrait!: Phaser.GameObjects.Image;
    private promptText!: Phaser.GameObjects.Text;
    private dialoguePages: string[] = [];
    private currentDialoguePage: number = 0;
    
    public isTalking: boolean = false;
    public isUnskippable: boolean = false;
    
    // Questa variabile salverà l'azione speciale da fare a fine dialogo (es. cambiare scena)
    private onCloseCallback?: () => void; 

    // Variabili per la sintesi vocale
    private synth: SpeechSynthesis;
    private robotVoice: SpeechSynthesisVoice | null = null;


    // Variabili per l'effetto di digitazione
    private isTyping: boolean = false;
    private currentFullText: string = "";
    private currentVisibleText: string = "";
    private typingTimer?: Phaser.Time.TimerEvent;
    private readonly TYPING_SPEED: number = 40; // Millisecondi tra una lettera e l'altra (regolabile)

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createDialogueUI();

        this.synth = window.speechSynthesis;
        this.initVoice();

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = this.initVoice.bind(this);
        }
    }

    // --- METODO PER CARICARE LA VOCE ---
    private initVoice() {
        const voices = this.synth.getVoices();
        // Cerca una voce italiana, altrimenti prende il fallback di sistema
        this.robotVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices[0] || null;  
      }

    // --- METODO PER SINTETIZZARE E RIPRODURRE L'AUDIO ---
    private speakText(text: string) {
        // Fondamentale: cancella qualsiasi audio in coda o in riproduzione
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB'; // Imposta la lingua (puoi cambiarla in base alla voce scelta)
        if (this.robotVoice) {
            utterance.voice = this.robotVoice;
        }

        // Parametri per l'effetto robotico
        utterance.pitch = 1.5; // Tonalità molto bassa e piatta
        utterance.rate = 1.5;  // Leggermente rallentato
        
        this.synth.speak(utterance);
    }

    private createDialogueUI() {
        const screenW = this.scene.scale.width;
        const screenH = this.scene.scale.height;

        this.uiContainer = this.scene.add.container(screenW / 2, screenH - 120);
        this.uiContainer.setScrollFactor(0); 
        this.uiContainer.setDepth(100); 

        const bg = this.scene.add.rectangle(0, 0, 1000, 200, 0x000000, 0.87);
        bg.setStrokeStyle(4, 0x4caf50);

        this.portrait = this.scene.add.image(-400, 0, 'ABI_standard');
        this.portrait.setDisplaySize(200, 200);

        this.dialogueName = this.scene.add.text(-280, -70, "", { 
            fontSize: '28px', fontStyle: 'bold', color: '#4caf50' 
        });

        this.dialogueText = this.scene.add.text(-280, -30, "", { 
            fontSize: '22px', color: '#ffffff', wordWrap: { width: 750 } 
        });

        this.promptText = this.scene.add.text(480, 70, "Press SPACE ▼", { 
            fontSize: '18px', color: '#aaaaaa' 
        }).setOrigin(1, 0.5);

        this.uiContainer.add([bg, this.portrait, this.dialogueName, this.dialogueText, this.promptText]);
        this.uiContainer.setVisible(false);

        this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            if (this.uiContainer) {
                // Ricalcola il centro esatto e il fondo dello schermo ad ogni ridimensionamento
                this.uiContainer.setPosition(gameSize.width / 2, gameSize.height - 120);
            }
        });
    }

    // Nota l'aggiunta di "onClose": è una funzione opzionale!
    public showDialogue(name: string, text: string | string[], onClose?: () => void, unskippable: boolean = false) {
        this.isTalking = true;
        this.isUnskippable = unskippable;
        this.dialogueName.setText(name);
        this.onCloseCallback = onClose; // Salviamo l'azione da fare alla fine

        this.promptText.setVisible(!unskippable);

        if (typeof text === 'string') {
            this.dialoguePages = this.autoSplitText(text, 180); 
        } else {
            this.dialoguePages = text;
        }

        this.currentDialoguePage = 0;
        this.updateDialogueView();
        this.uiContainer.setVisible(true);
    }

    private updateDialogueView() {
        this.currentFullText = this.dialoguePages[this.currentDialoguePage];
        this.currentVisibleText = "";
        this.dialogueText.setText("");
        this.isTyping = true;

        // 1. Avvia la voce per l'intera stringa
        this.speakText(this.currentFullText);

        // 2. Pulisci eventuali timer precedenti
        if (this.typingTimer) {
            this.typingTimer.remove();
        }

        // 3. Avvia l'evento ciclico di Phaser per stampare il testo
        this.typingTimer = this.scene.time.addEvent({
            delay: this.TYPING_SPEED,
            callback: this.typeNextChar,
            callbackScope: this,
            loop: true
        });
    }


    private typeNextChar() {
        // Aggiunge il carattere successivo
        this.currentVisibleText += this.currentFullText[this.currentVisibleText.length];
        this.dialogueText.setText(this.currentVisibleText);

        // Controlla se abbiamo finito di scrivere l'intera pagina
        if (this.currentVisibleText.length === this.currentFullText.length) {
            this.completeTyping();
        }
    }

    private completeTyping() {
        this.isTyping = false;
        if (this.typingTimer) {
            this.typingTimer.remove();
        }
        // Assicura che tutto il testo sia mostrato
        this.dialogueText.setText(this.currentFullText);
    }

    private autoSplitText(text: string, maxLength: number): string[] {
        const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
        const pages: string[] = [];
        let currentPage = "";

        for (let sentence of sentences) {
            if ((currentPage + sentence).length > maxLength && currentPage.trim() !== "") {
                pages.push(currentPage.trim());
                currentPage = sentence; 
            } else {
                currentPage += sentence; 
            }
        }
        if (currentPage.trim() !== "") pages.push(currentPage.trim());
        return pages;
    }

    public nextDialoguePage() {
        if (this.isTyping) {
            // STATO 1: Sta scrivendo. Premendo spazio forziamo la comparsa di tutto il testo.
            this.completeTyping();
        } else {
            // STATO 2: Ha finito di scrivere. Premendo spazio passiamo alla pagina dopo.
            if (this.currentDialoguePage < this.dialoguePages.length - 1) {
                this.currentDialoguePage++;
                this.updateDialogueView();
            } else {
                this.hideDialogue();
            }
        }
    }

    public hideDialogue() {
        this.isTalking = false;
        this.isUnskippable = false;
        this.uiContainer.setVisible(false);

        // --- FERMA L'AUDIO ALLA CHIUSURA DEL DIALOGO ---
        this.synth.cancel();
        
        const callback = this.onCloseCallback;
        this.onCloseCallback = undefined; 
        
        if (callback) {
            callback();
        }
    }
}