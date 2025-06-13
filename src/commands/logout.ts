import { Command } from 'commander';
import { invalidateToken } from '../core/config';

export function registerLogoutCommand(program: Command) {
  program
    .command('logout')
    .description('Log out of Opsctrl Cloud')
    .action(() => {
      invalidateToken();
    });
}
