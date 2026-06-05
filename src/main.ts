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
import PauseMenuScene from './ExploreZone_scenes/PauseMenuScene';
import ControlsScene from './ExploreZone_scenes/Scene0_Control';
import ExternalScene from './ExploreZone_scenes/Scene1_External';
import Scene2_Membrane from './ExploreZone_scenes/Scene2_Membrane';
import Scene3_Internal from './ExploreZone_scenes/Scene3_Internal';
import SettingsScene from './ExploreZone_scenes/SettingsScene';
import LevelSelectScene from './ExploreZone_scenes/LevelSelectionScene';
import Cutscene1 from './Cutscenes/Cutscene1';
import Cutscene2 from './Cutscenes/Cutscene2';
import Cutscene3 from './Cutscenes/Cutscene3';
import Cutscene4 from './Cutscenes/Cutscene4';
import Cutscene5 from './Cutscenes/Cutscene5';
import Cutscene6 from './Cutscenes/Cutscene6';
import CutsceneFinalBoss from './Cutscenes/CutsceneFinalBoss';

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
    scene: [
        TitleScene, OptionsScene, MenuPageScene, HandCursorScene, 
        Cutscene1, Cutscene2, Cutscene3, Cutscene4, Cutscene5, Cutscene6, CutsceneFinalBoss,  
        Level1, Level2, Level3, Level4, Level5, Level6, FinalBoss, 
        ExternalScene, Scene2_Membrane, Scene3_Internal, PauseMenuScene, ControlsScene, SettingsScene, LevelSelectScene] 
};

new Phaser.Game(config);