import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';
import { HandTrackingController } from '../src/handTracking/handTrackingController';

type CardType = 'true' | 'false' | 'gold';

type CardData = {
    id: number;
    key: string;
    value: string;
    type: CardType;
    isFlipped: boolean;
    isMatched: boolean;
    isStaticGold: boolean;
    image: Phaser.GameObjects.Image;
};

type CardInfo = {
    key: string;
    value: string;
    type: CardType;
};

export class Level4 extends Phaser.Scene {
    private cards: CardData[] = [];
    private flippedCards: CardData[] = [];

    private canClick = true;
    private gameEnded = false;

    private matchedTruePairs = 0;

    private readonly truePairsNeeded = 5;
    private readonly maxMoves = 10;

    private readonly cardWidth = 105;
    private readonly cardHeight = 158;

    private moves = 0;
    private movesText!: Phaser.GameObjects.Text;

    private postGameManager!: PostGameManager;

    private isVaccinated: boolean = false;
    private hasShownQuiz: boolean = false;

    private uiContainer!: Phaser.GameObjects.Container;
    private wasClicked: boolean = false;

    private currentScale: number = 1;

    constructor() {
        super('Level4');
    }

    init(data: { vaccinated?: boolean } = {}) {
        this.isVaccinated = !!data.vaccinated;
        this.hasShownQuiz = this.isVaccinated;

        this.cards = [];
        this.flippedCards = [];

        this.canClick = true;
        this.gameEnded = false;

        this.matchedTruePairs = 0;
        this.moves = 0;
    }

    preload() {
        this.load.image(
            'background_level4',
            '/assets/level4/background_level_4.png'
        );

        this.load.image(
            'card_back',
            '/assets/level4/card_back.png'
        );

        this.load.image(
            'card_viral_rna',
            '/assets/level4/card_viral_rna.png'
        );

        this.load.image(
            'card_adenine',
            '/assets/level4/card_adenine.png'
        );

        this.load.image(
            'card_uracil',
            '/assets/level4/card_uracil.png'
        );

        this.load.image(
            'card_cytosine',
            '/assets/level4/card_cytosine.png'
        );

        this.load.image(
            'card_guanine',
            '/assets/level4/card_guanine.png'
        );

        this.load.image(
            'card_buffer_1',
            '/assets/level4/card_buffer_1.png'
        );

        this.load.image(
            'card_buffer_2',
            '/assets/level4/card_buffer_2.png'
        );

        this.load.image(
            'ABI_standard',
            '/assets/tutorial/ABI/ABI_standard.png'
        );
    }

