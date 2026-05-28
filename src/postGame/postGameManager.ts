import Phaser from 'phaser';
import { ChatManager } from './chatManager';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import ABI from '../classes/abi';
import defaultDialogues from '../../assets/default_dialogues.json';
import defaultAdminSettings from '../../assets/default_context_and_quizzes.json';

export class PostGameManager {
    private scene: Phaser.Scene;
    private chatManager!: ChatManager;
    private abi!: ABI;

    private isQuizReady: boolean = false;
    private waitingForQuiz: boolean = false;

    private loadingText?: Phaser.GameObjects.Text;
    private readonly MENU_FONT = 'Arial';

    private quizData: any = {};

    private allUIContainers: Phaser.GameObjects.Container[] = [];

    private llmContainer!: Phaser.GameObjects.Container;
    private finalQuizContainer!: Phaser.GameObjects.Container;
    private quizButtons: Phaser.GameObjects.Container[] = [];
    private continueToQuizBtn!: Phaser.GameObjects.Container;

    private prompt: string = "";
    private minigame_description: string = "";
    private knowledge: string = "";
    private defaultResponse: string = "";
    private defaultDialogues: string[] = [];
    private dialogues: string[] = [];
    private currentLevel: number = 0;
    private nextLevel: number = 0;
    private postGameTexts: any = {
        questionLost: "",
        proceedPrompt: "",
        proceedQuiz: "",
        correctAnswer: "",
        wrongAnswer: ""
    };
    private quizzes: any = {};

    private isWaitingForLLM: boolean = false;

    private llm: ChatGoogleGenerativeAI | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.abi = new ABI(this.scene);

