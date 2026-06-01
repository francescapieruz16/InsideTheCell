import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    preload() {
        const backgroundsHTML = [
            '/assets/background.png',
            '/assets/backgroundlevelselection.png',
            '/assets/level1/background_level1.png',
            '/assets/level2/background_level_2.png',
            '/assets/level3/background_level_3.png',
            '/assets/level4/background_level_4.png',
            '/assets/level5/background_level_5.png',
            '/assets/level6/background_level_6.png',
        ];

        backgroundsHTML.forEach(url => {
            const img = new Image();
            img.src = url; 
        });
    }

    create() {
        this.game.canvas.style.pointerEvents = 'none';

        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/background.png'; 
        }

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
            }

            #playBtn {
                padding: 15px 40px;
                font-size: 60px;
                font-weight: bold;
                color: white;
                background-color: #FF3E00;
                border: 5px solid white;
                box-shadow: 
                    0 0 5px #FF5F1F, 
                    0 0 20px #FF5F1F, 
                    inset 0 0 10px #FF5F1F;
                border-radius: 50px;
                cursor: pointer;
                transition: all 0.3s ease;
                backface-visibility: hidden;
                -webkit-font-smoothing: subpixel-antialiased;
                will-change: transform;
                display: inline-block;
            }
            
            #playBtn:hover {
                box-shadow:
                    0 0 5px #FF5F1F, 
                    0 0 20px #FF5F1F, 
                    inset 0 0 10px #FF5F1F;
                transform: scale(1.05);
            }
            
            #playBtn:active {
                box-shadow: 
                    0 0 5px #FF5F1F, 
                    0 0 20px #FF5F1F, 
                    inset 0 0 10px #FF5F1F;
                transform: translateY(2px);
            }

            .settings-btn {
                background-color: #3d5381;
                border: 2px solid #ffffff;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                transition: transform 0.2s, background-color 0.2s;
                text-decoration: none;
            }
            
            .settings-btn:hover {
                background-color: #4a659e;
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);

        const playContainer = document.createElement('div')
        const settingsContainer = document.createElement('div');

        const playBtnElement = document.createElement('button');
        playBtnElement.id = 'playBtn';
        playBtnElement.innerText = 'Play';
        playContainer.appendChild(playBtnElement);

        const adminBtnElement = document.createElement('button');
        adminBtnElement.className = 'settings-btn';
        adminBtnElement.innerText = '⚙️';
        adminBtnElement.title = 'Admin Dashboard';
        settingsContainer.appendChild(adminBtnElement);

        const playDom = this.add.dom(0, 0, playContainer);
        const settingsDom = this.add.dom(0, 0, settingsContainer);

        const updatePositions = (width: number, height: number) => {
          playDom.setPosition(width / 2, height - 200);
          settingsDom.setPosition(width - 60, 50)
        }
        
        updatePositions(this.cameras.main.width, this.cameras.main.height);

        playBtnElement.addEventListener('click', () => {
            this.scene.start('MenuPageScene'); 
        });

        adminBtnElement.addEventListener('click', () => {
            window.location.href = '/pages/admin_dashboard.html';
        });

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
          updatePositions(gameSize.width, gameSize.height);
        }); 
    }
}