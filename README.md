# Terminal Coding Agent

A powerful TypeScript terminal application that lets you browse and reference project files using intuitive "@" mentions. Built with modern CLI tools for a seamless coding experience.

## ✨ Features

- 🚀 TypeScript with strict type checking
- 🎨 Beautiful colored terminal output with chalk
- 📁 **File browser with autocomplete** - search and filter files as you type
- 💬 **@ File mentions** - reference files naturally in your commands
- ✏️ **Auto-open in editor** - selected files open directly in Cursor/VS Code
- 📦 Modern ES modules support
- 🔧 Hot reload development with tsx

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Cursor or VS Code (for file opening)

## 🐳 Development Environment

This project includes a **devcontainer configuration** for instant setup in GitHub Codespaces or VS Code Dev Containers:

### Using GitHub Codespaces (Recommended for Quick Start)

1. Click "Code" → "Create codespace on main"
2. Wait for the container to build (~30 seconds)
3. The `codebanger` command is automatically installed and ready to use!

**What happens automatically:**
- Docker container spins up with Node.js 20 and TypeScript tooling
- Dependencies are installed (`npm install`)
- Project is built (`npm run build`)
- Command is linked globally (`npm link`)

### Using VS Code Dev Containers (Local Docker)

1. Install Docker Desktop and the "Dev Containers" VS Code extension
2. Open the project in VS Code
3. Click "Reopen in Container" when prompted
4. The `codebanger` command will be ready after the container builds

### Why DevContainers?

- **Consistency** - Same environment for all contributors
- **Zero setup** - New team members can start coding immediately
- **Isolation** - Project dependencies don't conflict with your system
- **Reproducibility** - Works identically across all machines

The devcontainer uses Microsoft's official `typescript-node` image, which is maintained for security and includes common development tools. For projects requiring specialized dependencies, this could be customized with a Dockerfile.

## 🚀 Installation

### Manual Installation (Without DevContainers)

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Install globally (optional):

```bash
npm link
```

Now you can use `codebanger` from anywhere!

> **Note:** If using GitHub Codespaces or Dev Containers, these steps happen automatically.

## 💻 Usage

### Interactive Mode (Default) - Real-Time @ Mentions

Run the tool for inline file autocomplete:

```bash
codebanger
```

**How it works (just like Cursor chat!):**
1. Start typing your command naturally
2. Press **@** → autocomplete dropdown appears **instantly**
3. Continue typing to filter files (e.g., "@src/")
4. Use arrow keys and Enter to select file
5. Selected file inserts into your command at the @ position
6. Keep typing or add more "@" mentions
7. Press Enter when done → files can be opened in Cursor/VS Code

**Example workflow:**
```
💬 Your command: Add error handling to @
  [@ triggers instant dropdown]
  [Type "index" to filter]
  [Select "src/index.ts"]
💬 Your command: Add error handling to @src/index.ts
  [Keep typing or press Enter]
```

**Multiple files:**
```
💬 Your command: Refactor @ and @ to use async/await
  [First @ opens dropdown → select file1]
  [Second @ opens dropdown → select file2]
💬 Your command: Refactor @src/index.ts and @src/utils.ts to use async/await
```

### Quick File Browser

Browse and open files without typing commands:

```bash
codebanger open
```

This gives you a quick file picker that:
- Shows all project files (filtered by type)
- Lets you search as you type
- Opens files directly in your editor
- Lets you open multiple files in succession

## 📁 Project Structure

```
├── .devcontainer/
│   └── devcontainer.json # Docker container config for Codespaces
├── src/
│   └── index.ts          # Main application entry point
├── dist/                 # Compiled JavaScript output
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Legacy Select Mode

Original mode for selecting files first:

```bash
codebanger select
```

## 🛠️ Development

### Run in development mode (with hot reload)

```bash
npm run dev
```

### Build the project

```bash
npm run build
```

### Watch for changes during development

```bash
npm run watch
```

### Clean build artifacts

```bash
npm run clean
```

## 📜 Available Scripts

- `npm run dev` - Run in development mode with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application (same as `codebanger`)
- `npm run watch` - Watch for changes and recompile
- `npm run clean` - Remove the dist directory

## 📦 Dependencies

### Runtime Dependencies
- `commander` - Command-line interface framework
- `chalk` - Terminal string styling
- `inquirer` - Interactive command line prompts
- `inquirer-autocomplete-prompt` - Autocomplete functionality
- `@inquirer/prompts` - Modern inquirer prompts

### Development Dependencies
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution engine for development
- `@types/node` - TypeScript definitions for Node.js
- `@types/inquirer` - TypeScript definitions for inquirer
- `rimraf` - Cross-platform rm -rf utility

## 🎯 How It Works

The tool scans your project directory and:
1. Finds all relevant source files (`.ts`, `.js`, `.tsx`, `.jsx`, `.py`, `.css`, `.html`, `.json`, `.md`)
2. Excludes `node_modules`, `dist`, and `.git` directories
3. Provides fuzzy search/filtering as you type
4. Opens selected files in your preferred editor (tries `cursor`, then `code`, then system default)

## 🔧 Supported File Types

- TypeScript/JavaScript: `.ts`, `.tsx`, `.js`, `.jsx`
- Python: `.py`
- Styles: `.css`
- Markup: `.html`, `.md`
- Config: `.json`

Add more file types by editing the `getAllFiles()` function in `src/index.ts`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## License

MIT
