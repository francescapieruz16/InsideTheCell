# 🧬 InsideTheCell
**InsideTheCell** is an interactive educational game developed with TypeScript and Phaser, designed to guide students through the complex world of virology. Through a series of levels, mini-games, and cutscenes, players explore the mechanisms of viral infection within a cell.

---

## 🚀 Key Features
* ✋ **Advanced Hand Tracking**: Integrated support for hand tracking using **MediaPipe**. Players can move and interact (e.g., *Pinch* gesture) using their webcam.
* 🧠 **Generative AI Integration**: Minigame failures trigger an educational chat and quiz session dynamically managed via **Google Gemini API** (using LangChain).
* 🗣️ **A.B.I. (Assistant Biological Intelligence)**: A fully voiced virtual assistant via *Web Speech Synthesis API*, guiding the player through tutorials and narrative phases.
* 📖 **Exploration and BioLog (Journal)**: Exploration phases in a cellular environment (e.g., membrane, cytoplasm) to collect scientific information ("Data Logs") that can be unlocked in an in-game journal.
* ⚙️ **Admin Dashboard**: Isolated HTML web pages (`admin_dashboard.html` and `dialogues.html`) to manage API Keys, edit the entire game script, configure the AI, and save everything to JSON format.

---

## 🎮 Game Structure and Levels

The game blends RPG/exploration mechanics with six distinct minigames, one for each phase of the viral infection.

### 🔬 Exploration (Tutorial Zones)
* **Scene 1 (External)**: Exploration of the world outside the cell, collecting the first viral fragments and interacting with surface receptors.
* **Scene 2 (Membrane)**: Crossing the lipid membrane and understanding the "fluid mosaic" structure.
* **Scene 3 (Internal)**: Navigating the deep cytoplasm among mitochondria, lysosomes, and the Golgi Apparatus.

### 🕹️ Minigames (Infection Phases)
* **Level 1 (Binding)** - *Catch Game*: Move a cart/receptor to catch falling viruses.
* **Level 2 (Entry)** - *Shooter*: Use the crosshair (mouse or hand tracking) to intercept and destroy invading viruses.
* **Level 3 (Uncoating)** - *Platformer*: Jump over obstacles and reach the flags before the fatal release of the viral genome.
* **Level 4 (Replication)** - *Memory Game*: Find the correct pairs by flipping cards (e.g., RNA base pairing).
* **Level 5 (Assembly)** - *Merge Game*: Drop viral components from above and merge identical ones to evolve them, being careful not to cross the "danger line".
* **Level 6 (Release)** - *Maze Chase*: Pac-Man style game. Escape the maze, collect scattered clone viruses, and prevent an intracellular outbreak.
* **Final Boss** - *Trivia Battle*: A final showdown where you must prove your biological knowledge through a quiz. Making mistakes will make the boss stronger!

---

## 🗺️ Project Structure

```text
└── InsideTheCell/
    ├── pages/             # Admin and Dialogue management HTML pages
    ├── src/
    │   ├── classes/       # Core game entities (ABI, Spaceship)
    │   ├── Cutscenes/     # Cutscene logic and flow
    │   ├── ExploreZone_scenes/ # Gameplay scenes (Manager, Levels, UI)
    │   ├── handTracking/  # Hand tracking integration logic
    │   ├── postGame/      # Post-game chat and quiz managers
    │   ├── adminDashboard.ts # Admin Dashboard logic
    │   ├── main.ts        # Main entry point and Phaser config
    │   ├── menu_page.ts   # Main menu scene
    │   └── [level_pages].ts # Individual level implementation
    └──
```

The project is divided between a WebGL Canvas (for the game) and HTML DOM interfaces for management:
* **`index.html`**: Main entry point and Phaser canvas.
* **Menu and Options**: Start management, Level Selection, and guided webcam calibration.
* **Admin Dashboard** (`/pages/admin_dashboard.html`): Allows teachers/admins to input the **Gemini API Key**, change system prompts, and minigame contexts.
* **Dialogues Manager** (`/pages/dialogues.html`): A visual editor to alter A.B.I.'s lines, boss dialogues, chat messages, and cutscenes.
* **Pause Menu & Settings**: Accessible in every level by pressing `ESC` or clicking "PAUSE", to adjust music and assistant voice volumes.

## 🚀 Local Execution Instructions

### Prerequisites
* Have [Node.js](https://nodejs.org/) installed.
* A webcam (if you want to test the hand tracking feature).

### Installation and Startup
1. **Clone the repository** and navigate to the project directory:
```bash
cd InsideTheCell
```
2. **Install the dependencies**:
```bash
npm install
```
3. **Start the development server**:
```bash
npm run dev
```
4. Open your browser to the local address provided by the terminal (usually `http://localhost:5173`).

### 🤖 AI Configuration (Gemini)
To enable the *Chat Manager* during Game Over screens (educational explanations when failing a minigame):
1. Start the game and click the **⚙️ (Settings)** icon in the Main Menu.
2. Enter your **Gemini API Key** in the dedicated field of the *Admin Dashboard*.
3. Save the settings. This will automatically generate the educational dialogues.
