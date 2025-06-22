import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { isLoggedIn, login } from '../core/auth';
import axios from 'axios';
import { DEFAULT_API_URL } from '../core/config';
import { openBrowser, printErrorAndExit } from '../utils/utils';

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Authenticate with Opsctrl Cloud')
    .option('--no-browser', 'Skip opening browser automatically')
    .action(async (options) => {
      try {
        if (isLoggedIn()) {
          const spinner = ora('Starting login flow...').start();

          spinner.warn('There is an active session. You can log out using `opsctrl logout`.');

          process.exit(0);
        }

        const { data } = await axios.post(`${DEFAULT_API_URL}/auth/device/initiate`);

        const { login_code, url } = data;

        console.log(`\n 🔐 Authenticating with Opsctrl Cloud...\n`);

        // Auto-open browser unless --no-browser flag is used
        if (options.browser !== false) {
          try {
            console.log('Opening browser...');
            openBrowser(url);
            console.log(`${chalk.green('✓')} Browser opened successfully`);
          } catch (openError) {
            console.log(`${chalk.yellow('⚠')} Could not open browser automatically`);
            console.log(`Please manually open: ${chalk.cyanBright(url)}`);
          }
        } else {
          console.log(`Open this link in your browser:`);
          console.log(chalk.cyanBright(url));
        }

        console.log(`\n${chalk.dim('Device code:')} ${chalk.bold(login_code)}`);
        console.log(`${chalk.dim('The code should auto-fill in your browser')}\n`);

        const spinner = ora('Waiting for authentication...').start();

        spinner.text = '\n Waiting for authentication...';

        await login(spinner, login_code);
        spinner.succeed('Logged in successfully.');
      } catch (err: any) {
        if (err.cause?.code === 'ECONNREFUSED') {
          printErrorAndExit(
            'Could not connect to the authentication server. Please check your network connection.',
          );
        }

        printErrorAndExit('\n Failed to initiate login. Please try again.');
      }
    });
}
