import Phaser from 'phaser';
import { HandTrackingController } from '../src/handTracking/handTrackingController'; 

export class OptionsScene extends Phaser.Scene {
    private isCalibrating: boolean = false;
    private webcamTexture!: Phaser.Textures.CanvasTexture;
    private webcamSprite!: Phaser.GameObjects.Sprite;
    
    private targetSilhouetteSprite!: Phaser.GameObjects.Image;
    private calibrationText!: Phaser.GameObjects.Text;
    
    private calibrationTimer: number = 0;
    private readonly REQUIRED_CALIBRATION_TIME: number = 3000; 

    private uiElements: { dom: Phaser.GameObjects.DOMElement, offsetX: number, offsetY: number }[] = [];

    constructor() {
        super('OptionsScene');
    }

    preload() {
        this.load.image('cursor_open', '/assets/cursor_open.png');
        this.load.image('cursor_pinch', '/assets/cursor_pinch.png');
        this.load.image('calibration_hand', '/assets/cursor_open.png');
    }

    create() {
        this.game.canvas.style.pointerEvents = 'none';
        this.isCalibrating = false;
        this.calibrationTimer = 0;

        this.uiElements = [];

        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/backgroundlevelselection.png';
        }

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
            }

            .title-box {
                background-color: #3f5f95;
                color: white;
                border: 3px solid white;
                border-radius: 0px;
                cursor: default;
                padding: 30px 40px;
                font-size: 2rem;
                width: 450px;
            }

            .title-box:hover {
                background-color: #3f5f95;
                transform: scale(1);
            }

            .orange-btn {
                background-color: #FF3E00;
                color: white;
                border: 3px solid white;
                padding: 15px 40px;
                font-size: 1.5rem;
                width: 250px;
            }

            .orange-btn:hover {
                background-color: #FF5F1F;
                transform: scale(1.05);
            }

            .loader {
                border: 8px solid rgb(252, 252, 252);
                border-top: 8px solid #FF3E00;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                animation: spin 1s linear infinite;
                display: none;
            }

            button {
                padding: 12px 24px;
                font-size: 1.2rem;
                font-weight: bold;
                cursor: pointer;
                border: 2px solid #333;
                border-radius: 8px;
                background-color: rgba(255, 255, 255, 0.8);
                transition: background-color 0.2s, transform 0.1s;
            }

            button:hover {
                background-color: rgba(255, 255, 255, 1);
                transform: scale(1.05);
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        const createUIElement = (htmlElement: HTMLElement, offsetX: number, offsetY: number) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'phaser-dom-container';
            wrapper.appendChild(htmlElement);
            
            const domElement = this.add.dom(cx + offsetX, cy + offsetY, wrapper);
            this.uiElements.push({ dom: domElement, offsetX, offsetY });
        };

        const titleBox = document.createElement('button');
        titleBox.className = 'title-box';
        titleBox.innerText = 'Choose input method';
        createUIElement(titleBox, 0, -180);

        const btnKeyboard = document.createElement('button');
        btnKeyboard.className = 'orange-btn';
        btnKeyboard.innerText = 'MOUSE & KEYBOARD';
        createUIElement(btnKeyboard, -220, 50);

        const btnHand = document.createElement('button');
        btnHand.className = 'orange-btn';
        btnHand.innerText = 'HAND TRACKING';
        createUIElement(btnHand, 220, 50);

        const spinner = document.createElement('div');
        spinner.className = 'loader';
        spinner.id = 'loading-spinner';
        createUIElement(spinner, 0, 0);

        const backBtn = document.createElement('button');
        backBtn.className = 'Back';
        backBtn.innerText = 'BACK';
        createUIElement(backBtn, 0, 0); 

        btnKeyboard.addEventListener('click', () => {
            this.setModeAndContinue('keyboard');
        });

        btnHand.addEventListener('click', () => {
            spinner.style.display = 'block';
            this.startHandCalibrationPhase();
        });

        backBtn.addEventListener('click', () => {
            this.isCalibrating = false;

            if(this.registry.get('inputMode') !== 'hand') {
                const tracker = HandTrackingController.getInstance();
                tracker.onReady = () => {};
                tracker.stop(); 
            }

            const spinner = document.getElementById('loading-spinner');
            if (spinner) spinner.style.display = 'none';

            this.scene.start('MenuPageScene');
        });

        this.game.events.on('hand_click', (pos: {x: number, y: number}) => {
            if (this.isCalibrating) return; 

            const handRect = btnHand.getBoundingClientRect();
            const keyRect = btnKeyboard.getBoundingClientRect();

            if (pos.x >= handRect.left && pos.x <= handRect.right && pos.y >= handRect.top && pos.y <= handRect.bottom) {
                spinner.style.display = 'block';
                this.startHandCalibrationPhase();
            } 
            else if (pos.x >= keyRect.left && pos.x <= keyRect.right && pos.y >= keyRect.top && pos.y <= keyRect.bottom) {
                this.setModeAndContinue('keyboard');
            }
        }, this);

        const updatePositions = (width: number, height: number) => {
            const newCx = width / 2;
            const newCy = height / 2;

            this.uiElements.forEach(item => {
                if (!item.dom || !item.dom.node) return;

                const child = item.dom.node.firstChild as HTMLElement;
                
                if (child && child.innerText === 'BACK') {
                    item.dom.setPosition(80, 40); 
                } 
                else {
                    item.dom.setPosition(newCx + item.offsetX, newCy + item.offsetY);
                }
            });

            if (this.isCalibrating) {
                const scaleFactor = Math.min(1, height / 900);

                if (this.webcamSprite && this.webcamSprite.active) {
                    this.webcamSprite.setPosition(newCx, newCy);
                    const baseScaleX = 640 / this.webcamSprite.width;
                    const baseScaleY = 480 / this.webcamSprite.height;
                    this.webcamSprite.setScale(-(baseScaleX * scaleFactor), (baseScaleY * scaleFactor));
                }

                if (this.targetSilhouetteSprite && this.targetSilhouetteSprite.active) {
                    this.targetSilhouetteSprite.setPosition(newCx, newCy);
                    const silhouetteBaseScale = 300 / this.targetSilhouetteSprite.width;
                    this.targetSilhouetteSprite.setScale(silhouetteBaseScale * scaleFactor);
                }

                if (this.calibrationText && this.calibrationText.active) {
                    this.calibrationText.setPosition(newCx, newCy - (280 * scaleFactor));
                    this.calibrationText.setScale(scaleFactor);
                }
            }
        };

        updatePositions(this.cameras.main.width, this.cameras.main.height);

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            updatePositions(gameSize.width, gameSize.height);
        }); 
    }

    private hideButtonsHTML() {
        this.uiElements.forEach(item => {
            const child = item.dom.node.firstChild as HTMLElement;
            if (child && child.id !== 'loading-spinner') {
                child.style.display = 'none';
            }
        });
    }

    private startHandCalibrationPhase() {
        this.hideButtonsHTML();

        if (this.scene.isActive('HandCursorScene')) {
            this.scene.stop('HandCursorScene');
        }

        const tracker = HandTrackingController.getInstance();
        tracker.onReady = () => {
            const spinner = document.getElementById('loading-spinner');
            if (spinner) spinner.style.display = 'none';
            
            this.setupCalibrationUI();
        };
        tracker.initialize();
    }

    private setupCalibrationUI() {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        if (this.textures.exists('webcamSrc')) {
            this.webcamTexture = this.textures.get('webcamSrc') as Phaser.Textures.CanvasTexture;
        } else {
            this.webcamTexture = this.textures.createCanvas('webcamSrc', 640, 480)!;
        }
        
        this.webcamSprite = this.add.sprite(cx, cy, 'webcamSrc');
        this.webcamSprite.setDisplaySize(640, 480);
        this.webcamSprite.setScale(-this.webcamSprite.scaleX, this.webcamSprite.scaleY); 

        this.targetSilhouetteSprite = this.add.image(cx, cy, 'calibration_hand').setOrigin(0.5);
        this.targetSilhouetteSprite.setDisplaySize(300, 300); 
        this.targetSilhouetteSprite.setAlpha(0.4); 
        this.targetSilhouetteSprite.setTint(0xffffff); 

        this.calibrationText = this.add.text(cx, cy - 280, 'Center your hand in the outline', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#3d5381',
            padding: { x: 15, y: 10 }
        }).setOrigin(0.5);

        this.isCalibrating = true;

        this.uiElements.forEach(item => {
            const child = item.dom.node.firstChild as HTMLElement;
            if (child && child.innerText === 'BACK') {
                child.style.display = 'inline-block';
            }
        });
    }

    update(time: number, delta: number) {
        if (!this.isCalibrating) return;

        const tracker = HandTrackingController.getInstance();
        const video = tracker.getVideoElement();

        if (video && this.webcamTexture) {
            this.webcamTexture.context.drawImage(video, 0, 0, 640, 480);
            this.webcamTexture.refresh();
        }

        if (tracker.rawX !== -1) {
            const isCenteredX = tracker.rawX >= 0.35 && tracker.rawX <= 0.65;
            const isCenteredY = tracker.rawY >= 0.60 && tracker.rawY <= 1;

            if (isCenteredX && isCenteredY) {
                this.calibrationTimer += delta;
                
                this.targetSilhouetteSprite.setTint(0x00ff00);
                this.calibrationText.setText(`Hold still... ${Math.max(0, Math.ceil((this.REQUIRED_CALIBRATION_TIME - this.calibrationTimer) / 1000))}s`);

                if (this.calibrationTimer >= this.REQUIRED_CALIBRATION_TIME) {
                    this.isCalibrating = false;
                    this.completeCalibration();
                }
            } else {
                this.calibrationTimer = 0;
                this.targetSilhouetteSprite.setTint(0xffffff);
                this.calibrationText.setText('Center your hand in the outline');
            }
        } else {
            this.calibrationTimer = 0;
            this.targetSilhouetteSprite.setTint(0xffffff);
            this.calibrationText.setText('Show your hand to the camera');
        }
    }

    private completeCalibration() {
        this.webcamSprite.destroy();
        this.targetSilhouetteSprite.destroy();
        this.calibrationText.destroy();

        this.scene.launch('HandCursorScene');
        this.scene.bringToTop('HandCursorScene');

        this.time.delayedCall(500, () => {
            this.setModeAndContinue('hand');
        });
    }

    private setModeAndContinue(mode: 'keyboard' | 'hand') {
        this.game.events.off('hand_click'); 

        if (mode === 'keyboard') {
            const tracker = HandTrackingController.getInstance();
            tracker.onReady = () => {};
            
            if (typeof (tracker as any).stop === 'function') {
                (tracker as any).stop();
            }
            
            if (this.scene.isActive('HandCursorScene')) {
                this.scene.stop('HandCursorScene');
            }
        }

        this.registry.set('inputMode', mode);
        this.scene.start('MenuPageScene');
    }
}