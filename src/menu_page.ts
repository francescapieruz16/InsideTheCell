import Phaser from 'phaser';

export class MenuPageScene extends Phaser.Scene {
    private uiElements: { dom: Phaser.GameObjects.DOMElement, offsetX: number, offsetY: number }[] = [];

    constructor() {
        super('MenuPageScene');
    }

    create() {
        this.game.canvas.style.pointerEvents = 'none';
        this.uiElements = [];

        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/backgroundlevelselection.png';
            bgHTML.style.objectFit = 'cover'; 
        }

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
            }

            .level-container {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                gap: 15px;
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

            .level-btn {
                background-color: #FF3E00;
                color: white;
                border: 3px solid white;
                padding: 15px 40px;
                font-size: 1.5rem;
                width: 250px;
            }

            .level-btn:hover {
                background-color: #FF5F1F;
                transform: scale(1.05);
            }

            .final-boss-btn {
                background-color: #3f5f95;
                color: white;
                border: 3px solid white;
                padding: 15px 40px;
                font-size: 1.5rem;
                box-shadow: 0 4px #3f5e95bb;
                width: 250px;
                display: inline-block;
            }

            .final-boss-btn:hover {
                background-color: #5276b8;
                transform: scale(1.05);
            }

            button:hover {
                background-color: rgba(255, 255, 255, 1);
                transform: scale(1.05);
            }

            .corner-btn {
                position: absolute;
            }

            .tutorial-btn {
                padding: 20px 40px;
                font-size: 1.6rem;
                background-color: #19c482e7;
                color: white;
                border: 3px solid white;
                box-shadow: 0 4px #1b5e20;
            }

            .tutorial-btn:hover {
                background-color: #3ce8a6;
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);

        const createHTMLButton = (text: string, className: string, offsetX: number, offsetY: number, onClick: () => void) => {
            const container = document.createElement('div');
            container.className = 'phaser-dom-container';
            
            const btn = document.createElement('button');
            btn.className = className;
            btn.innerText = text;
            container.appendChild(btn);
            
            const domElement = this.add.dom(cx + offsetX, cy + offsetY, container);
            
            btn.addEventListener('click', onClick);

            this.uiElements.push({ dom: domElement, offsetX, offsetY });
        };

        const levelSpacing = 80; 
        const startOffsetY = -(levelSpacing * 3); 

        for (let i = 1; i <= 6; i++) {
            const offsetY = startOffsetY + ((i - 1) * levelSpacing);

            createHTMLButton(`Level ${i}`, 'level-btn', 0, offsetY, () => {
                this.scene.start(`Cutscene${i}`);
            });
        }

        createHTMLButton('Tutorial Zone', 'tutorial-btn', 0, 0, () => {
            this.scene.start('ExternalScene'); 
        });

        createHTMLButton('OPTIONS', 'Options', 0, 0, () => {
            this.scene.start('OptionsScene'); 
        });

        createHTMLButton('BACK', 'Back', 0, 0, () => {
            this.scene.start('TitleScene'); 
        });

        const finalBossUnlocked = localStorage.getItem('FINAL_BOSS_UNLOCKED') || false;

        if (finalBossUnlocked) {
            createHTMLButton('FINAL BOSS', 'final-boss-btn', 0, startOffsetY + 6 * levelSpacing, () => {
                this.scene.start('CutsceneFinalBoss'); 
            });
        }

        const updatePositions = (width: number, height: number) => {
            const newCx = width / 2;
            const newCy = height / 2;

            this.uiElements.forEach(item => {
                const btnText = (item.dom.node.firstChild as HTMLElement).innerText;

                if (btnText === 'BACK') {
                    item.dom.setPosition(80, 40); 
                }   
                else if (btnText === 'OPTIONS') {
                    item.dom.setPosition(width - 100, 40); 
                } 
                else if (btnText === 'Tutorial Zone') {
                    item.dom.setPosition(160, height - 80); 
                }
                else {
                    item.dom.setPosition(newCx + item.offsetX, newCy + item.offsetY);
                }
            });
        };

        updatePositions(this.cameras.main.width, this.cameras.main.height);

        const onResize = (gameSize: Phaser.Structs.Size) => {
            updatePositions(gameSize.width, gameSize.height);
        };

        this.scale.on('resize', onResize);

        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
        });

        const inputMode = this.registry.get('inputMode') || localStorage.getItem('inputMode');

        if (inputMode === 'hand') {
            if (!this.scene.isActive('HandCursorScene')) {
                this.scene.launch('HandCursorScene');
                this.scene.bringToTop('HandCursorScene');
            }
        }
    }
}