        this.scene.scale.on('resize', this.handleResize, this);

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
                    this.scene.input.keyboard.enabled = !isChatActive;

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
                if (isChatActive) {
                    this.abi.MoveDialogueY(-150); 
                } else {
                    this.abi.MoveDialogueY(0); 
                }
            }
        );
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        const cx = gameSize.width / 2;
        const cy = gameSize.height / 2;
        const zoom = gameSize.height / 1080;
        
        this.allUIContainers.forEach(container => {
            if (container && container.active) {
                container.setPosition(cx, cy);
                container.setScale(zoom);
            }
        });

        if (this.loadingText && this.loadingText.active) {
            this.loadingText.setPosition(cx, cy);
            this.loadingText.setScale(zoom);
        }

        if (this.quizButtons && this.quizButtons.length > 0) {
            this.repositionQuizButtons();
        }
    }

    public preparePostGame(level: number) {
        this.currentLevel = level;
        this.nextLevel = this.currentLevel + 1;
        const levelKey = `minigame_${this.currentLevel}`;

        const savedAdminSettings = localStorage.getItem('ADMIN_SETTINGS_JSON');
        let adminSettings = null;

        if (savedAdminSettings) {
            try {
                adminSettings = JSON.parse(savedAdminSettings);
            } catch (e) {
                console.warn("Error reading saved admin settings. Using defaults.", e);
                adminSettings = defaultAdminSettings;
            }
        } else {
            adminSettings = defaultAdminSettings;
        }

        const defaultSettings = defaultAdminSettings as any;

        const defaultLevelData = defaultSettings.minigames ? defaultSettings.minigames[levelKey] : {};
        const levelAdminData = adminSettings.minigames[levelKey];

        this.prompt = adminSettings.game_prompt || defaultSettings.game_prompt;
        this.minigame_description = levelAdminData.description || defaultLevelData.description;
        this.knowledge = levelAdminData.knowledge || defaultLevelData.knowledge;

        this.quizzes = (levelAdminData.quizzes && levelAdminData.quizzes.length > 0) 
            ? levelAdminData.quizzes 
            : (defaultLevelData.quizzes || []);
        
        const savedDialogues = localStorage.getItem('DIALOGUES_JSON');
        let allDialogues = null;    
        
        if (savedDialogues) {
            try {
                allDialogues = JSON.parse(savedDialogues);
            } catch (e) {
                console.warn("Error reading saved dialogues. Using defaults.", e);
                allDialogues = defaultDialogues;
            }
        } else {
            allDialogues = defaultDialogues;
        }

        this.defaultDialogues = [];
        this.defaultResponse = ""; 

        if (allDialogues) {
            if (allDialogues.minigames && allDialogues.minigames[levelKey]) {
                const levelData = allDialogues.minigames[levelKey];
                
                if (levelData.dialogue_1) this.defaultDialogues.push(levelData.dialogue_1);
                if (levelData.dialogue_2) this.defaultDialogues.push(levelData.dialogue_2);
                if (levelData.dialogue_3) this.defaultResponse = levelData.dialogue_3; 
            }

            if (allDialogues.post_minigames) {
                this.postGameTexts.questionLost = allDialogues.post_minigames.dialogue_1 || this.postGameTexts.questionLost;
                this.postGameTexts.proceedPrompt = allDialogues.post_minigames.dialogue_2 || this.postGameTexts.proceedPrompt;
                this.postGameTexts.proceedQuiz = allDialogues.post_minigames.dialogue_3 || this.postGameTexts.proceedQuiz;
                this.postGameTexts.correctAnswer = allDialogues.post_minigames.dialogue_4 || this.postGameTexts.correctAnswer;
                this.postGameTexts.wrongAnswer = allDialogues.post_minigames.dialogue_5 || this.postGameTexts.wrongAnswer;
            }
        }

        this.dialogues = [...this.defaultDialogues];

        this.buildChat();
        this.loadRandomQuiz();
    }

    private loadRandomQuiz() {
        const availableQuizzes = this.extractQuizzesFromList(this.quizzes);

        if (!availableQuizzes || availableQuizzes.length === 0) {
            console.warn(`No quiz found for level ${this.currentLevel}. Check the admin dashboard data.`);
            this.buildMissingQuizScreen();
            this.isQuizReady = true;

            if (this.waitingForQuiz) {
                if (this.loadingText) this.loadingText.destroy();
                this.finalQuizContainer.setVisible(true);
            }
            return;
        }

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

        this.isWaitingForLLM = true;
        this.abi.showDialogue("ABI", "Elaborating...", undefined, true);

        try {
            const prompt = this.prompt +
                `You will be provided with a description of the specific minigame phase and a "knowledge context". The player has just lost the level.
                They will initially respond to the prompt "Why do you think you lost?", and may subsequently ask you follow-up questions.

                Follow these strict rules to formulate your response:
                1. You must answer using EXCLUSIVELY the provided "knowledge context". Do not introduce outside scientific facts or information.
                2. Always validate the player's effort. Find the positive logic or merit in their answers and questions before gently correcting or guiding them.
                3. Your response MUST be extremely brief—strictly a maximum of 2 to 3 short sentences. This is mandatory so the text fits inside a small UI container.`;

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
                this.postGameTexts.proceedPrompt
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
                        if (inputElement) inputElement.focus();
                    }
                }, 50);
            }, false, true);

        } catch (e) {
            console.log("LLM error: " + e);
            this.isWaitingForLLM = false;
            this.abi.showDialogue("ABI", this.defaultResponse, () => {
                this.proceedToQuiz();
            });
        }
    }

    private proceedToQuiz() {
        this.abi.showDialogue("ABI", this.postGameTexts.proceedQuiz, () => {
            this.showQuizQuestion();
        });
    }

    private showQuizQuestion() {
        if (this.isQuizReady) {
            this.abi.showDialogue("ABI", this.quizData.quizQuestion, undefined, true, true);
            this.abi.MoveDialogueY(-180); 
            this.repositionQuizButtons();
            this.quizButtons.forEach(btn => btn.setVisible(true));
        } else {
            this.waitingForQuiz = true;

            const cx = this.scene.cameras.main.width / 2;
            const cy = this.scene.cameras.main.height / 2;
            const zoom = this.scene.cameras.main.height / 1080;

            this.loadingText = this.scene.add.text(
                cx, cy, 'Loading quiz...',
                { fontFamily: this.MENU_FONT, fontSize: '28px', color: '#ffffff' }
            )
            .setOrigin(0.5)
            .setScale(zoom)
            .setDepth(200)
            .setScrollFactor(0);
        }
    }

    public async showLearningPhase() {
        const dialoguePages = [...this.dialogues, this.postGameTexts.questionLost];

        this.abi.showDialogue("ABI", dialoguePages, () => {
            this.continueToQuizBtn.setVisible(false);
            this.chatManager.show();

            setTimeout(() => {
                if (typeof (this.chatManager as any).focus === 'function') {
                    (this.chatManager as any).focus();
                }
            }, 50);
        }, false, true);
    }

    public showWinScreen() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;
        const zoom = this.scene.cameras.main.height / 1080;

        const windowUi = this.createWindow(820, 380);
        const title = this.scene.add.text(0, -90, 'LEVEL COMPLETED!', { fontFamily: this.MENU_FONT, fontSize: '48px', fontStyle: 'bold', color: '#00ff00' }).setOrigin(0.5);
        const menuBtn = this.createButton(0, 110, 320, 70, 'Menu', '28px', () => {
            this.chatManager.hide();
            window.location.href = '/pages/menu_page.html';
        });

        const winContainer = this.scene.add.container(cx, cy).setDepth(120).setScrollFactor(0);

        if (this.nextLevel <= 6) {
            const nextBtn = this.createButton(0, 20, 320, 70, 'Next level', '28px', () => {
                this.chatManager.hide();
                window.location.href = '/pages/level' + this.nextLevel + '.html';
            });
            winContainer.add([...windowUi.list, title, nextBtn, menuBtn]);
        } else {
            winContainer.add([...windowUi.list, title, menuBtn]);
        }

        winContainer.setScale(zoom);
        this.allUIContainers.push(winContainer);
    }

    public showGameOverScreen() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;
        const zoom = this.scene.cameras.main.height / 1080;

        const windowUi = this.createWindow(820, 420);
        const title = this.scene.add.text(0, -100, 'GAME OVER', { fontFamily: this.MENU_FONT, fontSize: '56px', fontStyle: 'bold', color: '#770000' }).setOrigin(0.5);
        const retryBtn = this.createButton(0, 70, 320, 70, 'Try Again', '28px', () => {
            this.chatManager.hide();
            this.scene.scene.restart({ vaccinated: true });
        });
        const menuBtn = this.createButton(0, 160, 320, 70, 'Menu', '28px', () => {
            this.chatManager.hide();
            window.location.href = '/pages/menu_page.html';
        });

        const goContainer = this.scene.add.container(cx, cy, [...windowUi.list, title, retryBtn, menuBtn])
            .setDepth(120)
            .setScrollFactor(0);

        goContainer.setScale(zoom);
        this.allUIContainers.push(goContainer);
    }

    private buildChat() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;
        const zoom = this.scene.cameras.main.height / 1080;

        this.continueToQuizBtn = this.createButton(cx - 150, cy - 110, 260, 64, 'Go to the quiz', '28px', () => {
            this.llmContainer.setVisible(false);
            this.chatManager.hide();
            this.proceedToQuiz();
        });
        this.continueToQuizBtn.setVisible(false);

        this.llmContainer = this.scene.add.container(cx, cy, [this.continueToQuizBtn])
            .setDepth(100)
            .setVisible(false)
            .setScrollFactor(0);

        this.llmContainer.setScale(zoom);
        this.allUIContainers.push(this.llmContainer);
    }

    private buildQuiz() {
        const zoom = this.scene.cameras.main.height / 1080;

        const totalAnswers = this.quizData.answers.length;
        const buttonWidth = 450; 
        const buttonHeight = 150; 
        const spacing = 40; 

        const totalWidth = (buttonWidth * totalAnswers) + (spacing * (totalAnswers - 1));
        const startX = -(totalWidth / 2) + (buttonWidth / 2);
        
        const fixedY = 0; 

        this.quizData.answers.forEach((ans: any, index: number) => {
            const xOffset = startX + index * (buttonWidth + spacing);
            
            const btn = this.createButton(xOffset, fixedY, buttonWidth, buttonHeight, ans.text, '35px', () => this.handleQuizAnswer(ans.isCorrect));
            
            btn.setDepth(110);
            btn.setScrollFactor(0);
            btn.setVisible(false);
            
            (btn as any).quizIndex = index;
            (btn as any).totalAnswers = totalAnswers;
            (btn as any).btnWidth = buttonWidth;
            (btn as any).spacing = spacing;
            (btn as any).xOffset = xOffset;
            
            this.quizButtons.push(btn);
        });

        this.repositionQuizButtons();
    }

    private repositionQuizButtons() {
        const screenW = this.scene.cameras.main.width;
        const screenH = this.scene.cameras.main.height;
        
        const camZoom = this.scene.cameras.main.zoom;

        const cx = (screenW / 2) / camZoom;
        const bottomY = screenH / camZoom;
        const targetUIZoom = screenH / 1080;
        const uiScale = targetUIZoom / camZoom;

        const scaledPadding = 30 * uiScale;
        const scaledHalfHeight = 75 * uiScale; 

        const fixedY = bottomY - scaledHalfHeight - scaledPadding;

        this.quizButtons.forEach(btn => {
            const index = (btn as any).quizIndex;
            const totalAnswers = (btn as any).totalAnswers;
            const bWidth = (btn as any).btnWidth;
            const spacing = (btn as any).spacing;

            const totalWidth = (bWidth * totalAnswers) + (spacing * (totalAnswers - 1));
            const startX = -(totalWidth / 2) + (bWidth / 2);
            const xOffset = startX + index * (bWidth + spacing);

            btn.setScale(uiScale);
            (btn as any).baseScale = uiScale; 

            btn.setPosition(cx + (xOffset * uiScale), fixedY);
        });
    }

    private buildMissingQuizScreen() {
        const cx = this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.height / 2;
        const zoom = this.scene.cameras.main.height / 1080;

        const windowUi = this.createWindow(1400, 900);
        const message = this.scene.add.text(0, -70, `No quiz configured for level ${this.currentLevel}.\nPlease add it from the Admin Dashboard.`, {
            fontFamily: this.MENU_FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff', align: 'center', wordWrap: { width: 720 }
        }).setOrigin(0.5);

        const menuBtn = this.createButton(0, 90, 320, 70, 'Menu', '28px', () => {
            this.chatManager.hide();
            window.location.href = '/pages/menu_page.html';
        });

        this.finalQuizContainer = this.scene.add.container(cx, cy, [...windowUi.list, message, menuBtn])
            .setDepth(110)
            .setVisible(false)
            .setScrollFactor(0);

        this.finalQuizContainer.setScale(zoom);
        this.allUIContainers.push(this.finalQuizContainer);
    }

    private handleQuizAnswer(isCorrect: boolean) {
        this.quizButtons.forEach(btn => btn.setVisible(false));

        if (isCorrect) {
            this.abi.MoveDialogueY(0);
            this.abi.showDialogue("ABI", this.postGameTexts.correctAnswer, () => {
                this.chatManager.hide();
                this.scene.scene.restart({ vaccinated: true });
            });
        } else {
            this.abi.MoveDialogueY(0);
            this.abi.showDialogue("ABI", this.postGameTexts.wrongAnswer, () => {
                this.showQuizQuestion();
            });
        }
    }

    private createWindow(width: number, height: number) {
        const container = this.scene.add.container(0, 0);

        const shadow = this.scene.add.rectangle(8, 8, width, height, 0x000000, 0.35);
        const outer = this.scene.add.rectangle(0, 0, width, height, 0xff5a0a, 1).setStrokeStyle(4, 0xffffff);
        const inner = this.scene.add.rectangle(0, 0, width - 12, height - 12, 0xd94700, 1);

        container.add([shadow, outer, inner]);
        return container;
    }

    private createButton(x: number, y: number, width: number, height: number, label: string, fontSize: string, onClick: () => void) {
        const container = this.scene.add.container(x, y);
        (container as any).baseScale = 1; 

        const outer = this.scene.add.rectangle(0, 0, width, height, 0x3d5381, 1).setStrokeStyle(4, 0xffffff);
        
        const text = this.scene.add.text(0, 0, label, { 
            fontFamily: this.MENU_FONT, 
            fontSize: fontSize,
            fontStyle: 'bold', 
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 40 } 
        }).setOrigin(0.5);

        const maxTextWidth = width - 40;
        if (text.width > maxTextWidth) text.setScale(maxTextWidth / text.width);

        container.add([outer, text]);

        outer.setScrollFactor(0);
        outer.setInteractive({ useHandCursor: true });

        outer.on('pointerover', () => {
            container.setScale((container as any).baseScale * 1.05);
            this.scene.game.canvas.style.cursor = 'pointer';
        });
        
        outer.on('pointerout', () => {
            container.setScale((container as any).baseScale);
            this.scene.game.canvas.style.cursor = 'default';
        });
        
        outer.on('pointerdown', () => {
            container.setScale((container as any).baseScale * 0.95);
            this.scene.game.canvas.style.cursor = 'default';
            onClick();
        });
        
        outer.on('pointerup', () => {
            container.setScale((container as any).baseScale * 1.05);
        });

        return container;
    }

    private extractQuizzesFromList(quizzesList: string[] | undefined) {
        if (!quizzesList || !Array.isArray(quizzesList) || quizzesList.length === 0) {
            return [];
        }

        const quizzes: any[] = [];

        for (const quizBlock of quizzesList) {
            const lines = quizBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length < 2) continue;

            const question = lines[0];
            const answers: any[] = [];

            for (let i = 1; i < lines.length; i++) {
                const match = lines[i].match(/^[a-z]\((T|F)\):(.*)/);
                if (match) {
                    answers.push({
                        text: match[2].trim(),
                        isCorrect: match[1] === 'T'
                    });
                }
            }

            if (answers.length > 0) {
                quizzes.push({ question: question, answers: answers });
            }
        }

        return quizzes;
    }

    public extractDefaultInfoForLevel(level: number, text: string): string[] {
        const lines = text.split('\n');
        let isCapturing = false;
        const extractedLines: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith(`${level}a:`)) {
                isCapturing = true;
                extractedLines.push(trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim());
            } else if (isCapturing && trimmedLine.startsWith(`${level}b:`)) {
                extractedLines.push(trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim());
            } else if (isCapturing && trimmedLine.match(/^\d+a:/) && !trimmedLine.startsWith(`${level}a:`)) {
                break;
            } else if (isCapturing && trimmedLine.length > 0) {
                if (extractedLines.length > 0) {
                    extractedLines[extractedLines.length - 1] += '\n' + trimmedLine;
                }
            }
        }

        return extractedLines.length > 0 ? extractedLines : ["Default info not found."];
    }
}