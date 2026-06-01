import Phaser from 'phaser';

export interface GameSettings {
    textSpeed: string; 
    masterVol: number; 
    voiceVol: number;  
    sfxVol: number;    
    musicVol: number;  
    previousVoiceVol: number; // Memoria per il tasto Mute
}

export default class SettingsScene extends Phaser.Scene {
    private parentSceneKey: string | null = null;
    private settings!: GameSettings;

    constructor() {
        super('SettingsScene');
    }

    init(data: any) {
        this.parentSceneKey = data.parentScene || null;
    }

    create() {
        this.scene.bringToTop();
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.95).setOrigin(0);

        this.add.text(width / 2, 80, 'SYSTEM SETTINGS', {
            fontSize: '46px',
            color: '#00ffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 15, fill: true }
        }).setOrigin(0.5);

        // --- CARICAMENTO IMPOSTAZIONI ---
        this.loadSettings();

        // --- GENERATORE DI STEPPER E TOGGLE ( UI ) ---
        let startY = 200;
        const spacingY = 75;
        
        const speedOptions = ['Slow', 'Normal', 'Fast', 'Instant'];
        this.createStepper(width / 2, startY, 'Text Speed', speedOptions, 
            () => this.settings.textSpeed, 
            (val) => { this.settings.textSpeed = val; this.saveSettings(); }
        );

        this.createVolumeStepper(width / 2, startY + spacingY, 'Master Volume', 
            () => this.settings.masterVol, 
            (val) => { this.settings.masterVol = val; this.saveSettings(); }
        );

        this.createVolumeStepper(width / 2, startY + (spacingY * 2), 'A.B.I. Voice Vol', 
            () => this.settings.voiceVol, 
            (val) => { 
                this.settings.voiceVol = val; 
                // Se modifico manualmente il volume a > 0, aggiorno la memoria del mute
                if (val > 0) this.settings.previousVoiceVol = val;
                this.saveSettings(); 
                
                // Se tocco lo stepper e arriva a 0 o sale da 0, ricarico per aggiornare il tasto Mute
                if (val === 0 || (val === 10 && this.settings.voiceVol > 0)) {
                    this.scene.restart({ parentScene: this.parentSceneKey });
                }
            }
        );

        //Toggle per il Mute di ABI
        this.createMuteToggle(width / 2, startY + (spacingY * 3));

        this.createVolumeStepper(width / 2, startY + (spacingY * 4), 'SFX Volume', 
            () => this.settings.sfxVol, 
            (val) => { this.settings.sfxVol = val; this.saveSettings(); }
        );

        this.createVolumeStepper(width / 2, startY + (spacingY * 5), 'Music Volume', 
            () => this.settings.musicVol, 
            (val) => { this.settings.musicVol = val; this.saveSettings(); }
        );

        // --- NUOVO TASTO SAVE & EXIT (Centrale) ---
        const saveBtnY = startY + (spacingY * 6.2); // Posizionato sotto i settings
        
