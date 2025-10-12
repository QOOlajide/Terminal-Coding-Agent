#!/usr/bin/env node
import { input as askInput } from '@inquirer/prompts';
import inquirer from 'inquirer';
import autocompletePrompt from 'inquirer-autocomplete-prompt';
import { Command } from 'commander';
import chalk from 'chalk';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Register the autocomplete prompt
inquirer.registerPrompt('autocomplete', autocompletePrompt);

// Function to get all files in the codebase
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      // Skip node_modules and dist directories
      if (file !== 'node_modules' && file !== 'dist') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Only include source files and config files
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
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

const program = new Command();

program
  .name('terminal-coding-agent')
  .description('A TypeScript terminal application')
  .version('1.0.0')
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
    const changes = await askInput({
      message: `What changes would you like to make to ${selectedFile}?`,
      default: ''
    });
    
    console.log(chalk.green(`Changes for ${selectedFile}: ${changes}`));
  });

program
  .command('interactive')
  .description('Interactive mode')
  .action(async () => {
    const name = await askInput({
      message: 'What is your name?',
      default: 'Anonymous'
    });

    console.log(chalk.cyan(`Hello, ${name}!`));
    console.log(chalk.blue('Interactive mode completed!'));
  });

program.parse();
