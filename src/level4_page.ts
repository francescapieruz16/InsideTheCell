import Phaser from 'phaser';
import { PostGameManager } from './postGame/postGameManager';

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

class Level4 extends Phaser.Scene {
    private bg!: Phaser.GameObjects.Image;

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
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.createBackground(width, height);
        this.createUi();

        this.createGoldCardTexture();

        this.createCards(width, height);

        this.postGameManager = new PostGameManager(this);
        this.postGameManager.preparePostGame(4);
    }

    private createBackground(width: number, height: number) {
        this.bg = this.add.image(
            width / 2,
            height / 2,
            'background_level4'
        );

        this.bg.setOrigin(0.5);
        this.bg.setDepth(0);

        const texture = this.textures
            .get('background_level4')
            .getSourceImage() as HTMLImageElement;

        const scaleX = width / texture.width;
        const scaleY = height / texture.height;
        const scale = Math.max(scaleX, scaleY);

        this.bg.setScale(scale);
    }

    private createUi() {
        const movesBg = this.add.rectangle(
            170,
            52,
            280,
            60,
            0x001b1d,
            0.72
        );

        movesBg.setDepth(19);

        this.movesText = this.add.text(
            40,
            24,
            `MOVES: 0/${this.maxMoves}`,
            {
                fontSize: '36px',
                color: '#66ff7d',
                stroke: '#000000',
                strokeThickness: 7,
                fontFamily: 'monospace'
            }
        );

        this.movesText.setDepth(20);
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

        const columns = 5;
        const gapX = 28;
        const gapY = 20;

        const rows = Math.ceil(deck.length / columns);

        const totalGridWidth =
            columns * this.cardWidth + (columns - 1) * gapX;

        const totalGridHeight =
            rows * this.cardHeight + (rows - 1) * gapY;

        const startX =
            width / 2 - totalGridWidth / 2 + this.cardWidth / 2;

        const startY =
            height / 2 - totalGridHeight / 2 + this.cardHeight / 2 - 10;

        deck.forEach((cardInfo, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);

            const x = startX + col * (this.cardWidth + gapX);
            const y = startY + row * (this.cardHeight + gapY);

            const isStaticGold = this.isVaccinated && cardInfo.type === 'gold';

            const image = this.add.image(
                x,
                y,
                isStaticGold ? cardInfo.key : 'card_back'
            );

            image.setOrigin(0.5);
            image.setDepth(10);
            image.setDisplaySize(this.cardWidth, this.cardHeight);

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

        const currentScaleY = card.image.scaleY;

        this.tweens.add({
            targets: card.image,
            scaleX: 0,
            duration: 120,
            ease: 'Power1',
            onComplete: () => {
                card.image.setTexture(card.key);
                card.image.setDisplaySize(this.cardWidth, this.cardHeight);

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

        card.image.scaleY = currentScaleY;
    }

    private hideCard(card: CardData) {
        card.isFlipped = false;

        const currentScaleY = card.image.scaleY;

        this.tweens.add({
            targets: card.image,
            scaleX: 0,
            duration: 120,
            ease: 'Power1',
            onComplete: () => {
                card.image.setTexture('card_back');
                card.image.setDisplaySize(this.cardWidth, this.cardHeight);

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

        card.image.scaleY = currentScaleY;
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

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080,
    },
    parent: 'game-container',

    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                x: 0,
                y: 0
            },
            debug: false
        }
    },

    render: {
        roundPixels: true
    },

    scene: [Level4]
};

new Phaser.Game(config);