        const saveBtn = this.add.text(width / 2, saveBtnY, '💾 SAVE & CLOSE', {
            fontSize: '28px', 
            color: '#000000', 
            backgroundColor: '#4caf50', 
            padding: { x: 40, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Effetto hover sul tasto Save
        saveBtn.on('pointerover', () => saveBtn.setStyle({ backgroundColor: '#81c784', color: '#ffffff' }));
        saveBtn.on('pointerout', () => saveBtn.setStyle({ backgroundColor: '#4caf50', color: '#000000' }));
        
        // Al click, esce dalla schermata (i dati sono già salvati dinamicamente)
        saveBtn.on('pointerdown', () => {
            if (this.parentSceneKey) {
                this.scene.start('PauseMenuScene', { parentScene: this.parentSceneKey });
            } else {
                window.location.href = '/menu_page.html';
            }
        });


        // --- BOTTONI DI GESTIONE DATI (Spostati più in basso) ---
        const dataBtnY = startY + (spacingY * 7.8); // Più in basso per fare spazio al Save

        // Bottone Reset Impostazioni (Default)
        const defaultBtn = this.add.text(width / 2 - 200, dataBtnY, '↻ DEFAULT SETTINGS', {
            fontSize: '24px', color: '#000000', backgroundColor: '#00ffff', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        defaultBtn.on('pointerover', () => defaultBtn.setStyle({ backgroundColor: '#ffffff' }));
        defaultBtn.on('pointerout', () => defaultBtn.setStyle({ backgroundColor: '#00ffff' }));
        defaultBtn.on('pointerdown', () => {
            this.resetSettingsToDefault();
        });

        // Bottone Reset Progressi
        const resetBtn = this.add.text(width / 2 + 200, dataBtnY, '⚠ RESET PROGRESS', {
            fontSize: '24px', color: '#ff5555', backgroundColor: '#331111', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const warningPopup = this.createWarningPopup(width, height);

        resetBtn.on('pointerover', () => resetBtn.setStyle({ color: '#ffffff', backgroundColor: '#ff0000' }));
        resetBtn.on('pointerout', () => resetBtn.setStyle({ color: '#ff5555', backgroundColor: '#331111' }));
        resetBtn.on('pointerdown', () => warningPopup.setVisible(true));

    
    }

    // =========================================================
    // --- METODI LOGICI ---
    // =========================================================

    private loadSettings() {
        const saved = localStorage.getItem('gameSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
            // Retrocompatibilità: se il vecchio salvataggio non aveva previousVoiceVol, lo aggiungiamo
            if (this.settings.previousVoiceVol === undefined) {
                this.settings.previousVoiceVol = 100;
            }
        } else {
            this.applyDefaultSettings();
        }
    }

    private saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(this.settings));
    }

    private applyDefaultSettings() {
        this.settings = {
            textSpeed: 'Normal',
            masterVol: 100,
            voiceVol: 100,
            previousVoiceVol: 100,
            sfxVol: 100,
            musicVol: 100
        };
    }

    private resetSettingsToDefault() {
        this.applyDefaultSettings();
        this.saveSettings();
        // Riavvia la scena per ridisegnare tutti i testi e gli stepper con i valori di default
        this.scene.restart({ parentScene: this.parentSceneKey });
    }

    // =========================================================
    // --- COSTRUTTORI UI ---
    // =========================================================

    private createMuteToggle(x: number, y: number) {
        this.add.text(x - 250, y, 'Mute A.B.I.', { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0, 0.5);

        const isMuted = this.settings.voiceVol === 0;
        
        // Checkbox visiva
        const boxColor = isMuted ? 0xff5555 : 0x333333;
        const box = this.add.rectangle(x + 150, y, 40, 40, boxColor).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        
        const checkMark = this.add.text(x + 150, y, isMuted ? 'X' : '', { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        box.on('pointerdown', () => {
            if (isMuted) {
                // Togli il muto: ripristina il volume precedente (o 100 se era 0)
                this.settings.voiceVol = this.settings.previousVoiceVol > 0 ? this.settings.previousVoiceVol : 100;
            } else {
                // Metti il muto: salva il volume attuale e porta a 0
                this.settings.previousVoiceVol = this.settings.voiceVol;
                this.settings.voiceVol = 0;
            }
            this.saveSettings();
            // Riavvia la scena per sincronizzare lo stepper del Voice Vol con la casella del Mute
            this.scene.restart({ parentScene: this.parentSceneKey });
        });
    }

    private createStepper(x: number, y: number, label: string, options: string[], getVal: () => string, setVal: (val: string) => void) {
        this.add.text(x - 250, y, label, { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0, 0.5);

        let currentIndex = options.indexOf(getVal());
        const valueText = this.add.text(x + 150, y, options[currentIndex], { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

        const leftBtn = this.add.text(x + 50, y, '<', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const rightBtn = this.add.text(x + 250, y, '>', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const updateDisplay = () => {
            valueText.setText(options[currentIndex]);
            setVal(options[currentIndex]);
        };

        leftBtn.on('pointerdown', () => {
            currentIndex = (currentIndex - 1 + options.length) % options.length;
            updateDisplay();
        });

        rightBtn.on('pointerdown', () => {
            currentIndex = (currentIndex + 1) % options.length;
            updateDisplay();
        });
    }

    private createVolumeStepper(x: number, y: number, label: string, getVal: () => number, setVal: (val: number) => void) {
        this.add.text(x - 250, y, label, { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0, 0.5);

        let currentVol = getVal();
        const valueText = this.add.text(x + 150, y, `${currentVol}%`, { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

        const leftBtn = this.add.text(x + 50, y, '<', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const rightBtn = this.add.text(x + 250, y, '>', { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const updateDisplay = () => {
            valueText.setText(`${currentVol}%`);
            setVal(currentVol);
        };

        leftBtn.on('pointerdown', () => {
            if (currentVol > 0) currentVol -= 10;
            updateDisplay();
        });

        rightBtn.on('pointerdown', () => {
            if (currentVol < 100) currentVol += 10;
            updateDisplay();
        });
    }

    private createWarningPopup(width: number, height: number): Phaser.GameObjects.Container {
        const popupContainer = this.add.container(width / 2, height / 2);
        popupContainer.setDepth(100);
        popupContainer.setVisible(false); 

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setInteractive(); 
        const box = this.add.rectangle(0, 0, 500, 300, 0x220000).setStrokeStyle(4, 0xff0000);
        
        const title = this.add.text(0, -80, 'WARNING', { fontSize: '36px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
        const msg = this.add.text(0, -10, 'This will permanently delete all\nyour unlocked levels. Are you sure?', { fontSize: '20px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

        const yesBtn = this.add.text(-100, 80, 'YES, DELETE', { fontSize: '22px', color: '#000000', backgroundColor: '#ff5555', padding: { x: 15, y: 10 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
            
        yesBtn.on('pointerdown', () => {
            localStorage.removeItem('maxUnlockedLevel');
            popupContainer.setVisible(false);
            msg.setText('Progress erased.');
            setTimeout(() => msg.setText('This will permanently delete all\nyour unlocked levels. Are you sure?'), 2000);
        });

        const noBtn = this.add.text(100, 80, 'CANCEL', { fontSize: '22px', color: '#ffffff', backgroundColor: '#444444', padding: { x: 15, y: 10 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
            
        noBtn.on('pointerdown', () => {
            popupContainer.setVisible(false);
        });

        popupContainer.add([overlay, box, title, msg, yesBtn, noBtn]);
        return popupContainer;
    }
}