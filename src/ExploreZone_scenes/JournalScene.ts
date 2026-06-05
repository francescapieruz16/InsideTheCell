import Phaser from 'phaser';

export interface JournalItem {
    id: string;        
    name: string;      
    texture: string;   
}

export default class JournalScene extends Phaser.Scene {
    private parentSceneKey!: string;
    private itemsList: JournalItem[] = [];
    private unlockedItems: string[] = [];

    constructor() {
        super('JournalScene');
    }

    init(data: { parentScene: string, items: JournalItem[] }) {
        this.parentSceneKey = data.parentScene;
        this.itemsList = data.items || [];
    }

    create() {
        const { width, height } = this.scale;

        // Sfondo oscuro
        this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);

        // Caricamento salvataggi
        const savedData = localStorage.getItem('journalUnlocks');
        this.unlockedItems = savedData ? JSON.parse(savedData) : [];

        let discoveredCount = 0;
        this.itemsList.forEach(item => {
            if (this.unlockedItems.includes(item.id)) discoveredCount++;
        });

        // UI Titolo
        this.add.text(width / 2, 80, 'BioLog ', {
            fontSize: '48px', color: '#00ffff', fontStyle: 'bold', letterSpacing: 2
        }).setOrigin(0.5);

        this.add.text(width / 2, 140, `Discovered: ${discoveredCount} / ${this.itemsList.length}`, {
            fontSize: '28px', color: discoveredCount === this.itemsList.length ? '#4caf50' : '#ffffff'
        }).setOrigin(0.5);

        // Generazione Griglia
        const startX = width / 2 - 400;
        const startY = 300;
        const spacingX = 400;
        const spacingY = 180; 
        const cols = 3;

        this.itemsList.forEach((item, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = startX + (col * spacingX);
            const y = startY + (row * spacingY);

            this.createEntryCard(x, y, item);
        });

        const closeBtn = this.add.text(width - 60, 60, '✖ CLOSE', {
            fontSize: '24px', 
            color: '#aaaaaa', 
            backgroundColor: '#222222', 
            padding: { x: 15, y: 10 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }); // Origin (1,0) lo àncora all'angolo in alto a destra

        // Feedback visivo (hover) elegante e neutro
        closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ffffff', backgroundColor: '#444444' }));
        closeBtn.on('pointerout', () => closeBtn.setStyle({ color: '#aaaaaa', backgroundColor: '#222222' }));
        closeBtn.on('pointerdown', () => this.closeJournal());


        // --- BOTTONE RESET DATI (Centrato in basso, isolato) ---
        let confirmWipe = false;
        const wipeBtn = this.add.text(width / 2, height - 80, '[ ERASE DATA ]', {
            fontSize: '24px', color: '#ffaa00', backgroundColor: '#331100', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        wipeBtn.on('pointerdown', () => {
            if (!confirmWipe) {
                confirmWipe = true;
                wipeBtn.setText('[ ARE YOU SURE? ]');
                wipeBtn.setStyle({ color: '#ffffff', backgroundColor: '#ff0000' });
                
                this.time.delayedCall(3000, () => {
                    if (this.scene.isActive()) {
                        confirmWipe = false;
                        wipeBtn.setText('[ ERASE DATA ]');
                        wipeBtn.setStyle({ color: '#ffaa00', backgroundColor: '#331100' });
                    }
                });
            } else {
                localStorage.removeItem('journalUnlocks');
                this.scene.restart({ parentScene: this.parentSceneKey, items: this.itemsList });
            }
        });

        // Input da tastiera (inalterati)
        this.input.keyboard!.on('keydown-I', () => this.closeJournal());
        this.input.keyboard!.on('keydown-ESC', () => this.closeJournal());

        this.scene.bringToTop();
    }

    private createEntryCard(x: number, y: number, item: JournalItem) {
        const isUnlocked = this.unlockedItems.includes(item.id);

        const cardBg = this.add.rectangle(x, y, 350, 140, 0x111111, 0.8)
            .setStrokeStyle(2, isUnlocked ? 0x4caf50 : 0x333333);

        const icon = this.add.sprite(x - 90, y, item.texture);
        icon.setDisplaySize(100, 100);

        let nameText = "???";
        let titleColor = '#555555';

       if (isUnlocked) {
            nameText = item.name;
            titleColor = '#ffffff';
            icon.clearTint(); 
            icon.setAlpha(1);
        } else {
            // Usa un grigio medio (es. 0x555555 o 0x666666) per far risaltare la sagoma
            // contro lo sfondo scuro della carta
            icon.setTintFill(0x555555); 
            
            icon.setAlpha(0.9); 
        }

        this.add.text(x - 20, y, nameText, {
            fontSize: '28px', color: titleColor, fontStyle: 'bold',
            wordWrap: { width: 200 }
        }).setOrigin(0, 0.5); 
    }

    private closeJournal() {
        this.scene.resume(this.parentSceneKey);
        this.scene.stop();
    }


    // ==========================================
    // --- METODI STATICI GLOBALI DI SBLOCCO ---
    // ==========================================

    public static unlockItem(scene: Phaser.Scene, itemId: string, discoverables: JournalItem[]) {
        const savedData = localStorage.getItem('journalUnlocks');
        let unlockedItems: string[] = savedData ? JSON.parse(savedData) : [];

        if (!unlockedItems.includes(itemId)) {
            unlockedItems.push(itemId);
            localStorage.setItem('journalUnlocks', JSON.stringify(unlockedItems));
            
            const itemDef = discoverables.find(i => i.id === itemId);
            if (itemDef) {
                JournalScene.showUnlockNotification(scene, itemDef);
            }
        }
    }

    private static showUnlockNotification(scene: Phaser.Scene, item: JournalItem) {
        const { width, height } = scene.scale;

        // Usa 'scene.add' invece di 'this.add'
        const notifContainer = scene.add.container(width - 200, height + 100);
        notifContainer.setDepth(2000); 
        notifContainer.setScrollFactor(0); 

        const bgWidth = 320;
        const bgHeight = 80;
        const bg = scene.add.rectangle(0, 0, bgWidth, bgHeight, 0x112233, 0.95)
            .setStrokeStyle(2, 0x4caf50);

        const icon = scene.add.sprite(-110, 0, item.texture);
        icon.setDisplaySize(50, 50); 

        const titleText = scene.add.text(-70, -20, 'NEW DATA LOG', { 
            fontSize: '16px', color: '#4caf50', fontStyle: 'bold' 
        });

        const nameText = scene.add.text(-70, 0, item.name, { 
            fontSize: '20px', color: '#ffffff' 
        });

        notifContainer.add([bg, icon, titleText, nameText]);

        // Usa 'scene.tweens' e 'scene.time'
        scene.tweens.add({
            targets: notifContainer,
            y: height - 80, 
            duration: 600,
            ease: 'Back.easeOut', 
            onComplete: () => {
                scene.time.delayedCall(3500, () => {
                    scene.tweens.add({
                        targets: notifContainer,
                        y: height + 100,
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            notifContainer.destroy(); 
                        }
                    });
                });
            }
        });
    }
}