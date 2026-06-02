import Phaser from 'phaser';

export default class Cutscene1 extends Phaser.Scene {
    private slides = [
        {
            imageKey: 'intro_img_1',
            text: "WARNING: Viral particles detected in the extracellular matrix. They are rapidly approaching the outer cell membrane."
        },
        {
            imageKey: 'intro_img_2',
            text: "To breach the cell, the virus uses its spike proteins like a key. It searches for specific surface receptors that perfectly match its shape to force its way inside."
        },
        {
            imageKey: 'intro_img_3',
            text: "Once attached, the virus will inject its genetic material, hijacking the cell. We cannot let that happen."
        },
        {
            // SLIDE 4 RITOCCATA: Rimosso "pilot" per non far pensare alla navicella
            imageKey: 'intro_img_4',
            text: "Your mission is to intercept the viral load. Control the defense platform and block the pathogens before they can make contact with the receptors."
        }
    ];
    
    private currentSlideIndex: number = 0;
    private bgImage!: Phaser.GameObjects.Image;
    private storyText!: Phaser.GameObjects.Text;
    private isTransitioning: boolean = false;

    constructor() {
        super('Cutscene1');
    }

    preload() {
        // Carica solo le immagini che servono a questa specifica cutscene
        this.load.image('intro_img_1', '/../assets/Cutscenes/Cutscene1_1.png');
        this.load.image('intro_img_2', '/../assets/Cutscenes/Cutscene1_2.png');
        this.load.image('intro_img_3', '/../assets/Cutscenes/Cutscene1_3.png');
        this.load.image('intro_img_4', '/../assets/Cutscenes/Cutscene1_4.png');
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);

        this.bgImage = this.add.image(width / 2, height / 2, this.slides[0].imageKey);
        this.bgImage.setDisplaySize(width, height);
        this.bgImage.setAlpha(0);

        const boxHeight = 250;
        const uiContainer = this.add.container(0, height - boxHeight);
        
        const textBoxBg = this.add.rectangle(0, 0, width, boxHeight, 0x000000, 0.85).setOrigin(0).setStrokeStyle(4, 0x4caf50);

        this.storyText = this.add.text(width / 2, boxHeight / 2 - 20, '', {
            fontSize: '32px', color: '#ffffff', align: 'center', wordWrap: { width: width - 200 }
        }).setOrigin(0.5);

        const promptText = this.add.text(width - 50, boxHeight - 40, 'Press SPACE or Click to continue ►', {
            fontSize: '20px', color: '#aaaaaa'
        }).setOrigin(1, 0.5);

        this.tweens.add({ targets: promptText, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

        uiContainer.add([textBoxBg, this.storyText, promptText]);

        this.input.on('pointerdown', this.advanceSlide, this);
        this.input.keyboard!.on('keydown-SPACE', this.advanceSlide, this);

        this.showCurrentSlide();
    }

    private showCurrentSlide() {
        if (this.currentSlideIndex >= this.slides.length) {
            this.finishCutscene();
            return;
        }

        const currentSlide = this.slides[this.currentSlideIndex];
        this.storyText.setText(currentSlide.text);

        this.isTransitioning = true;
        this.tweens.add({
            targets: this.bgImage,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.bgImage.setTexture(currentSlide.imageKey);
                this.bgImage.setDisplaySize(this.scale.width, this.scale.height);
                this.tweens.add({
                    targets: this.bgImage, alpha: 1, duration: 300, onComplete: () => { this.isTransitioning = false; }
                });
            }
        });
    }

    private advanceSlide() {
        if (this.isTransitioning) return;
        this.currentSlideIndex++;
        this.showCurrentSlide();
    }

    private finishCutscene() {
        this.isTransitioning = true;
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Chiude Cutscene1 e avvia Level1
            this.scene.start('Level1');
        });
    }
}