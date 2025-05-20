#!/usr/bin/env node
import { Command } from 'commander';
import updateNotifier from 'update-notifier';
import pkg from '../package.json';
import chalk from 'chalk';
import { registerLoginCommand } from './commands/login';

const program = new Command();

// Optional: check for updates
updateNotifier({ pkg }).notify();

registerLoginCommand(program);

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err: any) {
    console.error(chalk.redBright(`❌ Unexpected error: ${err.message}`));
    process.exit(1);
  }
}

main();
