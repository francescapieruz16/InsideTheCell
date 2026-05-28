import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import defaultSettingsJSON from '../assets/default_context_and_quizzes.json';
import defaultDialoguesJSON from '../assets/default_dialogues.json';

export class AdminDashboard {
    private apiKeyInput!: HTMLInputElement;
    private promptInput!: HTMLTextAreaElement;
    private jsonArea!: HTMLTextAreaElement;
    
    private saveBtn!: HTMLButtonElement;
    private resetBtn!: HTMLButtonElement;
    private importBtn!: HTMLButtonElement;
    private toast!: HTMLElement;

    constructor() {
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    private init() {
        this.apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
        this.promptInput = document.getElementById('generic-prompt') as HTMLTextAreaElement;
        this.jsonArea = document.getElementById('raw-json') as HTMLTextAreaElement;
        
        this.saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
        this.resetBtn = document.getElementById('btn-reset') as HTMLButtonElement;
        this.importBtn = document.getElementById('btn-import') as HTMLButtonElement;
        this.toast = document.getElementById('toast-notification') as HTMLElement;

        this.saveBtn.addEventListener('click', () => this.handleSave());
        this.resetBtn.addEventListener('click', () => this.handleReset());
        this.importBtn.addEventListener('click', () => this.handleImportJSON());

        this.loadAndPopulateData();
    }

    private loadAndPopulateData() {
        this.apiKeyInput.value = localStorage.getItem('GEMINI_API_KEY') || "";

        const savedData = localStorage.getItem('ADMIN_SETTINGS_JSON');
        let settingsData;

        if (savedData) {
            try {
                settingsData = JSON.parse(savedData);
            } catch (e) {
                console.error("Failed to parse saved JSON, falling back to defaults.", e);
                settingsData = defaultSettingsJSON;
            }
        } else {
            settingsData = defaultSettingsJSON;
        }

        this.populateUIFromJSON(settingsData);
    }

    private populateUIFromJSON(data: any) {
        if (!data) return;

        this.promptInput.value = data.game_prompt || "";

        for (let i = 1; i <= 6; i++) {
            const levelData = data.minigames[`minigame_${i}`] || {};
            
            const descEl = document.getElementById(`desc-${i}`) as HTMLTextAreaElement;
            const knowEl = document.getElementById(`know-${i}`) as HTMLTextAreaElement;
            const quizEl = document.getElementById(`quiz-${i}`) as HTMLTextAreaElement;

            if (descEl) descEl.value = levelData.description || "";
            if (knowEl) knowEl.value = levelData.knowledge || "";
            
            if (quizEl) {
                if (Array.isArray(levelData.quizzes)) {
                    quizEl.value = levelData.quizzes.join('\n\n');
                } else {
                    quizEl.value = levelData.quizzes || "";
                }
            }
        }

        this.jsonArea.value = JSON.stringify(data, null, 4);
    }

    private buildJSONFromUI() {
        const data: any = {
            "game_prompt": this.promptInput.value.trim(),
            "minigames": {}
        };

        for (let i = 1; i <= 6; i++) {
            const descEl = document.getElementById(`desc-${i}`) as HTMLTextAreaElement;
            const knowEl = document.getElementById(`know-${i}`) as HTMLTextAreaElement;
            const quizEl = document.getElementById(`quiz-${i}`) as HTMLTextAreaElement;

            const rawQuizzes = quizEl ? quizEl.value.trim() : "";
            const quizList = rawQuizzes 
                ? rawQuizzes.split(/\n\s*\n/).map(q => q.trim()).filter(q => q.length > 0)
                : [];

            data.minigames[`minigame_${i}`] = {
                "description": descEl ? descEl.value.trim() : "",
                "knowledge": knowEl ? knowEl.value.trim() : "",
                "quizzes": quizList
            };
        }
        return data;
    }

    private async handleSave() {
        const apiKey = this.apiKeyInput.value.trim();
        this.setLoadingState(true);

        const dataObj = this.buildJSONFromUI();
        const jsonString = JSON.stringify(dataObj, null, 4);

        localStorage.setItem('GEMINI_API_KEY', apiKey);
        localStorage.setItem('ADMIN_SETTINGS_JSON', jsonString);
        
        this.jsonArea.value = jsonString;

        let currentDialogues: any;
        try {
            currentDialogues = JSON.parse(localStorage.getItem('DIALOGUES_JSON') || "null") || defaultDialoguesJSON;
        } catch (e) {
            console.warn("Error reading saved dialogues, using defaults.");
            currentDialogues = defaultDialoguesJSON;
        }

        if (apiKey !== "") {
            this.showToast('Generating dialogues with AI... This might take a minute.', '#3498db', '#ebf5fb', 70000);

            try {
                const llm = new ChatGoogleGenerativeAI({
                    model: "gemini-3-flash-preview",
                    apiKey: apiKey,
                    temperature: 0.7,
                });

                // ==========================================
                // STEP 1: TUTORIALS
                // ==========================================
                console.log("Generating tutorials...");
                //TODO: fix prompt
                const tutorialsPrompt = `${dataObj.game_prompt}\n
                You are rewriting the introductory tutorials for the game.
                I will provide the "Current Dialogues JSON" template for the tutorials.
                Tutorial 1 is the external part of the cell. Tutorial 2 explains the membrane. Tutorial 3 explains the internal part of the cell.
                
                Follow these strict rules:
                1. Keep the EXACT same JSON keys as the template. Only change the string values.
                2. Write as an engaging AI tutor explaining the game to a student.
                CRITICAL: You MUST return ONLY a valid JSON object. Do not wrap it in markdown formatting like \`\`\`json. Return purely the raw JSON string.`;

                const tutChain = ChatPromptTemplate.fromMessages([
                    ["system", tutorialsPrompt],
                    ["user", "Current Dialogues JSON:\n{current_json}"]
                ]).pipe(llm).pipe(new StringOutputParser());

                let tutFeedback = await tutChain.invoke({
                    current_json: JSON.stringify(currentDialogues.tutorials, null, 2)
                });

                try {
                    tutFeedback = tutFeedback.replace(/```json/g, '').replace(/```/g, '').trim();
                    currentDialogues.tutorials = JSON.parse(tutFeedback);
                } catch (e) {
                    console.error("Errore parsing Tutorials JSON", tutFeedback);
                }

                // ==========================================
                // STEP 2: MINIGAMES
                // ==========================================
                console.log("Generating minigames...");
                for (let level = 1; level <= 6; level++) {
                    const minigameDesc = dataObj.minigames[`minigame_${level}`].description;
                    const knowledgeContext = dataObj.minigames[`minigame_${level}`].knowledge;
                    const currentLevelDialogues = currentDialogues.minigames[`minigame_${level}`] || { dialogue_1: "", dialogue_2: "", dialogue_3: "" };

                    if (!minigameDesc || !knowledgeContext) continue;

                    const minigamePrompt = `${dataObj.game_prompt}\n
                    You are rewriting the post-game failure dialogues for a specific level.
                    I will provide you with the "Minigame Description", the "Knowledge Context", and the "Current Dialogues JSON" template for this level.
                    The player has just lost the minigame.

                    Follow these strict rules:
                    1. EXCLUSIVELY use the provided "Knowledge Context" or "Minigame Description".
                    2. Keep the EXACT same JSON keys as the template. Only change the string values.
                    3. 'dialogue_1': A short, dramatic exclamation announcing the virus's success (max 6-8 words).
                    4. 'dialogue_2': Gently state the failure and provide a brief (1-2 sentences) explanation of the biological event.
                    5. 'dialogue_3': A helpful hint that summarizes the core concept from the "Knowledge Context", giving the player the crucial information they need to answer the upcoming quiz correctly (e.g., "Remember that during the binding phase, viruses must use their surface proteins to attach to specific cell receptors like a lock and key.").
                    CRITICAL: You MUST return ONLY a valid JSON object. Do not wrap it in markdown.`;

                    const mgChain = ChatPromptTemplate.fromMessages([
                        ["system", minigamePrompt],
                        ["user", "Minigame description: {minigame_description}\n\nKnowledge context: {knowledge}\n\nCurrent Dialogues JSON:\n{current_json}"]
                    ]).pipe(llm).pipe(new StringOutputParser());

                    let mgFeedback = await mgChain.invoke({
                        minigame_description: minigameDesc,
                        knowledge: knowledgeContext,
                        current_json: JSON.stringify(currentLevelDialogues, null, 2)
                    });

                    try {
                        mgFeedback = mgFeedback.replace(/```json/g, '').replace(/```/g, '').trim();
                        currentDialogues.minigames[`minigame_${level}`] = JSON.parse(mgFeedback);
                    } catch (e) {
                        console.error(`Errore parsing Minigame ${level} JSON`, mgFeedback);
                    }
                }

                // ==========================================
                // STEP 3: POST-MINIGAMES
                // ==========================================
                console.log("Generating post-minigames...");
                const postGamePrompt = `${dataObj.game_prompt}\n
                You are rewriting the standard UI messages for the post-minigame chat and quiz phase.
                I will provide the "Current Dialogues JSON" template.
                
                - dialogue_1: Ask the player why they think they lost.
                - dialogue_2: Ask if they have other questions, otherwise proceed to the quiz.
                - dialogue_3: Exclamation to start the quiz.
                - dialogue_4: Congratulate the player for a correct answer (vaccination successful).
                - dialogue_5: Inform the player of a wrong answer and prompt them to try again.
                
                Follow these strict rules:
                1. Keep the EXACT same JSON keys as the template. Only change the string values.
                CRITICAL: You MUST return ONLY a valid JSON object. Do not wrap it in markdown.`;

                const pgChain = ChatPromptTemplate.fromMessages([
                    ["system", postGamePrompt],
                    ["user", "Current Dialogues JSON:\n{current_json}"]
                ]).pipe(llm).pipe(new StringOutputParser());

                let pgFeedback = await pgChain.invoke({
                    current_json: JSON.stringify(currentDialogues.post_minigames, null, 2)
                });

                try {
                    pgFeedback = pgFeedback.replace(/```json/g, '').replace(/```/g, '').trim();
                    currentDialogues.post_minigames = JSON.parse(pgFeedback);
                } catch (e) {
                    console.error("Errore parsing Post-Minigames JSON", pgFeedback);
                }

                localStorage.setItem('DIALOGUES_JSON', JSON.stringify(currentDialogues, null, 4));
                this.showToast('Settings and dialogues saved successfully! Redirecting...', '#27ae60', '#e8f8f5');
                setTimeout(() => { window.location.href = '/index.html'; }, 1500);

            } catch (error) {
                console.error("LangChain Error:", error);
                this.showToast('Error generating dialogues. Check API Key or Console.', '#e74c3c', '#fdedec');
                this.setLoadingState(false);
            }
        } else {
            this.showToast('Settings saved (No AI generated dialogues). Redirecting...', '#27ae60', '#e8f8f5');
            setTimeout(() => { window.location.href = '/index.html'; }, 1000);
        }
    }

    private handleImportJSON() {
        const rawText = this.jsonArea.value.trim();
        try {
            const parsedData = JSON.parse(rawText);
            this.populateUIFromJSON(parsedData);
            this.showToast('JSON imported successfully!', '#27ae60', '#e8f8f5');
        } catch (e) {
            console.error("Invalid JSON format", e);
            this.showToast('Error: Invalid JSON format!', '#e74c3c', '#fdedec');
        }
    }

    private handleReset() {
        if (!confirm("Are you sure you want to reset all settings to default?")) return;
        localStorage.removeItem('GEMINI_API_KEY');
        localStorage.removeItem('ADMIN_SETTINGS_JSON');
        this.populateUIFromJSON(defaultSettingsJSON);
        this.showToast('Settings reset to default values.', '#e74c3c', '#fdedec');
    }

    private extractCleanDialogue(text: string): string[] {
        const lines = text.split('\n');
        let isCapturing = false;
        const extractedLines: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith(`a:`)) {
                isCapturing = true;
                extractedLines.push(trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim());
            } else if (isCapturing && trimmedLine.startsWith(`b:`)) {
                extractedLines.push(trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim());
            } else if (isCapturing && trimmedLine.match(/^[a-z]:/) && !trimmedLine.startsWith(`a:`) && !trimmedLine.startsWith(`b:`)) {
                break;
            } else if (isCapturing && trimmedLine.length > 0) {
                if (extractedLines.length > 0) {
                    extractedLines[extractedLines.length - 1] += '\n' + trimmedLine;
                }
            }
        }
        return extractedLines.length > 0 ? extractedLines : ["Error parsing data.", "Please try again."];
    }

    private setLoadingState(isLoading: boolean) {
        this.saveBtn.disabled = isLoading;
        this.resetBtn.disabled = isLoading;
        this.importBtn.disabled = isLoading;
        this.saveBtn.style.cursor = isLoading ? 'wait' : 'pointer';
    }

    private showToast(text: string, textColor: string, bgColor: string, duration: number = 3000) {
        this.toast.textContent = text;
        this.toast.style.color = textColor;
        this.toast.style.backgroundColor = bgColor;
        this.toast.classList.add("show");
        
        setTimeout(() => {
            this.toast.classList.remove("show");
        }, duration);
    }
}

new AdminDashboard();