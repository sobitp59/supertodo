/**
 * Builds a dynamic system prompt with the user's current data context
 */
import { useStore } from '../../store';
import { format } from 'date-fns';
import type { ChatMessage } from './provider';

export function buildChatSystemPrompt(): string {
  const state = useStore.getState();
  const today = format(new Date(), 'yyyy-MM-dd');
  const dayName = format(new Date(), 'EEEE');

  // Today's todos
  const todayTodos = state.todos.filter(t => t.date === today && !t.parentId);
  const completedToday = todayTodos.filter(t => t.completed);
  const pendingToday = todayTodos.filter(t => !t.completed);

  // Overdue
  const overdue = state.todos.filter(t => t.date < today && !t.completed && !t.parentId);

  // Categories
  const categories = state.categories.map(c => c.name).join(', ');

  // Challenges
  const activeChallenges = state.challenges.filter(c => !c.isArchived);

  // Goals
  const goals = state.yearlyGoals;

  // Jobs
  const jobs = state.jobApplications;

  // Notes (just titles)
  const recentNotes = state.notes.slice(-10);

  let prompt = `You are SuperTodo AI, a personal productivity assistant built into a desktop app.
Today is ${today} (${dayName}). User: ${state.settings.userName}.

YOUR CAPABILITIES:
- Answer questions about the user's todos, goals, jobs, challenges, and notes
- Execute actions (create todos, update goals, etc.) by including a JSON actions array in your response
- Give productivity advice based on actual data
- Be concise and helpful. Use the user's real data, never hallucinate items that don't exist.

RESPONSE FORMAT:
Always respond with valid JSON in this exact format:
{"text": "Your message here", "actions": []}

For actions, use these formats:
- {"action": "add_todo", "params": {"text": "...", "date": "${today}", "categoryId": "${state.activeCategoryId || ''}"}}
- {"action": "complete_todo", "params": {"id": "..."}}
- {"action": "add_note", "params": {"title": "...", "categoryId": "${state.activeNoteCategoryId || ''}"}}
- {"action": "update_goal_progress", "params": {"id": "...", "progress": 50}}
- {"action": "update_job_status", "params": {"id": "...", "status": "interview"}}
- {"action": "add_challenge_entry", "params": {"challengeId": "...", "date": "${today}", "status": "success"}}

If no action is needed, return an empty actions array.

--- USER DATA SNAPSHOT ---

CATEGORIES: ${categories}

TODAY'S TODOS (${pendingToday.length} pending, ${completedToday.length} done):
${pendingToday.length > 0 ? pendingToday.map(t => `- [ ] "${t.text}" (${state.categories.find(c => c.id === t.categoryId)?.name || 'Unknown'}) [id:${t.id}]`).join('\n') : '(none pending)'}
${completedToday.length > 0 ? `\nCOMPLETED TODAY:\n${completedToday.map(t => `- [x] "${t.text}"`).join('\n')}` : ''}`;

  if (overdue.length > 0) {
    prompt += `\n\nOVERDUE (${overdue.length} items):
${overdue.slice(0, 8).map(t => `- "${t.text}" (due: ${t.date}) [id:${t.id}]`).join('\n')}`;
  }

  if (activeChallenges.length > 0) {
    prompt += `\n\nACTIVE CHALLENGES:`;
    activeChallenges.forEach(c => {
      const successDays = Object.values(c.entries).filter(e => e === 'success').length;
      const totalDays = Object.keys(c.entries).length;
      prompt += `\n- ${c.emoji} "${c.name}" — ${successDays}/${totalDays || c.targetDays} days [id:${c.id}]`;
    });
  }

  if (goals.length > 0) {
    prompt += `\n\nYEARLY GOALS (${new Date().getFullYear()}):`;
    goals.filter(g => g.year === new Date().getFullYear()).forEach(g => {
      prompt += `\n- "${g.title}" (${g.category}) — ${g.progress}% [id:${g.id}]`;
    });
  }

  if (jobs.length > 0) {
    prompt += `\n\nJOB APPLICATIONS:`;
    jobs.forEach(j => {
      prompt += `\n- ${j.company} — ${j.role} (${j.status}) [id:${j.id}]`;
    });
  }

  if (recentNotes.length > 0) {
    prompt += `\n\nRECENT NOTES:`;
    recentNotes.forEach(n => {
      prompt += `\n- "${n.title}" (${format(new Date(n.updatedAt), 'MMM d')})`;
    });
  }

  prompt += `\n\n--- END DATA ---`;

  return prompt;
}

export function buildChatMessages(userMessage: string, history: { role: 'user' | 'assistant'; content: string }[]): ChatMessage[] {
  const systemPrompt = buildChatSystemPrompt();

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add recent history (last 10 messages for context window)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}
