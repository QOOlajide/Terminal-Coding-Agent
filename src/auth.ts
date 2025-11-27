import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.codebanger');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface Config {
  authToken?: string;
  email?: string;
  apiUrl?: string;
}

// Ensure config directory exists
function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// Read config file
export function readConfig(): Config {
  ensureConfigDir();
  
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const data = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config:', error);
    return {};
  }
}

// Write config file
export function writeConfig(config: Config): void {
  ensureConfigDir();
  
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing config:', error);
    throw error;
  }
}

// Get auth token
export function getAuthToken(): string | null {
  const config = readConfig();
  return config.authToken || null;
}

// Save auth token
export function saveAuthToken(token: string, email: string): void {
  const config = readConfig();
  config.authToken = token;
  config.email = email;
  writeConfig(config);
}

// Clear auth token (logout)
export function clearAuthToken(): void {
  const config = readConfig();
  delete config.authToken;
  delete config.email;
  writeConfig(config);
}

// Get API URL
export function getApiUrl(): string {
  const config = readConfig();
  return config.apiUrl || process.env.CODEBANGER_API_URL || 'http://localhost:3000';
}

// Check if authenticated
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

// Get user info
export function getUserInfo(): { email?: string } {
  const config = readConfig();
  return {
    ...(config.email ? { email: config.email } : {})
  };
}

