/**
 * Model catalog - recommended models organized by hardware tier
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'groq' | 'anthropic';
  size: string; // human-readable size
  ramRequired: number; // GB of RAM needed
  description: string;
  tier: 'low' | 'mid' | 'high';
}

// Models available for local Ollama installation
export const OLLAMA_MODELS: ModelInfo[] = [
  { id: 'gemma3:1b', name: 'Gemma 3 1B', provider: 'ollama', size: '1.0 GB', ramRequired: 4, description: 'Ultra-fast, lightweight — great for quick brainstorming', tier: 'low' },
  { id: 'phi4-mini', name: 'Phi-4 Mini', provider: 'ollama', size: '2.5 GB', ramRequired: 6, description: 'Reasoning-focused, compact Microsoft model', tier: 'low' },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', provider: 'ollama', size: '2.0 GB', ramRequired: 6, description: 'Meta all-rounder, good quality/speed balance', tier: 'mid' },
  { id: 'gemma3:4b', name: 'Gemma 3 4B', provider: 'ollama', size: '3.3 GB', ramRequired: 8, description: 'Best balance — recommended for most users', tier: 'mid' },
  { id: 'qwen3:4b', name: 'Qwen 3 4B', provider: 'ollama', size: '2.8 GB', ramRequired: 8, description: 'Strong multilingual support, fast', tier: 'mid' },
  { id: 'llama3.3:8b', name: 'Llama 3.3 8B', provider: 'ollama', size: '5.0 GB', ramRequired: 12, description: 'High-quality output, needs more RAM', tier: 'high' },
  { id: 'qwen3:8b', name: 'Qwen 3 8B', provider: 'ollama', size: '5.2 GB', ramRequired: 12, description: 'Excellent quality, great for detailed maps', tier: 'high' },
  { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B', provider: 'ollama', size: '5.0 GB', ramRequired: 12, description: 'Chain-of-thought reasoning, thorough', tier: 'high' },
];

// Cloud models available via BYOK
export const CLOUD_MODELS: ModelInfo[] = [
  // OpenAI
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', size: 'Cloud', ramRequired: 0, description: 'Fast, cheap, great quality', tier: 'mid' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', size: 'Cloud', ramRequired: 0, description: 'Best overall quality', tier: 'high' },
  // Groq (fast inference)
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', provider: 'groq', size: 'Cloud', ramRequired: 0, description: 'Blazing fast via Groq, excellent quality', tier: 'high' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Groq)', provider: 'groq', size: 'Cloud', ramRequired: 0, description: 'Fast and free tier friendly', tier: 'mid' },
  // Anthropic
  { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', provider: 'anthropic', size: 'Cloud', ramRequired: 0, description: 'Fast, concise, great for structured output', tier: 'mid' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', size: 'Cloud', ramRequired: 0, description: 'Best reasoning and creativity', tier: 'high' },
];

export function getModelById(id: string): ModelInfo | undefined {
  return [...OLLAMA_MODELS, ...CLOUD_MODELS].find(m => m.id === id);
}

export function getRecommendedModel(ramGB: number): ModelInfo {
  if (ramGB >= 12) return OLLAMA_MODELS.find(m => m.id === 'qwen3:8b')!;
  if (ramGB >= 8) return OLLAMA_MODELS.find(m => m.id === 'gemma3:4b')!;
  return OLLAMA_MODELS.find(m => m.id === 'gemma3:1b')!;
}
