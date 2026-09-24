# PromptForge Studio

Build ONLY the new PromptForge frontend UI.

IMPORTANT:
- Do NOT build authentication.
- Do NOT build Login/Register.
- Do NOT build backend/API/database.
- Use mock data only.
- Do NOT build RAG, Knowledge Files, Agents, Web Search, or Tool Calling.
- Do not use "Gem" or "SubGem". Use "Prompt System" and "Prompt Module".

Create a clean modern responsive PromptForge dashboard with:

1. LEFT SIDEBAR
- PromptForge logo
- Home
- Prompt Systems
- Modules
- Templates
- Settings

2. PROMPT LIBRARY / HOME
- Header: "Prompt Library"
- Search bar
- Filter button
- "+ New Prompt System" button
- Prompt System cards
- Recently Edited section

Example cards:
- Technical Blog Writer
- Code Reviewer
- Executive Summary

3. PROMPT SYSTEM EDITOR
When opening a Prompt System, show tabs:

Overview
Instructions
Variables
Modules
Examples
Output
Tests
Versions

4. OVERVIEW
Fields:
- Name
- Description
- Tags
- Optional Icon

5. INSTRUCTIONS
Large editor for Core Instructions.

6. VARIABLES
Show variable cards and "+ Add Variable".
Each variable has:
- Name
- Label
- Type
- Required
- Default
- Description

Types:
Text, Number, Select, Multiline

7. MODULES
Show reusable Prompt Module cards.
Add:
- Research Module
- Critic Module
- Writer Module

Each module card has:
Name
Description
Enabled/Disabled
Configure button

8. EXAMPLES
Input/Output example cards and "+ Add Example".

9. OUTPUT
Large editor for Output Requirements.

10. PREVIEW
Add a "Preview Prompt" button.
Show a final prompt preview with:
Core Instructions
Variables
Module outputs
Output Requirements

Buttons:
Edit
Copy
Run

11. TESTS
Show test cases with:
Name
Variables
Expected Behavior
Run Test button

12. VERSIONS
Show:
Version number
Date
Change note
View
Compare
Restore

13. DESIGN
Use a professional modern SaaS interface.
Responsive desktop/mobile layout.
Use cards, tabs, dialogs, badges and clean spacing.
Keep the implementation simple.

Start the application directly at the Prompt Library.

Build the UI only. Do not implement authentication or backend.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