    create() {
        const bgHTML = document.getElementById('background') as HTMLImageElement;
        if (bgHTML) {
            bgHTML.src = '/assets/level4/background_level_4.png';
            bgHTML.style.objectFit = 'fill';
        }

        const style = document.createElement('style');
        style.innerHTML = `
            .phaser-dom-container {
                overflow: visible !important;
            }

            button {
                pointer-events: auto !important;
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
        `;
        document.head.appendChild(style);

        const backBtn = document.createElement('button');
        backBtn.className = 'Back';
        backBtn.innerText = 'PAUSE';

        const wrapper = document.createElement('div');
        wrapper.className = 'phaser-dom-container';
        wrapper.appendChild(backBtn);

        const backBtnDom = this.add.dom(this.scale.gameSize.width - 80, 40, wrapper);

        backBtn.addEventListener('click', () => {
            this.scene.pause();
            this.scene.launch('PauseMenuScene', { parentScene: this.scene.key });
        });

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.createUi();

        this.createGoldCardTexture();

        this.createCards(width, height);

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(4);

        const onResize = (gameSize: Phaser.Structs.Size) => {
            if (!this.scene.isActive() && !this.scene.isPaused()) return;

            const newW = gameSize.width;
            const newH = gameSize.height;

            if (backBtnDom) {
                backBtnDom.setPosition(newW - 80, 40);
            }

            if (this.uiContainer) {
                this.uiContainer.setPosition(170, 60);
            }

            this.repositionCards(newW, newH);
        };

        this.scale.on('resize', onResize);

        onResize(this.scale.gameSize);

        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
            this.tweens.killAll();
        });
    }

    update(time: number, delta: number) {
        if (this.gameEnded) return;

        const inputMode = this.registry.get('inputMode');

        if (inputMode === 'hand') {
            const tracker = HandTrackingController.getInstance();

            if (tracker.targetX !== -1) {
                const screenX = tracker.targetX * this.cameras.main.width;
                const screenY = tracker.targetY * this.cameras.main.height;

                const isClicked = tracker.isClicked;

                if (isClicked && !this.wasClicked) {
                    this.pinchCardWithHand(screenX, screenY);
                }

                this.wasClicked = isClicked;
            } else {
                this.wasClicked = false;
            }
        }
    }

    private pinchCardWithHand(x: number, y: number) {
        if (!this.canClick || this.gameEnded) return;

        for (const card of this.cards) {
            const distance = Phaser.Math.Distance.Between(x, y, card.image.x, card.image.y);

            if (distance < 70 * this.currentScale) {
                this.handleCardClick(card);
                break;
            }
        }
    }

    private repositionCards(width: number, height: number) {
        if (!this.cards || this.cards.length === 0) return;

        const columns = 5;
        const rows = Math.ceil(this.cards.length / columns);

        let cardW = width * 0.11;
        let cardH = cardW * (this.cardHeight / this.cardWidth);

        const maxAllowedHeight = height * 0.65;
        if (cardH * rows > maxAllowedHeight) {
            cardH = maxAllowedHeight / rows;
            cardW = cardH * (this.cardWidth / this.cardHeight);
        }

        this.currentScale = cardW / this.cardWidth;

        const gapX = cardW * 0.15;
        const gapY = cardH * 0.15;

        const totalGridWidth = columns * cardW + (columns - 1) * gapX;
        const totalGridHeight = rows * cardH + (rows - 1) * gapY;

        const startX = width / 2 - totalGridWidth / 2 + cardW / 2;
        const startY = height / 2 - totalGridHeight / 2 + cardH / 2;

        this.cards.forEach((card, index) => {
            this.tweens.killTweensOf(card.image);

            const col = index % columns;
            const row = Math.floor(index / columns);

            const x = startX + col * (cardW + gapX);
            const y = startY + row * (cardH + gapY);

            card.image.setPosition(x, y);
            card.image.setDisplaySize(cardW, cardH);
        });
    }

    private createUi() {
        const movesBg = this.add.rectangle(
            0,
            0,
            280,
            60,
            0x001b1d,
            0.72
        );

        this.movesText = this.add.text(
            -120,
            -20,
            `MOVES: 0/${this.maxMoves}`,
            {
                fontSize: '36px',
                color: '#66ff7d',
                stroke: '#000000',
                strokeThickness: 7,
                fontFamily: 'monospace'
            }
        );

        this.uiContainer = this.add.container(170, 60, [movesBg, this.movesText]);
        this.uiContainer.setDepth(20);
    }

    private createGoldCardTexture() {
        if (this.textures.exists('card_gold_star')) {
            return;
        }

        const width = this.cardWidth;
        const height = this.cardHeight;

        const graphics = this.add.graphics();

        graphics.fillStyle(0xd8a928, 1);
        graphics.fillRoundedRect(0, 0, width, height, 18);

        graphics.lineStyle(6, 0xfff0a8, 1);
        graphics.strokeRoundedRect(4, 4, width - 8, height - 8, 16);

        graphics.lineStyle(3, 0x7a4f00, 0.75);
        graphics.strokeRoundedRect(14, 14, width - 28, height - 28, 12);

        const centerX = width / 2;
        const centerY = height / 2;

        const starPoints: Phaser.Geom.Point[] = [];
        const outerRadius = 40;
        const innerRadius = 18;

        for (let i = 0; i < 10; i++) {
            const angle = Phaser.Math.DegToRad(-90 + i * 36);
            const radius = i % 2 === 0 ? outerRadius : innerRadius;

            starPoints.push(
                new Phaser.Geom.Point(
                    centerX + Math.cos(angle) * radius,
                    centerY + Math.sin(angle) * radius
                )
            );
        }

        graphics.fillStyle(0xffffff, 1);
        graphics.fillPoints(starPoints, true);

        graphics.lineStyle(4, 0xfff4b8, 1);
        graphics.strokePoints(starPoints, true, true);

        graphics.generateTexture('card_gold_star', width, height);
        graphics.destroy();
    }

    private createCards(width: number, height: number) {
        const deck = this.createDeck();

        deck.forEach((cardInfo, index) => {
            const isStaticGold = this.isVaccinated && cardInfo.type === 'gold';

            const image = this.add.image(
                0,
                0,
                isStaticGold ? cardInfo.key : 'card_back'
            );

            image.setOrigin(0.5);
            image.setDepth(10);

            const card: CardData = {
                id: index,
                key: cardInfo.key,
                value: cardInfo.value,
                type: cardInfo.type,
                isFlipped: isStaticGold,
                isMatched: isStaticGold,
                isStaticGold,
                image
            };

            if (!isStaticGold) {
                image.setInteractive({ useHandCursor: true });

                image.on('pointerdown', () => {
                    this.handleCardClick(card);
                });
            } else {
                image.disableInteractive();
                image.setAlpha(0.92);
            }

            this.cards.push(card);
        });

        this.repositionCards(width, height);
    }

    private createDeck(): CardInfo[] {
        const trueCards: CardInfo[] = [
            {
                key: 'card_viral_rna',
                value: 'viral_rna',
                type: 'true'
            },
            {
                key: 'card_adenine',
                value: 'adenine',
                type: 'true'
            },
            {
                key: 'card_uracil',
                value: 'uracil',
                type: 'true'
            },
            {
                key: 'card_cytosine',
                value: 'cytosine',
                type: 'true'
            },
            {
                key: 'card_guanine',
                value: 'guanine',
                type: 'true'
            }
        ];

        if (this.isVaccinated) {
            const goldCards: CardInfo[] = [
                {
                    key: 'card_gold_star',
                    value: 'gold_conquered_1',
                    type: 'gold'
                },
                {
                    key: 'card_gold_star',
                    value: 'gold_conquered_2',
                    type: 'gold'
                },
                {
                    key: 'card_gold_star',
                    value: 'gold_conquered_3',
                    type: 'gold'
                },
                {
                    key: 'card_gold_star',
                    value: 'gold_conquered_4',
                    type: 'gold'
                },
                {
                    key: 'card_gold_star',
                    value: 'gold_conquered_5',
                    type: 'gold'
                }
            ];

            return this.shuffleDeck([
                ...trueCards,
                ...trueCards,
                ...goldCards,
                ...goldCards
            ]);
        }

        const falseCards: CardInfo[] = [
            {
                key: 'card_buffer_1',
                value: 'buffer_mutation_1',
                type: 'false'
            },
            {
                key: 'card_buffer_2',
                value: 'buffer_error_1',
                type: 'false'
            },
            {
                key: 'card_buffer_1',
                value: 'buffer_mutation_2',
                type: 'false'
            },
            {
                key: 'card_buffer_2',
                value: 'buffer_error_2',
                type: 'false'
            },
            {
                key: 'card_buffer_1',
                value: 'buffer_mutation_3',
                type: 'false'
            }
        ];

        return this.shuffleDeck([
            ...trueCards,
            ...trueCards,
            ...falseCards,
            ...falseCards
        ]);
    }

    private shuffleDeck(deck: CardInfo[]) {
        const shuffled = [...deck];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            const temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }

        return shuffled;
    }

    private handleCardClick(card: CardData) {
        if (!this.canClick || this.gameEnded) {
            return;
        }

        if (card.isStaticGold) {
            return;
        }

        if (card.isFlipped || card.isMatched) {
            return;
        }

        if (this.flippedCards.length >= 2) {
            return;
        }

        this.flipCard(card);
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.movesText.setText(`MOVES: ${this.moves}/${this.maxMoves}`);

            this.canClick = false;

            this.time.delayedCall(500, () => {
                this.checkPair();
            });
        }
    }

    private flipCard(card: CardData) {
        card.isFlipped = true;

        this.tweens.add({
            targets: card.image,
            scaleX: 0,
            duration: 120,
            ease: 'Power1',
            onComplete: () => {
                card.image.setTexture(card.key);
                card.image.setDisplaySize(this.cardWidth * this.currentScale, this.cardHeight * this.currentScale);

                const targetScaleX = card.image.scaleX;
                const targetScaleY = card.image.scaleY;

                card.image.setScale(0, targetScaleY);

                this.tweens.add({
                    targets: card.image,
                    scaleX: targetScaleX,
                    scaleY: targetScaleY,
                    duration: 120,
                    ease: 'Power1'
                });
            }
        });
    }

    private hideCard(card: CardData) {
        card.isFlipped = false;

        this.tweens.add({
            targets: card.image,
            scaleX: 0,
            duration: 120,
            ease: 'Power1',
            onComplete: () => {
                card.image.setTexture('card_back');
                card.image.setDisplaySize(this.cardWidth * this.currentScale, this.cardHeight * this.currentScale);

                const targetScaleX = card.image.scaleX;
                const targetScaleY = card.image.scaleY;

                card.image.setScale(0, targetScaleY);

                this.tweens.add({
                    targets: card.image,
                    scaleX: targetScaleX,
                    scaleY: targetScaleY,
                    duration: 120,
                    ease: 'Power1'
                });
            }
        });
    }

    private checkPair() {
        const [firstCard, secondCard] = this.flippedCards;

        if (!firstCard || !secondCard) {
            this.canClick = true;
            return;
        }

        const bothTrue =
            firstCard.type === 'true' &&
            secondCard.type === 'true';

        const bothFalse =
            firstCard.type === 'false' &&
            secondCard.type === 'false';

        const sameTrueValue =
            firstCard.value === secondCard.value;

        const sameBufferImage =
            firstCard.key === secondCard.key;

        if (bothTrue && sameTrueValue) {
            this.handleTruePair(firstCard, secondCard);
            return;
        }

        if (bothFalse && sameBufferImage) {
            this.loseGame();
            return;
        }

        this.handleWrongPair(firstCard, secondCard);
    }

    private handleTruePair(firstCard: CardData, secondCard: CardData) {
        firstCard.isMatched = true;
        secondCard.isMatched = true;

        this.matchedTruePairs++;

        this.tweens.add({
            targets: [firstCard.image, secondCard.image],
            scaleX: firstCard.image.scaleX * 1.08,
            scaleY: firstCard.image.scaleY * 1.08,
            duration: 120,
            yoyo: true,
            ease: 'Power1'
        });

        this.flippedCards = [];

        if (this.matchedTruePairs >= this.truePairsNeeded) {
            this.completeLevel();
            return;
        }

        if (this.moves >= this.maxMoves) {
            this.loseGame();
            return;
        }

        this.canClick = true;
    }

    private handleWrongPair(firstCard: CardData, secondCard: CardData) {
        this.time.delayedCall(500, () => {
            this.hideCard(firstCard);
            this.hideCard(secondCard);

            this.flippedCards = [];

            if (this.moves >= this.maxMoves) {
                this.loseGame();
                return;
            }

            this.canClick = true;
        });
    }

    private completeLevel() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.canClick = false;

        this.postGameManager.showWinScreen();
    }

    private loseGame() {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.canClick = false;

        this.time.delayedCall(400, () => {
            if (this.isVaccinated) {
                this.postGameManager.showGameOverScreen();
            } else if (!this.hasShownQuiz) {
                this.hasShownQuiz = true;
                this.postGameManager.showLearningPhase();
            }
        });
    }
}