export class ChatManager {
    private chatUi: HTMLDivElement;
    private chatInput: HTMLInputElement;
    private chatSend: HTMLButtonElement;
    
    private onMessageSent: (message: string) => void;
    private onChatStateChange: (isActive: boolean) => void;

    constructor(
        onMessageSent: (message: string) => void,
        onChatStateChange: (isActive: boolean) => void
    ) {
        this.onMessageSent = onMessageSent;
        this.onChatStateChange = onChatStateChange;

        this.chatUi = document.getElementById('llm-chat-ui') as HTMLDivElement;
        this.chatInput = document.getElementById('llm-chat-input') as HTMLInputElement;
        this.chatSend = document.getElementById('llm-chat-send') as HTMLButtonElement;

        Object.assign(this.chatUi.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '1000'
        });

        this.initListeners();
        this.hide();
    }

    private initListeners() {
        this.chatSend.onclick = () => this.handleSubmit();

        this.chatInput.addEventListener('keydown', (event: KeyboardEvent) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSubmit();
            }
        });

        this.chatInput.addEventListener('keyup', (event: KeyboardEvent) => {
            event.stopPropagation();
        });
    }

    public show() {
        this.chatInput.value = '';
        this.chatUi.style.display = 'flex';
        this.onChatStateChange(true);
        setTimeout(() => this.chatInput.focus(), 50);
    }

    public hide() {
        this.chatUi.style.display = 'none';
        this.onChatStateChange(false);
    }

    private handleSubmit() {
        const userText = this.chatInput.value.trim();
        if (!userText) return;

        this.hide();
        this.onMessageSent(userText);
    }
}