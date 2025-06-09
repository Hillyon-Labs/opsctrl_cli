import fs from 'fs';
import path from 'path';
import os from 'os';
import 'dotenv/config';
import chalk from 'chalk';
import { CredentialsFile } from '../common/interface/client.interface';
import { printErrorAndExit } from '../utils/utils';

export const CREDENTIALS_JSON_FILE = path.join(os.homedir(), '.opsctrl', 'credentials.json');
export const DEFAULT_API_URL = process.env.OPSCTRL_API_URL;

/**
 * Shape of the saved CLI credentials file
 */
export interface OpsctrlConfig {
  token: string;
  user_id: string;
  authenticated: boolean;
  first_name?: string;
}

/**
 * Load config from ~/.opsctrl/credentials.json
 */
export function loadConfig(): OpsctrlConfig {
  if (!fs.existsSync(CREDENTIALS_JSON_FILE)) {
    console.log('You are not logged in. Run `opsctrl login` to authenticate.', 0);
  }

  const raw = fs.readFileSync(CREDENTIALS_JSON_FILE, 'utf-8');
  const config: OpsctrlConfig = JSON.parse(raw);

  if (!config.token || !config.user_id) {
    printErrorAndExit('Invalid credentials file. Please re-run `opsctrl login`.');
  }

  return config;
}

export function saveConfig(config: OpsctrlConfig) {
  const dir = path.dirname(CREDENTIALS_JSON_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CREDENTIALS_JSON_FILE, JSON.stringify(config, null, 2));
}

/**
 *
 * @returns the local auth token from ~/.opsctrl/credentials.json
 */
export function getLocalAuthToken(): string {
  if (!fs.existsSync(CREDENTIALS_JSON_FILE)) {
    console.error(chalk.red('Opsctrl is not authenticated. Run `opsctrl login` to authenticate.'));
    process.exit(1);
  }

  const credentialsFile: CredentialsFile = JSON.parse(
    fs.readFileSync(CREDENTIALS_JSON_FILE, 'utf-8'),
  );

  if (!credentialsFile.token) {
    console.error(chalk.red('No token found in credentials file. Please re-run `opsctrl login`.'));
    process.exit(1);
  }

  return credentialsFile.token;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}
