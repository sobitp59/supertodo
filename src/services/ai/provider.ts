/**
 * Unified AI Provider interface
 * All providers (Ollama, OpenAI, Groq, Anthropic) implement the same chat completions format.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderConfig {
  type: 'ollama' | 'openai' | 'groq' | 'anthropic' | 'custom';
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string }> = {
  ollama: { baseUrl: 'http://localhost:11434/v1' },
  openai: { baseUrl: 'https://api.openai.com/v1' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1' },
};

export function getDefaultBaseUrl(type: string): string {
  return PROVIDER_DEFAULTS[type]?.baseUrl || '';
}

/**
 * Send a chat completion request to any OpenAI-compatible endpoint
 */
export async function chatCompletion(
  config: AIProviderConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<AIResponse> {
  const baseUrl = config.baseUrl || getDefaultBaseUrl(config.type);
  const isAnthropic = config.type === 'anthropic';

  // Anthropic uses a different API format
  if (isAnthropic) {
    return anthropicCompletion(config, messages, options);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || config.model,
    usage: data.usage,
  };
}

/**
 * Anthropic-specific completion (different API format)
 */
async function anthropicCompletion(
  config: AIProviderConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<AIResponse> {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
      system: systemMsg?.content || '',
      messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    model: data.model || config.model,
    usage: data.usage ? { prompt_tokens: data.usage.input_tokens, completion_tokens: data.usage.output_tokens } : undefined,
  };
}
