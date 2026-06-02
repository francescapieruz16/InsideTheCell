import Phaser from 'phaser';
import { HandTrackingController } from '../handTracking/handTrackingController';

export class HandCursorScene extends Phaser.Scene {
    private cursorDiv: HTMLDivElement | null = null;
    private wasClicked: boolean = false;
    
    private currentX: number = 0;
    private currentY: number = 0;
    private isTracking: boolean = false;

    constructor() {
        super({ key: 'HandCursorScene', active: false });
    }

    preload() {
        this.load.image('cursor_open', '/assets/cursor_open.png');
        this.load.image('cursor_pinch', '/assets/cursor_pinch.png');
    }

    create() {
        if (!document.getElementById('html-hand-cursor')) {
            this.cursorDiv = document.createElement('div');
            this.cursorDiv.id = 'html-hand-cursor';
            
            Object.assign(this.cursorDiv.style, {
                position: 'fixed',
                top: '0px',
                left: '0px',
                width: '64px',
                height: '64px',
                backgroundImage: 'url(/assets/cursor_open.png)',
                backgroundSize: 'contain', 
                backgroundRepeat: 'no-repeat',
                
                pointerEvents: 'none', 
                
                zIndex: '999999',
                transform: 'translate(-50%, -50%)',
                display: 'none',
                willChange: 'transform'
            });

            document.body.appendChild(this.cursorDiv);
        } else {
            this.cursorDiv = document.getElementById('html-hand-cursor') as HTMLDivElement;
        }

        this.isTracking = false;

        this.events.once('shutdown', () => {
            if (this.cursorDiv && this.cursorDiv.parentNode) {
                this.cursorDiv.parentNode.removeChild(this.cursorDiv);
                this.cursorDiv = null;
            }
        });
    }

    update() {
        const tracker = HandTrackingController.getInstance();

        if (!this.cursorDiv) return;


        if (this.registry.get('hideGlobalCursor')) {
            this.cursorDiv.style.display = 'none';
            this.isTracking = false;
            return;
        }

        if (tracker.targetX !== -1) {
            this.cursorDiv.style.display = 'block';
            
            const screenX = tracker.targetX * window.innerWidth;
            const screenY = tracker.targetY * window.innerHeight;
            
            if (!this.isTracking) {
                this.currentX = screenX;
                this.currentY = screenY;
                this.isTracking = true;
            }

            this.currentX += (screenX - this.currentX) * 0.3;
            this.currentY += (screenY - this.currentY) * 0.3;

            this.cursorDiv.style.transform = `translate(calc(${this.currentX}px - 50%), calc(${this.currentY}px - 50%))`;

            if (tracker.isClicked) {
                this.cursorDiv.style.backgroundImage = 'url(/assets/cursor_pinch.png)';
                
                if (!this.wasClicked) {
                    this.wasClicked = true;

                    const elementHTML = document.elementFromPoint(this.currentX, this.currentY) as HTMLElement;
                    if (elementHTML) {
                        elementHTML.click();
                    }
                    
                    this.game.events.emit('hand_click', { x: this.currentX, y: this.currentY });
                }
            } else {
                this.cursorDiv.style.backgroundImage = 'url(/assets/cursor_open.png)';
                this.wasClicked = false;
            }
        } else {
            this.cursorDiv.style.display = 'none';
            this.isTracking = false;
        }
    }
}