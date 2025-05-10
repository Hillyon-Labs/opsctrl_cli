import fs from "fs"
import path from "path"
import os from "os"

export const CONFIG_FILE = path.join(
  os.homedir(),
  ".opsctrl",
  "credentials.json"
)
export const DEFAULT_API_URL = "https://api.opsctrl.dev"

/**
 * Shape of the saved CLI credentials file
 */
export interface OpsctrlConfig {
  access_token: string
  org_id: string
  expires_at?: string
}

/**
 * Load config from ~/.opsctrl/credentials.json
 */
export function loadConfig(): OpsctrlConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error(
      "You are not logged in. Run `opsctrl login` to authenticate."
    )
  }

  const raw = fs.readFileSync(CONFIG_FILE, "utf-8")
  const config: OpsctrlConfig = JSON.parse(raw)

  if (!config.access_token || !config.org_id) {
    throw new Error("Invalid credentials file. Please re-run `opsctrl login`.")
  }

  return config
}

/**
 * Save token config to ~/.opsctrl/credentials.json
 */
export function saveConfig(config: OpsctrlConfig) {
  const dir = path.dirname(CONFIG_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  return Date.now() > new Date(expiresAt).getTime()
}
