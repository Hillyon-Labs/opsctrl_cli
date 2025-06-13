// core/auth.ts
import axios from 'axios';
import chalk from 'chalk';
import { DEFAULT_API_URL, saveConfig, loadConfig, isTokenExpired, OpsctrlConfig } from './config';
import { printErrorAndExit, waitUntil } from '../utils/utils';
import { Ora } from 'ora';

export async function login(spinner: Ora, login_code: string): Promise<OpsctrlConfig> {
  const result = await waitUntil(() => claimAuthToken(login_code), 30000, 2000);

  if (!result) {
    spinner.fail('\n Login timed out. Please try again.');
    printErrorAndExit('\n Login timed out. Please try again.', 0);
  }

  saveConfig(result);
  console.log(chalk.green(`✅ Welcome to Opsctrl ${result.first_name} !!!`));
  return result;
}

export function isLoggedIn(): boolean {
  try {
    const config = loadConfig();
    return !!config.token;
  } catch {
    return false;
  }
}

export async function claimAuthToken(login_code: string): Promise<OpsctrlConfig> {
  try {
    const response = await axios.get(
      `${DEFAULT_API_URL}/auth/device/status?login_code=${login_code}`,
    );

    return response.data;
  } catch (err: any) {
    printErrorAndExit(
      '\n Failed to claim auth token. Please check your network connection and try again.',
    );
  }
}
