import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class CoolestError extends Error {
  spinner?: Ora;
  showStack: boolean;

  constructor(message: string, options?: { spinner?: Ora; showStack?: boolean }) {
    super(message);
    this.name = 'CoolestError';
    this.spinner = options?.spinner;
    this.showStack = options?.showStack ?? false; // default: no stack trace
  }

  print(): void {
    const prefix = chalk.redBright('✖');

    if (this.spinner) {
      this.spinner.fail(`${prefix} ${this.message}`);
    } else {
      console.error(`${prefix} ${this.message}`);
    }

    if (this.showStack) {
      console.error(chalk.gray(this.stack));
    }
  }
}
