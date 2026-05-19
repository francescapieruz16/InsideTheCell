import Phaser from 'phaser';

import PauseMenuScene from './ExploreZone_scenes/PauseMenuScene';
import Scene0_Control from './ExploreZone_scenes/Scene0_Control';
import Scene1_External from './ExploreZone_scenes/Scene1_External';
import Scene3_Internal from './ExploreZone_scenes/Scene3_Internal'; 
import Scene2_Membrane from './ExploreZone_scenes/Scene2_Membrane';




// --- CONFIGURAZIONE E AVVIO ---
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    // --- NUOVA CONFIGURAZIONE DELLO SCHERMO ---
    scale: {
        mode: Phaser.Scale.RESIZE, // Adatta il gioco alla finestra
        parent: 'game-container', // Assicurati di avere un div con questo ID nel tuo file HTML (se usi un container)
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // ------------------------------------------
    physics: {
        default: 'arcade',
        arcade: {
            debug: false // (o true se stai ancora testando le hitbox!)
        }
    },
    scene: [Scene1_External, Scene2_Membrane, Scene0_Control, PauseMenuScene, Scene3_Internal]
};

const game = new Phaser.Game(config);