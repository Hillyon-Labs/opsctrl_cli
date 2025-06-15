#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { registerLoginCommand } from './commands/login';
import { registerDiagnoseCommand } from './commands/diagnose';
import 'dotenv/config';
import { registerLogoutCommand } from './commands/logout';
const program = new Command();

// Optional: check for updates
program.showHelpAfterError();

registerLoginCommand(program);
registerDiagnoseCommand(program);
registerLogoutCommand(program);

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err: any) {
    console.error(chalk.redBright(`❌ Unexpected error: ${err.message}`));
    process.exit(1);
  }
}

main();
