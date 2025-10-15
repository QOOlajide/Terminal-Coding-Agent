#!/usr/bin/env node
import inquirer from 'inquirer';
import autocompletePrompt from 'inquirer-autocomplete-prompt';
import { Command } from 'commander';
import chalk from 'chalk';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

// Register the autocomplete prompt
inquirer.registerPrompt('autocomplete', autocompletePrompt);

// Function to get all files in the codebase
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      // Skip node_modules and dist directories
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Include source files and config files
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json') || 
          file.endsWith('.md') || file.endsWith('.tsx') || file.endsWith('.jsx') ||
          file.endsWith('.css') || file.endsWith('.html') || file.endsWith('.py')) {
        arrayOfFiles.push(relative(process.cwd(), fullPath));
      }
    }
  });

  return arrayOfFiles;
}

// Function to search files - filters as user types
function searchFiles(answers: any, input: string = ''): Promise<string[]> {
  const files = getAllFiles(process.cwd());
  
  return new Promise((resolve) => {
    const filtered = input
      ? files.filter(file => file.toLowerCase().includes(input.toLowerCase()))
      : files;
    resolve(filtered);
  });
}

// Function to open file in editor
async function openInEditor(filePath: string): Promise<void> {
  const absolutePath = resolve(process.cwd(), filePath);
  
  if (!existsSync(absolutePath)) {
    console.log(chalk.red(`✗ File not found: ${filePath}`));
    return;
  }

  try {
    // Try multiple editor commands in order of preference
    const editors = [
      { cmd: 'cursor', args: `"${absolutePath}"` },
      { cmd: 'code', args: `"${absolutePath}"` },
      { cmd: 'start', args: `"" "${absolutePath}"` } // Windows default
    ];

    let opened = false;
    for (const editor of editors) {
      try {
        await execAsync(`${editor.cmd} ${editor.args}`);
        console.log(chalk.green(`✓ Opened ${chalk.cyan(filePath)} in editor`));
        opened = true;
        break;
      } catch (err) {
        // Try next editor
        continue;
      }
    }

    if (!opened) {
      console.log(chalk.yellow(`⚠ Could not open editor automatically. File path: ${absolutePath}`));
    }
  } catch (error) {
    console.log(chalk.red(`✗ Error opening file: ${error}`));
  }
}

// Smart input handler that detects @ and triggers autocomplete
async function smartInput(prompt: string): Promise<string> {
  return new Promise(async (resolve) => {
    let buffer = '';
    let cursorPos = 0;
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    // Function to redraw the line
    const redrawLine = () => {
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
      process.stdout.write(prompt + buffer);
      // Move cursor to correct position
      const currentPos = prompt.length + cursorPos;
      readline.cursorTo(process.stdout, currentPos);
    };

    // Initial prompt
    process.stdout.write(prompt);

    // Handle keypress events
    const stdin = process.stdin;
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding('utf8');

    const keyHandler = async (key: string) => {
      // Handle Ctrl+C
      if (key === '\u0003') {
        stdin.removeListener('data', keyHandler);
        if (stdin.isTTY) stdin.setRawMode(false);
        rl.close();
        process.exit();
      }

      // Handle Enter
      if (key === '\r' || key === '\n') {
        stdin.removeListener('data', keyHandler);
        if (stdin.isTTY) stdin.setRawMode(false);
        console.log();
        rl.close();
        resolve(buffer);
        return;
      }

      // Handle Backspace
      if (key === '\u007F' || key === '\b') {
        if (cursorPos > 0) {
          buffer = buffer.slice(0, cursorPos - 1) + buffer.slice(cursorPos);
          cursorPos--;
          redrawLine();
        }
        return;
      }

      // Handle arrow keys (escape sequences)
      if (key === '\u001B[D') { // Left arrow
        if (cursorPos > 0) cursorPos--;
        redrawLine();
        return;
      }
      if (key === '\u001B[C') { // Right arrow
        if (cursorPos < buffer.length) cursorPos++;
        redrawLine();
        return;
      }

      // Detect @ symbol
      if (key === '@') {
        // Pause raw mode /*
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.removeListener('data', keyHandler);
        stdin.pause();
        
        console.log(); // New line for autocomplete
        
        // Show autocomplete
        const fileAnswer = await inquirer.prompt([
          {
            type: 'autocomplete',
            name: 'file',
            message: chalk.blue('📁 Select file (type to filter):'),
            source: searchFiles,
            pageSize: 12
          }
        ]);

        const selectedFile = fileAnswer.file;
        
        // Insert the selected file at cursor position
        buffer = buffer.slice(0, cursorPos) + '@' + selectedFile + buffer.slice(cursorPos);
        cursorPos += selectedFile.length + 1; // +1 for the @ symbol
        
        // Resume input
        if (stdin.isTTY) stdin.setRawMode(true);
        stdin.resume();
        stdin.on('data', keyHandler);
        
        // Redraw the line with the inserted file
        redrawLine();
        return;
      }

      // Handle regular character input
      if (key.length === 1 && key >= ' ' && key <= '~') {
        buffer = buffer.slice(0, cursorPos) + key + buffer.slice(cursorPos);
        cursorPos++;
        redrawLine();
      }
    };

    stdin.on('data', keyHandler);
  });
}

