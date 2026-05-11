/**
 * Prompt templates for mindmap AI operations
 */

import type { ChatMessage } from './provider';
import type { MindmapNode } from '../../store';

const SYSTEM_PROMPT = `You are a creative brainstorming assistant integrated into a mindmap application. 
Your job is to help users expand their ideas by generating relevant, concise child nodes for mindmaps.
ALWAYS respond with valid JSON. Never include explanations outside the JSON.
Each idea should be short (2-5 words max) and directly relevant to the parent concept.`;

/**
 * Generate child nodes for a given parent
 */
export function buildGenerateChildrenPrompt(
  parentText: string,
  siblingTexts: string[],
  ancestorPath: string[]
): ChatMessage[] {
  const context = ancestorPath.length > 0 
    ? `Context path: ${ancestorPath.join(' → ')} → ${parentText}` 
    : `Root topic: ${parentText}`;
  
  const existing = siblingTexts.length > 0 
    ? `\nExisting children (don't repeat these): ${siblingTexts.join(', ')}` 
    : '';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${context}${existing}\n\nGenerate 5 child ideas for the node "${parentText}". Return ONLY a JSON array of strings:\n["idea1", "idea2", "idea3", "idea4", "idea5"]` },
  ];
}

/**
 * Generate a full mindmap structure from a title
 */
export function buildAutoGeneratePrompt(title: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Create a mindmap structure for: "${title}"

Generate 4 main branches, each with 2-3 children. Return ONLY valid JSON in this exact format:
{
  "branches": [
    { "text": "Branch 1", "children": ["Child A", "Child B", "Child C"] },
    { "text": "Branch 2", "children": ["Child D", "Child E"] },
    { "text": "Branch 3", "children": ["Child F", "Child G", "Child H"] },
    { "text": "Branch 4", "children": ["Child I", "Child J"] }
  ]
}` },
  ];
}

/**
 * Expand a node with more detailed sub-topics
 */
export function buildExpandPrompt(
  nodeText: string,
  parentContext: string,
  existingChildren: string[]
): ChatMessage[] {
  const existing = existingChildren.length > 0
    ? `\nAlready has: ${existingChildren.join(', ')}`
    : '';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Topic: "${nodeText}" (under "${parentContext}")${existing}\n\nExpand this node with 4-6 detailed sub-topics. Return ONLY a JSON array of strings:\n["subtopic1", "subtopic2", "subtopic3", "subtopic4"]` },
  ];
}

/**
 * Summarize a branch into a concise phrase
 */
export function buildSummarizePrompt(
  parentText: string,
  childNodes: MindmapNode[]
): ChatMessage[] {
  const nodeTexts = childNodes.map(n => n.text).join(', ');
  return [
    { role: 'system', content: 'You summarize groups of ideas into a single concise phrase. Respond with ONLY the summary text, no quotes, no JSON.' },
    { role: 'user', content: `The node "${parentText}" has these children: ${nodeTexts}\n\nSummarize all children into a single concise phrase (max 6 words):` },
  ];
}

/**
 * Suggest what's missing from a mindmap
 */
export function buildSuggestMissingPrompt(
  title: string,
  allNodeTexts: string[]
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Mindmap title: "${title}"\nCurrent nodes: ${allNodeTexts.join(', ')}\n\nWhat important topics are missing? Suggest 3-5 additions. Return ONLY a JSON array of strings:\n["missing1", "missing2", "missing3"]` },
  ];
}

/**
 * Parse AI response - extract JSON array from potentially messy response
 */
export function parseJsonArray(response: string): string[] {
  try {
    // Try direct parse first
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) return parsed.filter(s => typeof s === 'string');
    return [];
  } catch {
    // Try to extract JSON array from response text
    const match = response.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed.filter(s => typeof s === 'string');
      } catch {
        // fallback
      }
    }
    // Last resort: split by newlines/commas
    return response
      .split(/[\n,]/)
      .map(s => s.replace(/^[\s\-\d.•*"]+|["]+$/g, '').trim())
      .filter(s => s.length > 0 && s.length < 60);
  }
}

/**
 * Parse auto-generate response (branches with children)
 */
export function parseAutoGenerateResponse(response: string): { text: string; children: string[] }[] {
  try {
    const parsed = JSON.parse(response);
    if (parsed.branches && Array.isArray(parsed.branches)) {
      return parsed.branches.map((b: any) => ({
        text: b.text || '',
        children: Array.isArray(b.children) ? b.children.filter((c: any) => typeof c === 'string') : [],
      }));
    }
    return [];
  } catch {
    // Try to extract JSON object from response
    const match = response.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.branches) {
          return parsed.branches.map((b: any) => ({
            text: b.text || '',
            children: Array.isArray(b.children) ? b.children : [],
          }));
        }
      } catch {
        // give up
      }
    }
    return [];
  }
}
