# Terminal Coding Agent

A TypeScript terminal application built with modern CLI tools.

## Features

- 🚀 TypeScript with strict type checking
- 🎨 Colored terminal output with chalk
- 💬 Interactive prompts with inquirer
- 📦 Modern ES modules support
- 🔧 Hot reload development with tsx

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Development

### Run in development mode (with hot reload)

```bash
npm run dev
```

### Build the project

```bash
npm run build
```

### Run the built application

```bash
npm start
```

### Watch for changes during development

```bash
npm run watch
```

## Usage

The application provides several commands:

### Hello Command

```bash
npm run dev hello --name "Your Name"
```

or with the built version:

```bash
npm start hello --name "Your Name"
```

### Interactive Mode

```bash
npm run dev interactive
```

This will start an interactive session where you can:
- Enter your name
- Choose your favorite color
- See colored output

## Project Structure

```
├── src/
│   └── index.ts          # Main application entry point
├── dist/                 # Compiled JavaScript output
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Available Scripts

- `npm run dev` - Run in development mode with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application
- `npm run watch` - Watch for changes and recompile
- `npm run clean` - Remove the dist directory

## Dependencies

### Runtime Dependencies
- `commander` - Command-line interface framework
- `chalk` - Terminal string styling
- `inquirer` - Interactive command line prompts

### Development Dependencies
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution engine for development
- `@types/node` - TypeScript definitions for Node.js
- `rimraf` - Cross-platform rm -rf utility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## License

MIT
