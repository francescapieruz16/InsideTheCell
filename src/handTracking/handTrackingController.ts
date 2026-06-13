import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class HandTrackingController {
    private static instance: HandTrackingController;
    private videoElement!: HTMLVideoElement;
    private hands!: Hands;
    private camera!: Camera;

    public targetX: number = -1;
    public targetY: number = -1;
    public rawX: number = -1;
    public rawY: number = -1;
    
    public isClicked: boolean = false;

    private lastClickTime: number = 0;
    private readonly clickCooldownMs: number = 300;
    private readonly pinchThresholdStart: number = 0.05;
    private readonly pinchThresholdRelease: number = 0.08;
    
    public isReady: boolean = false;
    public onReady?: () => void;

    private constructor() {}

    public static getInstance(): HandTrackingController {
        if (!HandTrackingController.instance) {
            HandTrackingController.instance = new HandTrackingController();
        }
        return HandTrackingController.instance;
    }

    public getVideoElement(): HTMLVideoElement | null {
        return this.videoElement;
    }

    public async initialize() {
        if (this.isReady) {
            if (this.onReady) this.onReady();
            return;
        }

        if (this.videoElement) return;

        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);

        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results: Results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const hand = results.multiHandLandmarks[0];
                
                const wrist = hand[0];
                const thumbTip = hand[4];
                const indexTip = hand[8];
                
                const sensitivity = 2; 
                // offset to lower cursor position
                const offsetY = 0.30; 
                
                const currentRawX = 1 - wrist.x;
                const currentRawY = wrist.y;

                const smoothing = 0.4; 

                if (this.rawX === -1) {
                    this.rawX = currentRawX;
                    this.rawY = currentRawY;
                } else {
                    this.rawX += (currentRawX - this.rawX) * smoothing;
                    this.rawY += (currentRawY - this.rawY) * smoothing;
                }

                this.targetX = (this.rawX - 0.5) * sensitivity + 0.5;
                this.targetY = (this.rawY - 0.5 - offsetY) * sensitivity + 0.5;

                const distance = Math.hypot(
                    (1 - indexTip.x) - (1 - thumbTip.x),
                    indexTip.y - thumbTip.y
                );

                const now = Date.now();

                if (!this.isClicked) {
                    if (distance < this.pinchThresholdStart) {
                        if (now - this.lastClickTime > this.clickCooldownMs) {
                            this.isClicked = true;
                            this.lastClickTime = now;
                        }
                    }
                } else {
                    if (distance > this.pinchThresholdRelease) {
                        this.isClicked = false;
                    }
                }
            } else {
                this.targetX = -1;
                this.targetY = -1;
                this.rawX = -1;
                this.rawY = -1;
                this.isClicked = false;
            }
        });

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
                if (!this.isReady) {
                    this.isReady = true;
                    if (this.onReady) this.onReady();
                }
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
    }

    public stop() {
        if (this.camera) this.camera.stop();
        if (this.videoElement?.parentNode) this.videoElement.parentNode.removeChild(this.videoElement);
        this.isReady = false;
        HandTrackingController.instance = undefined as any;
    }
}