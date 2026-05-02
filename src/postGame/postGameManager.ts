import Phaser from 'phaser';
import { ChatManager } from './chatManager';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export class PostGameManager {
    private scene: Phaser.Scene;
    private chatManager!: ChatManager;

    private isQuizReady: boolean = false;
    private waitingForQuiz: boolean = false;

    private loadingText?: Phaser.GameObjects.Text;
    private readonly MENU_FONT = 'Arial';

    private quizData: any = {};
    private quizKey: string = "";

    private infoContainer!: Phaser.GameObjects.Container;
    private llmContainer!: Phaser.GameObjects.Container;
    private finalQuizContainer!: Phaser.GameObjects.Container;
    private llmResponseText!: Phaser.GameObjects.Text;
    private continueToQuizBtn!: Phaser.GameObjects.Container;
    private finalQuizResultText!: Phaser.GameObjects.Text;
    private questionText!: Phaser.GameObjects.Text;

    private minigame_description: string = "";
    private knowledge: string = "";
    private defaultResponse: string = ""

    private llm: ChatGoogleGenerativeAI | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        const savedApiKey = localStorage.getItem('GEMINI_API_KEY') || "";

        if (savedApiKey.trim() !== "") {
            try {
                this.llm = new ChatGoogleGenerativeAI({
                    model: "gemini-3-flash-preview",
                    apiKey: savedApiKey,
                    temperature: 0.7,
                });
            } catch (e) {
                console.warn("Error initzializing LLM:", e);
                this.llm = null;
            }
        } else {
            this.llm = null;
        }
        
        this.chatManager = new ChatManager(
        (playerMessage: string) => {
            this.evaluatePlayerChatInput(playerMessage);
        },
        (isChatActive: boolean) => {
            if (this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = !isChatActive;
            }
        }
    );
    }

    public preparePostGame(infoTitle: string, infoText: string, minigame_description: string, knowledge: string, defaultResponse: string, quizzesKey: string) {
        this.quizData = {
            infoTitle,
            infoText,
        };

        this.minigame_description = minigame_description;
        this.knowledge = knowledge;
        this.defaultResponse = defaultResponse;
        this.quizKey = quizzesKey;

        this.buildInfo();
        this.buildChat();

        this.loadRandomQuiz();
    }

    private loadRandomQuiz() {
        try {
            const quizzes = this.scene.cache.json.get(this.quizKey);

            if (!Array.isArray(quizzes) || quizzes.length === 0) {
                throw new Error("Invalid or empty quiz JSON");
            }


            // pick a random quiz from the file
            const randomIndex = Phaser.Math.Between(0, quizzes.length - 1);
            const selectedQuiz = quizzes[randomIndex];

            this.quizData.quizQuestion = selectedQuiz.quizQuestion;
            this.quizData.answers = selectedQuiz.answers;
            
            this.buildQuiz();
            this.isQuizReady = true;

            if (this.waitingForQuiz) {
                if (this.loadingText) this.loadingText.destroy();
                this.finalQuizContainer.setVisible(true);
            }
        } catch (e) {
            this.quizData.quizQuestion = "What is the mandatory first step for infection is?";
            this.quizData.answers = [
                { text: "Binding phase", isCorrect: true },
                { text: "Replicating inside the nucleus", isCorrect: false },
                { text: "Destroying the host cell", isCorrect: false }
            ];
            this.buildQuiz();
            this.isQuizReady = true;
        }
    }

    public async evaluatePlayerChatInput(playerMessage: string) {
        const isFirstMessage = this.questionText && this.questionText.visible;

        try {
        
            if (isFirstMessage) {
                this.questionText.setVisible(false);
            }

            this.llmResponseText.setText("Elaborating...");
            this.continueToQuizBtn.setVisible(false);

            if (!this.llm) {
                throw new Error("API key not present.");
            }

            const prompt = 
                `You are an AI tutor in an educational video game about viral infection phases, designed for middle and high school students. 
                You will be provided with a description of the specific minigame phase and a "knowledge context". The player has just lost the level. 
                They will initially respond to the prompt "Why do you think you lost?", and may subsequently ask you follow-up questions.

                Follow these strict rules to formulate your response:
                1. You must answer using EXCLUSIVELY the provided "knowledge context". Do not introduce outside scientific facts or information.
                2. Always validate the player's effort. Find the positive logic or merit in their answers and questions before gently correcting or guiding them.
                3. Your response MUST be extremely brief—strictly a maximum of 2 to 3 short sentences. This is mandatory so the text fits inside a small UI container.`

            const chatPromptTemplate = ChatPromptTemplate.fromMessages([
                ["system", prompt],
                ["user", "Minigame description: {minigame_description}\n\nKnowledge context: {knowledge}\n\nPlayer answer: {playerMessage}"]
            ]);

            const chain = chatPromptTemplate.pipe(this.llm).pipe(new StringOutputParser());

            const feedback = await chain.invoke({
                minigame_description: this.minigame_description,
                knowledge: this.knowledge,
                playerMessage: playerMessage
            });

            this.llmResponseText.setText(feedback);
            this.continueToQuizBtn.setVisible(true);
            this.chatManager.show();
        } catch (e) {
            console.log("LLM error" + e)
            if (isFirstMessage) {
                this.llmResponseText.setText(this.defaultResponse);
                this.continueToQuizBtn.setVisible(true);
                this.chatManager.hide();
            } else {
                this.llmResponseText.setText("Error contacting LLM. Proceed to quiz.");
                this.continueToQuizBtn.setVisible(true);
                this.chatManager.hide();
            }
        }
    }

    // called when player lose
    public showLearningPhase() {
        this.infoContainer.setVisible(true);
    }

    // called when player win
    public showWinScreen() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;

        const windowUi = this.createWindow(cx, cy, 820, 380);
        const title = this.scene.add.text(cx, cy - 90, 'LEVEL COMPLETED!', {
            fontFamily: this.MENU_FONT, fontSize: '48px', fontStyle: 'bold', color: '#00ff88'
        }).setOrigin(0.5);

        const nextBtn = this.createButton(cx, cy + 20, 320, 70, 'Next level', () => {
            this.chatManager.hide()
            window.location.href = '/pages/level2.html';
        });

        const menuBtn = this.createButton(cx, cy + 110, 320, 70, 'Menu', () => {
            this.chatManager.hide()
            window.location.href = '/pages/menu_page.html';
        });

        this.scene.add.container(0, 0, [...windowUi.list, title, nextBtn, menuBtn]).setDepth(120);
    }

    // called when player lose in vaccinated mode
    public showGameOverScreen() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;

        const windowUi = this.createWindow(cx, cy, 820, 420);
        
        const title = this.scene.add.text(cx, cy - 100, 'GAME OVER', {
            fontFamily: this.MENU_FONT, fontSize: '56px', fontStyle: 'bold', color: '#770000'
        }).setOrigin(0.5);

        const text = this.scene.add.text(cx, cy - 20, 'The virus breached the cell defenses.', {
            fontFamily: this.MENU_FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        const retryBtn = this.createButton(cx, cy + 70, 320, 70, 'Try Again', () => {
            this.chatManager.hide();
            this.scene.scene.restart({ vaccinated: true }); 
        });

        const menuBtn = this.createButton(cx, cy + 160, 320, 70, 'Menu', () => {
            this.chatManager.hide();
            window.location.href = '/pages/menu_page.html';
        });

        this.scene.add.container(0, 0, [...windowUi.list, title, text, retryBtn, menuBtn]).setDepth(120);
    }

    private buildInfo() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;

        const windowUi = this.createWindow(cx, cy, 980, 540);
        const title = this.scene.add.text(cx, cy - 145, this.quizData.infoTitle, {
            fontFamily: this.MENU_FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        const text = this.scene.add.text(cx, cy - 15, this.quizData.infoText, {
            fontFamily: this.MENU_FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff', align: 'center', wordWrap: { width: 760 }, lineSpacing: 12
        }).setOrigin(0.5);

        const continueBtn = this.createButton(cx, cy + 180, 340, 70, 'Continue', () => {
            this.infoContainer.setVisible(false);
            this.llmContainer.setVisible(true);
            this.chatManager.show();
        });

        this.infoContainer = this.scene.add.container(0, 0, [...windowUi.list, title, text, continueBtn])
            .setDepth(95).setVisible(false);
    }

    private buildChat() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;

        const windowUi = this.createWindow(cx, cy, 980, 560);

        this.questionText = this.scene.add.text(cx, cy - 95, "Why do you think you lost?", {
            fontFamily: this.MENU_FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff', align: 'center', wordWrap: { width: 760 }
        }).setOrigin(0.5); 

        this.llmResponseText = this.scene.add.text(cx, cy + 20, '', {
            fontFamily: this.MENU_FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff', align: 'center', wordWrap: { width: 760 }, lineSpacing: 10
        }).setOrigin(0.5);

        this.continueToQuizBtn = this.createButton(cx + 330, cy - 230, 260, 64, 'Continue', () => {
            this.llmContainer.setVisible(false);
            this.chatManager.hide();
            
            if (this.isQuizReady) {
                this.finalQuizContainer.setVisible(true);
            } else {
                this.waitingForQuiz = true;
                this.loadingText = this.scene.add.text(cx, cy, 'Loading quiz...', {
                    fontFamily: this.MENU_FONT, fontSize: '24px', color: '#ffffff',
                }).setOrigin(0.5).setDepth(200);
            }
        });
        this.continueToQuizBtn.setVisible(false);

        this.llmContainer = this.scene.add.container(0, 0, [...windowUi.list, this.questionText, this.llmResponseText, this.continueToQuizBtn]).setDepth(100).setVisible(false);
    }

    private buildQuiz() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;

        const windowUi = this.createWindow(cx, cy, 960, 560);

        const question = this.scene.add.text(cx, cy - 100, this.quizData.quizQuestion, {
            fontFamily: this.MENU_FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff', align: 'center', wordWrap: { width: 720 }
        }).setOrigin(0.5);

        const buttons: Phaser.GameObjects.Container[] = [];
        this.quizData.answers.forEach((ans: any, index: number) => {
            const yOffset = cy + 30 + (index * 85);
            const btn = this.createButton(cx, yOffset, 700, 68, ans.text, () => this.handleQuizAnswer(ans.isCorrect));
            buttons.push(btn);
        });

        this.finalQuizResultText = this.scene.add.text(cx, cy - 195, '', {
            fontFamily: this.MENU_FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        this.finalQuizContainer = this.scene.add.container(0, 0, [...windowUi.list, question, ...buttons, this.finalQuizResultText]).setDepth(110).setVisible(false);
    }

    private handleQuizAnswer(isCorrect: boolean) {
        if (isCorrect) {
            this.finalQuizResultText.setText('Correct! Vaccinated mode unlocked.');
            this.finalQuizResultText.setColor('#00ff00');
            this.scene.time.delayedCall(1000, () => {
                this.chatManager.hide()
                this.scene.scene.restart({ vaccinated: true });
            });
        } else {
            this.finalQuizResultText.setText('Wrong answer. Try again.');
            this.finalQuizResultText.setColor('#770000');
        }
    }

    private createWindow(x: number, y: number, width: number, height: number) {
        const container = this.scene.add.container(0, 0);
        const shadow = this.scene.add.rectangle(x + 8, y + 8, width, height, 0x000000, 0.35);
        const outer = this.scene.add.rectangle(x, y, width, height, 0xff5a0a, 1).setStrokeStyle(4, 0xffffff);
        const inner = this.scene.add.rectangle(x, y, width - 12, height - 12, 0xd94700, 1);
        container.add([shadow, outer, inner]);
        return container;
    }

    private createButton(x: number, y: number, width: number, height: number, label: string, onClick: () => void) {
        const container = this.scene.add.container(x, y);
        const outer = this.scene.add.rectangle(0, 0, width, height, 0x3d5381, 1).setStrokeStyle(4, 0xffffff);
        const text = this.scene.add.text(0, 0, label, {
            fontFamily: this.MENU_FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        const maxTextWidth = width - 40;
        
        if (text.width > maxTextWidth) {
            text.setScale(maxTextWidth / text.width);
        }

        const hit = this.scene.add.rectangle(0, 0, width, height, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        
        hit.on('pointerover', () => container.setScale(1.05));
        hit.on('pointerout', () => container.setScale(1));
        hit.on('pointerdown', () => { container.setScale(0.95); onClick(); });
        hit.on('pointerup', () => container.setScale(1.05));
        
        container.add([outer, text, hit]);
        return container;
    }
}