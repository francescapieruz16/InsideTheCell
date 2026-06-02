import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';

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
    private readonly TYPING_SPEED: number = 40; 

    private radioTimer?: Phaser.Time.TimerEvent; 

    private keepOpen: boolean = false;      
    private offsetY: number = -160;

    private previousPinchState: boolean = false;    

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        
        if (!this.scene.scene.get('ABIScene')) {
            this.scene.scene.add('ABIScene', ABIScene, true);
        }
        
        this.uiScene = this.scene.scene.get('ABIScene');
        
        this.scene.scene.bringToTop('ABIScene');

        this.createDialogueUI();

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

    private initVoice() {
        const voices = this.synth.getVoices();
        this.robotVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices[0] || null;  
    }

    private speakText(text: string) {
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB'; 
        if (this.robotVoice) {
            utterance.voice = this.robotVoice;
        }

        utterance.pitch = 1.5; 
        utterance.rate = 1.5;  
        
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
        this.uiContainer.setDepth(100);

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
        this.isTyping = false;
        if (this.typingTimer) {
            this.typingTimer.remove();
        }
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
        this.interrupt(); 

        this.uiContainer.setVisible(true);
        this.dialogueName.setText("A.B.I.");
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