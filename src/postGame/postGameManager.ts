import Phaser from 'phaser';
import { ChatManager } from './chatManager';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import ABI from '../classes/abi';

export class PostGameManager {
    private scene: Phaser.Scene;
    private chatManager!: ChatManager;
    private abi!: ABI;

    private isQuizReady: boolean = false;
    private waitingForQuiz: boolean = false;

    private loadingText?: Phaser.GameObjects.Text;
    private readonly MENU_FONT = 'Arial';

    private quizData: any = {};

    private llmContainer!: Phaser.GameObjects.Container;
    private finalQuizContainer!: Phaser.GameObjects.Container;
    private continueToQuizBtn!: Phaser.GameObjects.Container;

    private prompt: string = "";
    private minigame_description: string = "";
    private knowledge: string = "";
    private defaultResponse: string = ""
    private currentLevel: integer = 0;
    private nextLevel: integer = 0;

    private isWaitingForLLM: boolean = false;

    private llm: ChatGoogleGenerativeAI | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.abi = new ABI(this.scene);

        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown-SPACE', () => {
                if (this.abi.isTalking && !this.isWaitingForLLM) {
                    this.abi.nextDialoguePage();
                }
            });
        }

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
                    this.scene.input.keyboard.enabled = !isChatActive
                    if (!isChatActive) {
                        this.scene.input.keyboard.resetKeys();
                    }
                }
                
                if (!isChatActive) {
                    const activeElement = document.activeElement as HTMLElement;
                    if (activeElement) {
                        activeElement.blur();
                    }
                    setTimeout(() => {
                        window.focus();
                        if (this.scene.game.canvas) {
                            this.scene.game.canvas.focus();
                        }
                    }, 50);
                }
            }
        );
    }

    public preparePostGame(infoTitle: string, infoText: string, level: number) {
        this.quizData = {
            infoTitle,
            infoText,
        };

        this.currentLevel = level;
        this.nextLevel = this.currentLevel + 1;

        this.prompt = localStorage.getItem('GAME_PROMPT') || "";
        this.minigame_description = this.extractTextForLevel(this.currentLevel, localStorage.getItem('MINIGAME_DESCRIPTIONS') || "");
        this.knowledge = this.extractTextForLevel(this.currentLevel, localStorage.getItem('MINIGAME_KNOWLEDGES') || "");
        this.defaultResponse = this.extractTextForLevel(this.currentLevel, localStorage.getItem('DEFAULT_CHAT_RESPONSES') || "");

        this.buildChat();

        this.loadRandomQuiz();
    }

    private loadRandomQuiz() {        

        const availableQuizzes = this.extractQuizzesForLevel(this.currentLevel  , localStorage.getItem('QUIZZES') || "");

        const randomIndex = Phaser.Math.Between(0, availableQuizzes.length - 1);
        const selectedQuiz = availableQuizzes[randomIndex];

        this.quizData.quizQuestion = selectedQuiz.question;
        this.quizData.answers = selectedQuiz.answers;

        this.buildQuiz();
        this.isQuizReady = true;

        if (this.waitingForQuiz) {
            if (this.loadingText) this.loadingText.destroy();
            this.finalQuizContainer.setVisible(true);
        }
    }

    public async evaluatePlayerChatInput(playerMessage: string) {
        this.llmContainer.setVisible(false);
        this.chatManager.hide();

        if (!this.llm) {
            this.abi.showDialogue("ABI", this.defaultResponse, () => {
                this.proceedToQuiz();
            });
            return;
        }

        this.isWaitingForLLM = true

        this.abi.showDialogue("ABI", "Elaborating...", undefined, true);

        try {
            const prompt = this.prompt + 
                `You will be provided with a description of the specific minigame phase and a "knowledge context". The player has just lost the level. 
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

            const feedbackPages = [
                feedback,
                "Do you have any other questions?\nIf not, click 'Continue' to start the quiz."
            ];

            this.isWaitingForLLM = false;

            this.abi.showDialogue("ABI", feedbackPages, () => {
                this.continueToQuizBtn.setVisible(true);
                this.llmContainer.setVisible(true);
                this.chatManager.show();
                
                setTimeout(() => {
                    if (typeof (this.chatManager as any).focus === 'function') {
                        (this.chatManager as any).focus();
                    } else {
                        const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                        if(inputElement) inputElement.focus();
                    }
                }, 50);
            });

        } catch (e) {
            console.log("LLM error: " + e);
            this.isWaitingForLLM = false;
            this.abi.showDialogue("ABI", this.defaultResponse, () => {
                this.proceedToQuiz();
            });
        }
    }

    private proceedToQuiz() {
        this.abi.showDialogue("ABI", "Let's proceed to the quiz!", () => {
            if (this.isQuizReady) {
                this.finalQuizContainer.setVisible(true);
            } else {
                this.waitingForQuiz = true;
                const cx = this.scene.cameras.main.width / 2;
                const cy = this.scene.cameras.main.height / 2;
                this.loadingText = this.scene.add.text(cx, cy, 'Loading quiz...', {
                    fontFamily: this.MENU_FONT, fontSize: '24px', color: '#ffffff',
                }).setOrigin(0.5).setDepth(200);
            }
        });
    }

    // called when player lose
    public showLearningPhase() {
        const dialoguePages = [
            this.quizData.infoTitle,
            this.quizData.infoText,
            "Why do you think you lost?"
        ];

        this.abi.showDialogue("ABI", dialoguePages, () => {
            this.continueToQuizBtn.setVisible(false);
            this.llmContainer.setVisible(true);
            this.chatManager.show();
            
            setTimeout(() => {
                if (typeof (this.chatManager as any).focus === 'function') {
                    (this.chatManager as any).focus();
                }
            }, 50);
        });
    }

    // called when player win
    public showWinScreen() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;

        const windowUi = this.createWindow(cx, cy, 820, 380);
        const title = this.scene.add.text(cx, cy - 90, 'LEVEL COMPLETED!', {
            fontFamily: this.MENU_FONT, fontSize: '48px', fontStyle: 'bold', color: '#00ff00'
        }).setOrigin(0.5);

        const menuBtn = this.createButton(cx, cy + 110, 320, 70, 'Menu', () => {
            this.chatManager.hide()
            window.location.href = '/pages/menu_page.html';
        });

        if (this.nextLevel <= 6) {
            const nextBtn = this.createButton(cx, cy + 20, 320, 70, 'Next level', () => {
                this.chatManager.hide()
                window.location.href = '/pages/level' + this.nextLevel + '.html';
            });

            this.scene.add.container(0, 0, [...windowUi.list, title, nextBtn, menuBtn]).setDepth(120);
        }
        else {
            this.scene.add.container(0, 0, [...windowUi.list, title, menuBtn]).setDepth(120);
        }
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

    private buildChat() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;

        const windowUi = this.createWindow(cx, cy, 980, 560);

        this.continueToQuizBtn = this.createButton(cx + 320, cy + 210, 260, 64, 'Continue', () => {
            this.llmContainer.setVisible(false);
            this.chatManager.hide();
            this.proceedToQuiz();
        });

        this.continueToQuizBtn.setVisible(false);

        this.llmContainer = this.scene.add.container(0, 0, [...windowUi.list, this.continueToQuizBtn]).setDepth(100).setVisible(false);
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

        this.finalQuizContainer = this.scene.add.container(0, 0, [...windowUi.list, question, ...buttons]).setDepth(110).setVisible(false);
    }

    private handleQuizAnswer(isCorrect: boolean) {
        this.finalQuizContainer.setVisible(false);

        if (isCorrect) {
            this.abi.showDialogue("ABI", "Correct! You are now vaccinated!", () => {
                this.chatManager.hide();
                this.scene.scene.restart({ vaccinated: true });
            });
        } else {
            this.abi.showDialogue("ABI", "Wrong answer. Try again!", () => {
                this.finalQuizContainer.setVisible(true);
            });
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

    private extractTextForLevel(level: number, text: string): string {
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.trim().startsWith(`${level}:`)) {
                return line.substring(line.indexOf(':') + 1).trim();
            }
        }
        return "Description not found.";
    }

    private extractQuizzesForLevel(level: number, quizzesText: string) {
        const lines = quizzesText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const quizzes: any[] = [];
        
        let currentQuestion = "";
        let currentAnswers: any[] = [];

        for (const line of lines) {
            if (line.startsWith(`${level}:`)) {
                if (currentQuestion !== "") {
                    quizzes.push({ question: currentQuestion, answers: currentAnswers });
                }
                
                currentQuestion = line.substring(line.indexOf(':') + 1).trim();
                currentAnswers = [];
            } 
            else if (currentQuestion !== "") {
                const answerRegex = new RegExp(`^${level}[a-z]\\((T|F)\\):(.*)`);
                const match = line.match(answerRegex);

                if (match) {
                    const isCorrect = match[1] === 'T';
                    const text = match[2].trim();
                    currentAnswers.push({ text, isCorrect });
                } 
                else if (line.match(/^\d+:/)) {
                    break;
                }
            }
        }

        if (currentQuestion !== "") {
            quizzes.push({ question: currentQuestion, answers: currentAnswers });
        }

        return quizzes;
    }
}