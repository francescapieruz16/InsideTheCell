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
            top: '90%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '1000',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
            width: '60%',
            maxWidth: '750px'
        });

        Object.assign(this.chatInput.style, {
            flex: '1',
            height: '60px',
            padding: '0 20px',
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            border: '3px solid #ff5a0a',
            borderRadius: '20px',
            boxSizing: 'border-box',
            outline: 'none'
        });

        Object.assign(this.chatSend.style, {
            height: '60px',
            padding: '0 30px',
            backgroundColor: '#ff5a0a',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            border: '3px solid white',
            borderRadius: '20px',
            cursor: 'pointer',
            boxSizing: 'border-box'
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
        this.chatUi.style.pointerEvents = 'none';
        this.onChatStateChange(false);
    }

    private handleSubmit() {
        const userText = this.chatInput.value.trim();
        if (!userText) return;

        this.hide();
        this.onMessageSent(userText);
    }
}