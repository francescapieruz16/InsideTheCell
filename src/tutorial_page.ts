import Phaser from 'phaser';

import PauseMenuScene from './ExploreZone_scenes/PauseMenuScene';
import Scene0_Control from './ExploreZone_scenes/Scene0_Control';
import Scene1_External from './ExploreZone_scenes/Scene1_External';
import Scene3_Internal from './ExploreZone_scenes/Scene3_Internal'; 
import Scene2_Membrane from './ExploreZone_scenes/Scene2_Membrane';
import LevelSelectScene from './ExploreZone_scenes/LevelSelectionScene';
import SettingsScene from './ExploreZone_scenes/SettingsScene';




// --- CONFIGURAZIONE E AVVIO ---
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    // --- NUOVA CONFIGURAZIONE DELLO SCHERMO ---
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080,
    },
    parent: 'game-container',
    // ------------------------------------------
    physics: {
        default: 'arcade',
        arcade: {
            debug: true // (o true se stai ancora testando le hitbox!)
        }
    },
    scene: [LevelSelectScene, Scene1_External, Scene2_Membrane, Scene0_Control, PauseMenuScene, Scene3_Internal, SettingsScene]
};

const game = new Phaser.Game(config);