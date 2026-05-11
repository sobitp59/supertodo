/**
 * Chat hook - manages conversation, AI calls, and action execution
 */
import { useState, useCallback } from 'react';
import { useStore, type ChatAction } from '../store';
import { chatCompletion, type AIProviderConfig } from '../services/ai';
import { buildChatMessages } from '../services/ai/chatContext';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const { chatHistory, addChatMessage, settings } = useStore();

  const sendMessage = useCallback(async (text: string) => {
    const ai = settings.ai;
    if (!ai || ai.provider === 'none' || !ai.model) {
      // Add user message
      addChatMessage({ id: uuidv4(), role: 'user', content: text, timestamp: Date.now() });
      // Add error response
      addChatMessage({
        id: uuidv4(), role: 'assistant', timestamp: Date.now(),
        content: 'No AI provider configured. Go to Settings → AI to set up Ollama or add an API key.',
      });
      return;
    }

    // Add user message to history
    addChatMessage({ id: uuidv4(), role: 'user', content: text, timestamp: Date.now() });

    setIsLoading(true);

    try {
      const config: AIProviderConfig = {
        type: ai.provider,
        baseUrl: ai.baseUrl || '',
        apiKey: ai.apiKey || undefined,
        model: ai.model,
      };

      // Build messages with data context
      const history = chatHistory.map(m => ({ role: m.role, content: m.content }));
      const messages = buildChatMessages(text, history);

      const response = await chatCompletion(config, messages, { temperature: 0.7, maxTokens: 1500 });

      // Parse response - try JSON format first
      let responseText = response.content;
      let actions: ChatAction[] = [];

      try {
        const parsed = JSON.parse(response.content);
        if (parsed.text) {
          responseText = parsed.text;
          if (Array.isArray(parsed.actions)) {
            actions = await executeActions(parsed.actions);
          }
        }
      } catch {
        // Not JSON, just use raw text (model didn't follow format)
        // Try to extract JSON from the response
        const jsonMatch = response.content.match(/\{[\s\S]*"text"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            responseText = parsed.text || response.content;
            if (Array.isArray(parsed.actions)) {
              actions = await executeActions(parsed.actions);
            }
          } catch {
            // Give up, use raw text
          }
        }
      }

      addChatMessage({
        id: uuidv4(),
        role: 'assistant',
        content: responseText,
        actions: actions.length > 0 ? actions : undefined,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      addChatMessage({
        id: uuidv4(), role: 'assistant', timestamp: Date.now(),
        content: `Error: ${err.message || 'Failed to get response'}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatHistory, settings.ai, addChatMessage]);

  return { sendMessage, isLoading };
}

/**
 * Execute actions returned by the AI
 */
async function executeActions(rawActions: any[]): Promise<ChatAction[]> {
  const results: ChatAction[] = [];
  const state = useStore.getState();

  for (const raw of rawActions) {
    if (!raw.action || !raw.params) continue;

    const action: ChatAction = {
      action: raw.action,
      params: raw.params,
      success: false,
      resultText: '',
    };

    try {
      switch (raw.action) {
        case 'add_todo': {
          const { text, date, categoryId } = raw.params;
          if (text) {
            const catId = categoryId || state.activeCategoryId || state.categories[0]?.id;
            const todoDate = date || format(new Date(), 'yyyy-MM-dd');
            if (catId) {
              state.addTodo(catId, text, todoDate);
              action.success = true;
              action.resultText = `Added todo: "${text}" for ${todoDate}`;
            }
          }
          break;
        }
        case 'complete_todo': {
          const { id } = raw.params;
          const todo = state.todos.find(t => t.id === id);
          if (todo && !todo.completed) {
            state.toggleTodo(id);
            action.success = true;
            action.resultText = `Completed: "${todo.text}"`;
          } else if (todo?.completed) {
            action.success = true;
            action.resultText = `Already completed: "${todo.text}"`;
          }
          break;
        }
        case 'add_note': {
          const { title, categoryId } = raw.params;
          if (title) {
            const catId = categoryId || state.activeNoteCategoryId || state.noteCategories[0]?.id;
            if (catId) {
              state.addNote(catId, title);
              action.success = true;
              action.resultText = `Created note: "${title}"`;
            }
          }
          break;
        }
        case 'update_goal_progress': {
          const { id, progress } = raw.params;
          const goal = state.yearlyGoals.find(g => g.id === id);
          if (goal && typeof progress === 'number') {
            state.updateYearlyGoal(id, { progress: Math.min(100, Math.max(0, progress)) });
            action.success = true;
            action.resultText = `Updated "${goal.title}" to ${progress}%`;
          }
          break;
        }
        case 'update_job_status': {
          const { id, status } = raw.params;
          const job = state.jobApplications.find(j => j.id === id);
          if (job && status) {
            state.updateJobApplication(id, { status });
            action.success = true;
            action.resultText = `Updated ${job.company} to "${status}"`;
          }
          break;
        }
        case 'add_challenge_entry': {
          const { challengeId, date, status } = raw.params;
          const challenge = state.challenges.find(c => c.id === challengeId);
          if (challenge && date && status) {
            state.setChallengeDay(challengeId, date, status);
            action.success = true;
            action.resultText = `Marked ${challenge.emoji} "${challenge.name}" as ${status}`;
          }
          break;
        }
        default:
          action.resultText = `Unknown action: ${raw.action}`;
      }
    } catch (err: any) {
      action.success = false;
      action.resultText = `Failed: ${err.message}`;
    }

    if (!action.resultText) {
      action.resultText = `${raw.action} — no matching data found`;
    }

    results.push(action);
  }

  return results;
}
