import Phaser from 'phaser';
import { ChatManager } from './chatManager';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

export class PostGameManager {
    private scene: Phaser.Scene;
    private chatManager!: ChatManager;

    private isQuizReady: boolean = false;
    private waitingForQuiz: boolean = false;

    private loadingText?: Phaser.GameObjects.Text;
    private readonly MENU_FONT = 'Arial';

    private quizData: any = {};

    private infoContainer!: Phaser.GameObjects.Container;
    private llmContainer!: Phaser.GameObjects.Container;
    private finalQuizContainer!: Phaser.GameObjects.Container;
    private llmResponseText!: Phaser.GameObjects.Text;
    private continueToQuizBtn!: Phaser.GameObjects.Container;
    private finalQuizResultText!: Phaser.GameObjects.Text;
    private questionText!: Phaser.GameObjects.Text;

    private chatPrompt: string = "";
    private knowledge: string = "";

    private llm = new ChatGoogleGenerativeAI({
        model: "gemini-3-flash-preview",
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        temperature: 0.7,
    });

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        
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

    public preparePostGame(infoTitle: string, infoText: string, reflectiveQuestion: string, prompt: string, knowledge: string, chatPrompt: string) {
        this.quizData = {
            infoTitle,
            infoText,
            reflectiveQuestion
        };

        this.chatPrompt = chatPrompt;
        this.knowledge = knowledge;

        this.buildInfo();
        this.buildChat();

        this.generateQuizInBackground(prompt, knowledge);
    }

    private async generateQuizInBackground(prompt: string, knowledge: string) {
        try {
            const quizSchema = z.object({
                quizQuestion: z.string().describe("The final multiple-choice question that the player must answer."),
                answers: z.array(z.object({
                    text: z.string().describe("The text of the answer (keep it short)."),
                    isCorrect: z.boolean().describe("True if it is the correct answer, false otherwise.")
                })).length(3).describe("Exactly three possible answers.")
            });

            const structuredLlm = this.llm.withStructuredOutput(quizSchema);
            const generatedData = await structuredLlm.invoke(prompt + knowledge);

            this.quizData.quizQuestion = generatedData.quizQuestion;
            this.quizData.answers = generatedData.answers;
            
            this.buildQuiz();
            this.isQuizReady = true;

            if (this.waitingForQuiz) {
                if (this.loadingText) this.loadingText.destroy();
                this.finalQuizContainer.setVisible(true);
            }
        } catch (e) {
            console.error("Error during quiz content generation:", e);
        }
    }

    public async evaluatePlayerChatInput(playerMessage: string) {
    try {
            if (this.questionText && this.questionText.visible) {
                this.questionText.setVisible(false);
            }

            this.llmResponseText.setText("Elaborating...");
            this.continueToQuizBtn.setVisible(false);

            const chatPromptTemplate = ChatPromptTemplate.fromMessages([
                ["system", this.chatPrompt],
                ["user", "Knowledge context: {knowledge}\n\nPlayer answer: {playerMessage}"]
            ]);

            const chain = chatPromptTemplate.pipe(this.llm).pipe(new StringOutputParser());

            const feedback = await chain.invoke({
                knowledge: this.knowledge,
                playerMessage: playerMessage
            });

            this.llmResponseText.setText(feedback);
            this.continueToQuizBtn.setVisible(true);
            this.chatManager.show();
        } catch (e) {
            this.llmResponseText.setText("Connection error. Procede with the quiz.");
            this.continueToQuizBtn.setVisible(true);
            this.chatManager.show();
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

        this.questionText = this.scene.add.text(cx, cy - 95, this.quizData.reflectiveQuestion, {
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