import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { isLoggedIn, login } from '../core/auth';
import axios from 'axios';
import { DEFAULT_API_URL } from '../core/config';
import { delay, printErrorAndExit } from '../utils/utils';

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Authenticate with Opsctrl Cloud')
    .action(async () => {
      try {
        if (isLoggedIn()) {
          const spinner = ora('Starting login flow...').start();

          spinner.warn('There is an active session. You can log out using `opsctrl logout`.');

          process.exit(0);
        }

        const { data } = await axios.post(`${DEFAULT_API_URL}/auth/device/initiate`);

        const { login_code, url } = data;

        console.log(`\n 🔐 Open the link below in your browser to log in:`);

        console.log(chalk.cyanBright(url));

        console.log(`\n Paste the code: ${chalk.bold(login_code)}\n`);

        const spinner = ora('Waiting for authentication...').start();

        spinner.text = '\n Waiting for authentication...';

        await login(spinner, login_code);
        spinner.succeed('Logged in successfully.');
      } catch (err: any) {
        if (err.cause.code === 'ECONNREFUSED') {
          printErrorAndExit(
            'Could not connect to the authentication server. Please check your network connection.',
          );
        }

        printErrorAndExit('\n Failed to initiate login. Please try again.', 0);
      }
    });
}
