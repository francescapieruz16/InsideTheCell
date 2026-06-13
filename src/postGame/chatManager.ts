export class ChatManager {
    private chatUi: HTMLDivElement;
    private chatInput: HTMLInputElement;
    private chatSend: HTMLButtonElement;
    private chatMic?: HTMLButtonElement;
    private keyboardUi?: HTMLDivElement;
    
    private onMessageSent: (message: string) => void;
    private onChatStateChange: (isActive: boolean) => void;
    private onMicClick?: () => void;
    private onKeyboardStateChange?: (isOpen: boolean) => void;

    constructor(
        onMessageSent: (message: string) => void,
        onChatStateChange: (isActive: boolean) => void,
        isHandTrackingActive: boolean = false,
        onMicClick?: () => void,
        onKeyboardStateChange?: (isOpen: boolean) => void
    ) {
        this.onMessageSent = onMessageSent;
        this.onChatStateChange = onChatStateChange;
        this.onMicClick = onMicClick;
        this.onKeyboardStateChange = onKeyboardStateChange;

        this.chatUi = document.createElement('div');
        this.chatUi.id = 'llm-chat-ui';

        this.chatInput = document.createElement('input');
        this.chatInput.id = 'llm-chat-input';
        this.chatInput.type = 'text';
        this.chatInput.placeholder = isHandTrackingActive ? 'Press mic to start dictating' : 'Type here...';
        this.chatInput.autocomplete = 'off';

        this.chatSend = document.createElement('button');
        this.chatSend.id = 'llm-chat-send';
        this.chatSend.innerText = 'Send';

        this.chatUi.appendChild(this.chatInput);

        if (isHandTrackingActive) {
            this.chatMic = document.createElement('button');
            this.chatMic.id = 'llm-chat-mic';
            this.chatMic.innerText = '🎤';
            
            Object.assign(this.chatMic.style, {
                height: '60px',
                padding: '0 20px',
                backgroundColor: '#ffffff',
                color: 'white',
                fontSize: '24px',
                border: '3px solid #ff5a0a',
                borderRadius: '20px',
                cursor: 'pointer',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });

            this.chatMic.onclick = () => {
                if (this.onMicClick) this.onMicClick();
            };

            this.chatUi.appendChild(this.chatMic);
        }

        this.chatUi.appendChild(this.chatSend);
        
        document.getElementById('app')?.appendChild(this.chatUi);

        Object.assign(this.chatUi.style, {
            position: 'absolute',
            top: '90%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '990',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
            width: '60%',
            maxWidth: '750px'
        });

        const inputRow = document.createElement('div');
        Object.assign(inputRow.style, {
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            gap: '15px'
        });

        inputRow.appendChild(this.chatInput);
        if (this.chatMic) inputRow.appendChild(this.chatMic);
        inputRow.appendChild(this.chatSend);
        this.chatUi.appendChild(inputRow);

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

    public showVirtualKeyboard() {
        if (this.keyboardUi) return;

        this.chatUi.style.top = '80%';

        if (this.onKeyboardStateChange) {
            this.onKeyboardStateChange(true);
        }

        this.keyboardUi = document.createElement('div');
        this.keyboardUi.id = 'llm-virtual-keyboard';

        Object.assign(this.keyboardUi.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
            gap: '8px',
            width: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '15px',
            borderRadius: '15px',
            boxSizing: 'border-box',
            border: '2px solid #ff5a0a'
        });

        const keys = [
            'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
            'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Del',
            'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', 'Space'
        ];

        keys.forEach(key => {
            const btn = document.createElement('button');
            btn.innerText = key;
            
            btn.addEventListener('pointerdown', (e) => e.stopPropagation());
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleVirtualKeyPress(key);
            });

            const isLongKey = key === 'Space' || key === 'Del';

            Object.assign(btn.style, {
                height: '45px',
                fontSize: isLongKey ? '13px' : '18px',
                fontWeight: 'bold',
                backgroundColor: '#3d5381',
                color: 'white',
                border: '2px solid white',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '0',
                padding: '0 2px',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            });

            this.keyboardUi?.appendChild(btn);
        });

        this.chatUi.appendChild(this.keyboardUi);
        setTimeout(() => this.chatInput.focus(), 50);
    }

    private handleVirtualKeyPress(key: string) {
        if (key === 'Del') {
            this.chatInput.value = this.chatInput.value.slice(0, -1);
        } else if (key === 'Space') {
            this.chatInput.value += ' ';
        } else {
            this.chatInput.value += key.toLowerCase();
        }
        this.chatInput.focus();
    }

    public hideVirtualKeyboard() {
        if (this.keyboardUi && this.keyboardUi.parentNode) {
            this.keyboardUi.parentNode.removeChild(this.keyboardUi);
            this.keyboardUi = undefined;
        }

        this.chatUi.style.top = '90%';

        if (this.onKeyboardStateChange) {
            this.onKeyboardStateChange(false);
        }
    }

    public show() {
        this.chatInput.value = '';
        this.chatUi.style.display = 'flex';
        this.chatUi.style.pointerEvents = 'auto';
        this.onChatStateChange(true);
        setTimeout(() => this.chatInput.focus(), 50);
    }

    public hide() {
        this.hideVirtualKeyboard();
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

    public destroy() {
        if (this.chatUi && this.chatUi.parentNode) {
            this.chatUi.parentNode.removeChild(this.chatUi);
        }
    }
}