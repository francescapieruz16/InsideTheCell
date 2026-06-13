# 🧬 InsideTheCell

**InsideTheCell** is an interactive educational game developed with TypeScript and Phaser, designed to guide students through the complex world of virology. Through a series of levels, mini-games, and cutscenes, players explore the mechanisms of viral infection within a cell.

---

## 🚀 Key Features

* **Dynamic Exploration:** Navigate through different cellular zones (External, Membrane, Cytoplasm) with space-themed exploration mechanics.
* **AI-Driven Dialogue System:** A dynamic system powered by Google Gemini to generate contextualized educational content, fully configurable via the Admin Dashboard.
* **Educational Mini-games:** Each level represents a specific phase of the viral life cycle (Binding, Entry, Uncoating, Replication, Assembly, Release).
* **Multi-modal Input:** Integrated support for Hand Tracking via MediaPipe for a more immersive, hands-free experience.
* **Admin Dashboard:** A robust control panel to modify AI prompts, mini-game descriptions, quizzes, and dialogue scripts without altering the codebase.
* **Progress Tracking:** Persistent progress management via browser `localStorage`.

---

## 🗺️ Project Structure

### Main Game Interface (`/index.html`)
The main entry point for the Phaser application.

### Admin Dashboard (`/pages/admin_dashboard.html`)
Allows administrators to configure:
* **Gemini API Key:** For AI-generated content.
* **Game Prompts:** Custom instructions for the AI tutor.
* **Content Management:** Descriptions, knowledge contexts, and quizzes for each of the 6 mini-games.
* **JSON Utilities:** Import and export game settings in raw JSON format.

### Dialogues Manager (`/pages/dialogues.html`)
A dedicated interface to review and edit all game dialogues, organized by Tutorials, Cutscenes, and Mini-game sequences.

---

## 🛠️ Local Development Setup

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **yarn**

### Installation
1. Clone the repository:
```bash
   git clone [YOUR_REPOSITORY_URL]
   cd InsideTheCell