import { getAuthToken, getApiUrl } from './auth.js';

// Make authenticated API request
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiUrl = getApiUrl();
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers
  });

  return response;
}

// Execute Gemini request through backend
export async function executeRequest(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gemini-3.0'
): Promise<{ content: string; tokensUsed: number; cost: number; usage?: any }> {
  const response = await apiRequest('/api/execute', {
    method: 'POST',
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      model
    })
  });

  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 402) {
      throw new Error(`Subscription required: ${error.message}\nUpgrade at: ${error.renewUrl || error.upgradeUrl}`);
    }
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded: ${error.message}\n${error.upgradeUrl ? 'Upgrade at: ' + error.upgradeUrl : ''}`);
    }

    throw new Error(error.message || 'Request failed');
  }

  return await response.json();
}

// Get usage stats
export async function getUsageStats(): Promise<any> {
  const response = await apiRequest('/api/execute/usage', {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error('Failed to get usage stats');
  }

  return await response.json();
}

// Poll for authentication
export async function pollForAuth(token: string, maxAttempts: number = 60): Promise<string> {
  const apiUrl = getApiUrl();
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      const response = await fetch(`${apiUrl}/api/auth/poll/${token}`);
      const data = await response.json();

      if (data.authenticated && data.token) {
        return data.token;
      }
    } catch (error) {
      // Continue polling
    }
  }

  throw new Error('Authentication timeout - magic link was not clicked');
}

// Initiate CLI login
export async function initiateCliLogin(email: string, deviceName?: string): Promise<{ magicUrl: string; pollToken: string }> {
  const apiUrl = getApiUrl();
  
  const response = await fetch(`${apiUrl}/api/auth/cli-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, deviceName })
  });

  if (!response.ok) {
    throw new Error('Failed to initiate login');
  }

  return await response.json();
}

