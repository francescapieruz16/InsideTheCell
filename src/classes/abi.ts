import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';
import { GameSettings } from '../ExploreZone_scenes/SettingsScene';

class ABIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ABIScene' });
    }
}

export default class ABI {
    private scene: Phaser.Scene;
    private uiScene: Phaser.Scene;
    private uiContainer!: Phaser.GameObjects.Container;
    private dialogueText!: Phaser.GameObjects.Text;
    private dialogueName!: Phaser.GameObjects.Text;
    private portrait!: Phaser.GameObjects.Image;
    private promptText!: Phaser.GameObjects.Text;
    private dialoguePages: string[] = [];
    private currentDialoguePage: number = 0;
    
    public isTalking: boolean = false;
    public isUnskippable: boolean = false;
    
    private onCloseCallback?: () => void; 

    private synth: SpeechSynthesis;
    private robotVoice: SpeechSynthesisVoice | null = null;

    private isTyping: boolean = false;
    private currentFullText: string = "";
    private currentVisibleText: string = "";
    private typingTimer?: Phaser.Time.TimerEvent;
    
    // Rimuoviamo il readonly per poter modificare la velocità in base ai settings
    private TYPING_SPEED: number = 40; 

    private radioTimer?: Phaser.Time.TimerEvent; 

    private keepOpen: boolean = false;      
    private offsetY: number = -160;
    private targetOffsetY: number = -160;

    private previousPinchState: boolean = false;    

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        
        let abiScene = this.scene.scene.get('ABIScene');
        if (!abiScene) {
            // Primo avvio assoluto
            this.scene.scene.add('ABIScene', ABIScene, true);
        }
        
        this.uiScene = this.scene.scene.get('ABIScene');

        let needsDelay = false; // Flag di sicurezza

        if (this.scene.scene.isSleeping('ABIScene')) {
            this.scene.scene.wake('ABIScene');
        } else if (!this.scene.scene.isActive('ABIScene')) {
            this.scene.scene.start('ABIScene');
            needsDelay = true; // Se stiamo appena avviando la scena, aspettiamo un attimo prima di accedere agli oggetti
        }
        
        this.scene.scene.bringToTop('ABIScene');

        this.uiScene = this.scene; 

        this.createDialogueUI();

        this.synth = window.speechSynthesis;
        this.initVoice();

        if (needsDelay) {
            // Se la UI si sta avviando, aspettiamo 50ms prima di creare gli elementi
            this.scene.time.delayedCall(50, () => {
                this.createDialogueUI();
            });
        } else {
            this.createDialogueUI();
        }

