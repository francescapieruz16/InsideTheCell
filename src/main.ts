import Phaser from 'phaser';
import { TitleScene } from './title_page'
import { OptionsScene } from './options';
import { MenuPageScene } from './menu_page';
import { HandCursorScene } from './handTracking/handCursorScene';
import { Level1 } from './level1_page';
import { Level2 } from './level2_page';
import { Level3 } from './level3_page';
import { Level4 } from './level4_page';
import { Level5 } from './level5_page';
import { Level6 } from './level6_page';
import { FinalBoss } from './final_boss_page';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight,
    },
    parent: 'app',
    dom: {
        createContainer: true
    },
    transparent: true,
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [TitleScene, OptionsScene, MenuPageScene, HandCursorScene, Level1, Level2, Level3, Level4, Level5, Level6] 
};

new Phaser.Game(config);