// Interactive prompt with @ mentions for files
async function interactivePrompt(): Promise<void> {
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('  Codebanger - Interactive Mode') + '              ' + chalk.cyan('║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝'));
  console.log(chalk.gray('\nType your instructions. Type @ to instantly select files.'));
  console.log(chalk.gray('Type "exit" or "quit" to end the session.\n'));

  let continueLoop = true;

  while (continueLoop) {
    console.log(chalk.yellow('───────────────────────────────────────────────────────────'));
    
    // Get user input with smart @ detection
    const userInput = await smartInput(chalk.bold('💬 Your command: '));

    const trimmedInput = userInput.trim().toLowerCase();

    if (trimmedInput === 'exit' || trimmedInput === 'quit') {
      console.log(chalk.green('\n✓ Goodbye!'));
      continueLoop = false;
      break;
    }

    if (!userInput.trim()) {
      continue;
    }

    // Extract file references (everything after @ until space or end)
    const fileMatches = userInput.match(/@([^\s]+)/g);
    
    if (fileMatches && fileMatches.length > 0) {
      const referencedFiles = fileMatches.map(match => match.substring(1));
      
      console.log(chalk.green('\n✓ Command received:'));
      console.log(chalk.white(`  ${userInput}\n`));
      
      console.log(chalk.green('✓ Referenced files:'));
      referencedFiles.forEach((file, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${file}`));
      });
      console.log();

      // Ask if user wants to open the files in editor
      const shouldOpen = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'open',
          message: 'Open referenced file(s) in editor?',
          default: true
        }
      ]);

      if (shouldOpen.open) {
        console.log();
        for (const file of referencedFiles) {
          await openInEditor(file);
        }
        console.log();
      }

      console.log(chalk.gray('  💡 Command saved for processing\n'));
    } else {
      console.log(chalk.green('\n✓ Command received:'));
      console.log(chalk.white(`  ${userInput}\n`));
      console.log(chalk.gray('  💡 Tip: Use @ to reference files\n'));
    }
  }
}

const program = new Command();

program
  .name('codebanger')
  .description('A TypeScript terminal coding agent with @ file mentions')
  .version('1.0.0')
  .action(async () => {
    await interactivePrompt();
  });

program
  .command('open')
  .description('Quick file browser - select and open files in your editor')
  .action(async () => {
    console.log(chalk.cyan('\n📁 File Browser - Select files to open in editor\n'));
    
    let continueOpening = true;

    while (continueOpening) {
      const answers = await inquirer.prompt([
        {
          type: 'autocomplete',
          name: 'file',
          message: 'Select a file to open (start typing to filter):',
          source: searchFiles,
          pageSize: 10
        }
      ]);

      const selectedFile = answers.file;
      await openInEditor(selectedFile);

      const continueAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Open another file?',
          default: false
        }
      ]);

      continueOpening = continueAnswer.continue;
    }

    console.log(chalk.green('\n✓ Done!\n'));
  });

program
  .command('select')
  .description('Legacy mode: Select a file first, then describe changes')
  .action(async () => {
    // Use autocomplete prompt - shows suggestions as you type
    const answers = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'file',
        message: 'Select a file to modify (start typing to filter):',
        source: searchFiles,
        pageSize: 10
      }
    ]);

    const selectedFile = answers.file;
    console.log(chalk.green(`Selected file: ${selectedFile}`));
    
    // Ask for changes to the selected file
    const changeAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'changes',
        message: `What changes would you like to make to ${selectedFile}?`,
        default: ''
      }
    ]);
    
    console.log(chalk.green(`\n✓ Changes for ${selectedFile}:`));
    console.log(chalk.white(`  ${changeAnswer.changes}\n`));
  });

program.parse();
