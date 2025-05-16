import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { isLoggedIn, login } from '../core/auth';
import axios from 'axios';
import { DEFAULT_API_URL } from '../core/config';

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Authenticate with Opsctrl Cloud')
    .action(async () => {
      console.log('[CLI INIT] Registering CLI commands...');

      try {
        if (isLoggedIn()) {
          const spinner = ora('Starting login flow...').start();

          spinner.warn(
            'Already logged in. If you want to re-authenticate, delete ~/.opsctrl/credentials.json.',
          );

          process.exit(0);
        }

        const { data } = await axios.post(`${DEFAULT_API_URL}/auth/device/initiate`);

        const { login_code, url } = data;

        console.log(`\n🔐 Open the link below in your browser to log in:`);

        console.log(chalk.cyanBright(url));

        console.log(`\nPaste the code: ${chalk.bold(login_code)}\n`);

        const spinner = ora('Waiting for authentication...').start();

        spinner.text = 'Waiting for authentication...';
        await login(spinner, login_code);
        spinner.succeed('Logged in successfully.');
      } catch (err: any) {
        console.log(err);

        const spinner = ora('Waiting for authentication...').start();

        spinner.fail('Login failed.');
        console.error(chalk.red(err.message || err));
        process.exit(1);
      }
    });
}