        this.synth = window.speechSynthesis;
        this.initVoice();

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = this.initVoice.bind(this);
        }

        this.scene.events.on('update', this.update, this);

        this.scene.events.once('shutdown', () => {
            this.scene.events.off('update', this.update, this);

            this.interrupt();
            
            if (this.uiContainer) {
                this.uiContainer.destroy();
            }
        });
    }

    // --- NUOVO METODO HELPER PER LEGGERE I SETTINGS ---
    private getSettings(): GameSettings {
        const saved = localStorage.getItem('gameSettings');
        if (saved) {
            return JSON.parse(saved);
        }
        // Valori di default se non è mai stata aperta la scena Settings
        return { textSpeed: 'Normal', masterVol: 100, voiceVol: 100, previousVoiceVol: 100, sfxVol: 100, musicVol: 100 };
    }

    private initVoice() {
        const loadVoices = () => {
            const voices = this.synth.getVoices();
            this.robotVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices[0] || null;  
        };

        loadVoices();

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
    }

    private speakText(text: string) {
        this.synth.cancel();

        // 1. Recuperiamo i settings attuali prima di parlare
        const settings = this.getSettings();

        // 2. Calcoliamo il volume reale
        // Esempio: se Master è 80% e Voice è 50%, il volume finale è 0.8 * 0.5 = 0.4
        const masterRatio = settings.masterVol / 100;
        const voiceRatio = settings.voiceVol / 100;
        const finalVolume = masterRatio * voiceRatio;

        // Se il volume è 0, non facciamo nemmeno partire la sintesi vocale
        if (finalVolume <= 0) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB'; 
        
        if (!this.robotVoice) {
            const voices = this.synth.getVoices();
            this.robotVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices[0] || null;
        }
        
        if (this.robotVoice) {
            utterance.voice = this.robotVoice;
        }

        utterance.pitch = 1.5; 
        utterance.rate = 1.5;  

        // 3. Applichiamo il volume calcolato
        utterance.volume = finalVolume;
        
        this.synth.speak(utterance);
    }

    private update(time: number, delta: number) {
        const inputMode = this.scene.registry.get('inputMode') || localStorage.getItem('inputMode');
        if (inputMode !== 'hand') return;

        const tracker = HandTrackingController.getInstance();
        const currentPinch = tracker.isClicked; 

        if (currentPinch && !this.previousPinchState) {
            if (this.isTalking && !this.isUnskippable) {
                this.nextDialoguePage();
            }
        }

        this.previousPinchState = currentPinch;
    }

    private createDialogueUI() {
        const screenW = this.uiScene.cameras?.main?.width || this.scene.scale.width;
        const screenH = this.uiScene.cameras?.main?.height || this.scene.scale.height;

        this.uiContainer = this.uiScene.add.container(screenW / 2, screenH);
        this.uiContainer.setScrollFactor(0); 
        this.uiContainer.setDepth(999);

        this.offsetY = (this as any).targetOffsetY !== undefined ? (this as any).targetOffsetY : -160;

        const bg = this.uiScene.add.rectangle(0, this.offsetY, 1300, 240, 0x000000, 0.92);
        bg.setStrokeStyle(4, 0x4caf50);

        this.portrait = this.uiScene.add.image(-530, this.offsetY, 'ABI_standard');
        this.portrait.setDisplaySize(250, 250);

        this.dialogueName = this.uiScene.add.text(-380, this.offsetY - 80, "", { 
            fontSize: '32px', fontStyle: 'bold', color: '#4caf50' 
        });

        this.dialogueText = this.uiScene.add.text(-380, this.offsetY - 30, "", { 
            fontSize: '24px', color: '#ffffff', wordWrap: { width: 1000 }
        });

        this.promptText = this.uiScene.add.text(640, this.offsetY + 105, "Press SPACE ▼", { 
            fontSize: '18px', color: '#aaaaaa' 
        }).setOrigin(1, 0.5);

        this.uiContainer.add([bg, this.portrait, this.dialogueName, this.dialogueText, this.promptText]);
        this.uiContainer.setVisible(false);

        const updateContainerLayout = (width: number, height: number) => {
            if (!this.uiContainer) return;

            this.uiContainer.setPosition(width / 2, height + this.offsetY);        

            const baseWidth = 1400; 
            const scaleFactor = Math.min(1, width / baseWidth);
            
            this.uiContainer.setScale(scaleFactor);
        };

        updateContainerLayout(screenW, screenH);

        this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            updateContainerLayout(gameSize.width, gameSize.height);
        });
    }

    public MoveDialogueY(offsetY: number) {
        this.targetOffsetY = offsetY; // Salva in memoria la posizione richiesta
        
        if (!this.uiContainer) return; 

        this.offsetY = offsetY;
        
        const bottomY = this.uiScene.cameras?.main?.height || this.scene.scale.height;

        this.uiScene.tweens.add({
            targets: this.uiContainer,
            y: bottomY + offsetY,
            duration: 300,
            ease: 'Power2'
        });
    }

    public showDialogue(name: string, text: string | string[], onClose?: () => void, unskippable: boolean = false, keepOpen: boolean = false) {
        
        if (!this.uiContainer) {
            this.scene.time.delayedCall(10, () => this.showDialogue(name, text, onClose, unskippable, keepOpen));
            return;
        }

        this.interrupt(); 

        this.keepOpen = keepOpen;
        this.isTalking = true;
        this.isUnskippable = unskippable;
        this.dialogueName.setText(name);
        this.onCloseCallback = onClose; 

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

        this.speakText(this.currentFullText);

        if (this.typingTimer) {
            this.typingTimer.remove();
        }

        // --- APPLICAZIONE VELOCITÀ TESTO ---
        const settings = this.getSettings();
        
        if (settings.textSpeed === 'Instant') {
            // Se Istantaneo, mostra tutto subito senza timer
            this.completeTyping();
            return;
        }

        // Traduciamo le etichette in millisecondi (più basso è più veloce)
        if (settings.textSpeed === 'Slow') this.TYPING_SPEED = 80;
        else if (settings.textSpeed === 'Fast') this.TYPING_SPEED = 15;
        else this.TYPING_SPEED = 40; // 'Normal'

        this.typingTimer = this.uiScene.time.addEvent({
            delay: this.TYPING_SPEED,
            callback: this.typeNextChar,
            callbackScope: this,
            loop: true
        });
    }

    private typeNextChar() {
        this.currentVisibleText += this.currentFullText[this.currentVisibleText.length];
        this.dialogueText.setText(this.currentVisibleText);

        if (this.currentVisibleText.length === this.currentFullText.length) {
            this.completeTyping();
        }
    }

    private completeTyping() {
        // ... inalterato ...
        this.isTyping = false;
        if (this.typingTimer) {
            this.typingTimer.remove();
        }
        this.dialogueText.setText(this.currentFullText);
    }

    private autoSplitText(text: string, maxLength: number): string[] {
        // ... inalterato ...
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
        // ... inalterato ...
        if (this.isTyping) {
            this.completeTyping();
        } else {
            if (this.currentDialoguePage < this.dialoguePages.length - 1) {
                this.currentDialoguePage++;
                this.updateDialogueView();
            } else {
                if (this.keepOpen) {
                    this.isTalking = false;
                    this.promptText.setVisible(false);
                    
                    const callback = this.onCloseCallback;
                    this.onCloseCallback = undefined; 
                    if (callback) callback();
                } else {
                    this.hideDialogue();
                }
            }
        }
    }

    public hideDialogue() {
        // ... inalterato ...
        this.isTalking = false;
        this.isUnskippable = false;
        this.uiContainer.setVisible(false);

        this.synth.cancel();
        
        const callback = this.onCloseCallback;
        this.onCloseCallback = undefined; 
        
        if (callback) {
            callback();
        }
    }

    private interrupt() {
        if (this.typingTimer) {
            this.typingTimer.remove();
        }
        if (this.radioTimer) {
            this.radioTimer.remove();
        }

        this.synth.cancel();
        
        this.isTyping = false;
        this.isTalking = false;
        
        if (this.onCloseCallback) {
            this.onCloseCallback = undefined;
        }
    }

    public showRadioMessage(text: string, durationPerPage: number = 8000) {
        
        if (!this.uiContainer) {
            this.scene.time.delayedCall(10, () => this.showRadioMessage(text, durationPerPage));
            return;
        }
        
        this.interrupt(); 

        this.uiContainer.setVisible(true);
        this.dialogueName.setText("A.B.I.");
        this.promptText.setVisible(false); 
        this.promptText.setVisible(false); 

        const pages = this.autoSplitText(text, 180);
        let pageIndex = 0;

        const showNextPage = () => {
            if (pageIndex >= pages.length) {
                if (!this.isTalking) { 
                    this.uiContainer.setVisible(false);
                    this.synth.cancel();
                }
                return;
            }

            const pageText = pages[pageIndex];
            this.dialogueText.setText(pageText);
            this.speakText(pageText);

            pageIndex++;

            this.radioTimer = this.uiScene.time.delayedCall(durationPerPage, showNextPage);
        };

        showNextPage();
    }
}