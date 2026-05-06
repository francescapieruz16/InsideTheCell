import Phaser from 'phaser';

export default class ABI {
    private scene: Phaser.Scene;
    private uiContainer!: Phaser.GameObjects.Container;
    private dialogueText!: Phaser.GameObjects.Text;
    private dialogueName!: Phaser.GameObjects.Text;
    private portrait!: Phaser.GameObjects.Image;
    private dialoguePages: string[] = [];
    private currentDialoguePage: number = 0;
    
    public isTalking: boolean = false;
    
    // Questa variabile salverà l'azione speciale da fare a fine dialogo (es. cambiare scena)
    private onCloseCallback?: () => void; 

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createDialogueUI();
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

        const promptText = this.scene.add.text(480, 70, "Press SPACE ▼", { 
            fontSize: '18px', color: '#aaaaaa' 
        }).setOrigin(1, 0.5);

        this.uiContainer.add([bg, this.portrait, this.dialogueName, this.dialogueText, promptText]);
        this.uiContainer.setVisible(false);

        this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            if (this.uiContainer) {
                // Ricalcola il centro esatto e il fondo dello schermo ad ogni ridimensionamento
                this.uiContainer.setPosition(gameSize.width / 2, gameSize.height - 120);
            }
        });
    }

    // Nota l'aggiunta di "onClose": è una funzione opzionale!
    public showDialogue(name: string, text: string | string[], onClose?: () => void) {
        this.isTalking = true;
        this.dialogueName.setText(name);
        this.onCloseCallback = onClose; // Salviamo l'azione da fare alla fine

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
        this.dialogueText.setText(this.dialoguePages[this.currentDialoguePage]);
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
        if (this.currentDialoguePage < this.dialoguePages.length - 1) {
            this.currentDialoguePage++;
            this.updateDialogueView();
        } else {
            this.hideDialogue();
        }
    }

    public hideDialogue() {
        this.isTalking = false;
        this.uiContainer.setVisible(false);
        
        const callback = this.onCloseCallback;
        this.onCloseCallback = undefined; 
        
        if (callback) {
            callback();
        }
    }
}