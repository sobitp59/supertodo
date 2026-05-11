/**
 * React hook for AI operations in the mindmap
 */
import { useState, useCallback } from 'react';
import { useStore, type MindmapNode } from '../store';
import {
  chatCompletion,
  type AIProviderConfig,
  buildGenerateChildrenPrompt,
  buildAutoGeneratePrompt,
  buildExpandPrompt,
  buildSummarizePrompt,
  buildSuggestMissingPrompt,
  parseJsonArray,
  parseAutoGenerateResponse,
} from '../services/ai';

export interface UseAIReturn {
  isGenerating: boolean;
  error: string | null;
  generateChildren: (mindmapId: string, nodeId: string) => Promise<void>;
  expandNode: (mindmapId: string, nodeId: string) => Promise<void>;
  autoGenerateMindmap: (mindmapId: string) => Promise<void>;
  summarizeBranch: (mindmapId: string, nodeId: string) => Promise<string | null>;
  suggestMissing: (mindmapId: string) => Promise<string[]>;
  clearError: () => void;
}

function getAIConfig(): AIProviderConfig | null {
  const state = useStore.getState();
  const ai = state.settings.ai;
  if (!ai || ai.provider === 'none') return null;

  return {
    type: ai.provider,
    baseUrl: ai.baseUrl || '',
    apiKey: ai.apiKey || undefined,
    model: ai.model || '',
  };
}

function getAncestorPath(nodes: MindmapNode[], nodeId: string): string[] {
  const path: string[] = [];
  let current = nodes.find(n => n.id === nodeId);
  while (current?.parentId) {
    current = nodes.find(n => n.id === current!.parentId);
    if (current) path.unshift(current.text);
  }
  return path;
}

export function useAI(): UseAIReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const generateChildren = useCallback(async (mindmapId: string, nodeId: string) => {
    const config = getAIConfig();
    if (!config) { setError('No AI provider configured. Go to Settings → AI.'); return; }

    setIsGenerating(true);
    setError(null);

    try {
      const state = useStore.getState();
      const mindmap = state.mindmaps.find(m => m.id === mindmapId);
      if (!mindmap) throw new Error('Mindmap not found');

      const node = mindmap.nodes.find(n => n.id === nodeId);
      if (!node) throw new Error('Node not found');

      const siblings = mindmap.nodes.filter(n => n.parentId === nodeId).map(n => n.text);
      const ancestors = getAncestorPath(mindmap.nodes, nodeId);
      const messages = buildGenerateChildrenPrompt(node.text, siblings, ancestors);

      const response = await chatCompletion(config, messages);
      const ideas = parseJsonArray(response.content);

      if (ideas.length === 0) throw new Error('AI returned no ideas. Try again.');

      // Add nodes to mindmap
      const { addMindmapNode } = useStore.getState();
      ideas.forEach((idea, i) => {
        const x = node.position.x + (i - Math.floor(ideas.length / 2)) * 180;
        const y = node.position.y + 140;
        addMindmapNode(mindmapId, idea, nodeId, { x, y });
      });
    } catch (err: any) {
      setError(err.message || 'AI generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const expandNode = useCallback(async (mindmapId: string, nodeId: string) => {
    const config = getAIConfig();
    if (!config) { setError('No AI provider configured. Go to Settings → AI.'); return; }

    setIsGenerating(true);
    setError(null);

    try {
      const state = useStore.getState();
      const mindmap = state.mindmaps.find(m => m.id === mindmapId);
      if (!mindmap) throw new Error('Mindmap not found');

      const node = mindmap.nodes.find(n => n.id === nodeId);
      if (!node) throw new Error('Node not found');

      const parentNode = mindmap.nodes.find(n => n.id === node.parentId);
      const existingChildren = mindmap.nodes.filter(n => n.parentId === nodeId).map(n => n.text);
      const messages = buildExpandPrompt(node.text, parentNode?.text || 'root', existingChildren);

      const response = await chatCompletion(config, messages);
      const ideas = parseJsonArray(response.content);

      if (ideas.length === 0) throw new Error('AI returned no ideas. Try again.');

      const { addMindmapNode } = useStore.getState();
      ideas.forEach((idea, i) => {
        const x = node.position.x + (i - Math.floor(ideas.length / 2)) * 160;
        const y = node.position.y + 130;
        addMindmapNode(mindmapId, idea, nodeId, { x, y });
      });
    } catch (err: any) {
      setError(err.message || 'AI expansion failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const autoGenerateMindmap = useCallback(async (mindmapId: string) => {
    const config = getAIConfig();
    if (!config) { setError('No AI provider configured. Go to Settings → AI.'); return; }

    setIsGenerating(true);
    setError(null);

    try {
      const state = useStore.getState();
      const mindmap = state.mindmaps.find(m => m.id === mindmapId);
      if (!mindmap) throw new Error('Mindmap not found');

      const messages = buildAutoGeneratePrompt(mindmap.title);
      const response = await chatCompletion(config, messages, { temperature: 0.8 });
      const branches = parseAutoGenerateResponse(response.content);

      if (branches.length === 0) throw new Error('AI returned no structure. Try again.');

      const { addMindmapNode } = useStore.getState();
      const rootNode = mindmap.nodes.find(n => n.id === mindmap.rootNodeId);
      const rootX = rootNode?.position.x ?? 400;
      const rootY = rootNode?.position.y ?? 100;

      branches.forEach((branch, bi) => {
        const branchX = rootX + (bi - Math.floor(branches.length / 2)) * 250;
        const branchY = rootY + 150;
        // Add branch node
        addMindmapNode(mindmapId, branch.text, mindmap.rootNodeId, { x: branchX, y: branchY });

        // We need to get the newly created node ID
        const updatedState = useStore.getState();
        const updatedMindmap = updatedState.mindmaps.find(m => m.id === mindmapId);
        const branchNode = updatedMindmap?.nodes.find(n => n.text === branch.text && n.parentId === mindmap.rootNodeId);

        if (branchNode) {
          branch.children.forEach((child, ci) => {
            const childX = branchX + (ci - Math.floor(branch.children.length / 2)) * 150;
            const childY = branchY + 130;
            addMindmapNode(mindmapId, child, branchNode.id, { x: childX, y: childY });
          });
        }
      });
    } catch (err: any) {
      setError(err.message || 'AI auto-generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const summarizeBranch = useCallback(async (mindmapId: string, nodeId: string): Promise<string | null> => {
    const config = getAIConfig();
    if (!config) { setError('No AI provider configured.'); return null; }

    setIsGenerating(true);
    setError(null);

    try {
      const state = useStore.getState();
      const mindmap = state.mindmaps.find(m => m.id === mindmapId);
      if (!mindmap) throw new Error('Mindmap not found');

      const node = mindmap.nodes.find(n => n.id === nodeId);
      if (!node) throw new Error('Node not found');

      const children = mindmap.nodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) throw new Error('No children to summarize');

      const messages = buildSummarizePrompt(node.text, children);
      const response = await chatCompletion(config, messages, { temperature: 0.3 });
      return response.content.trim().replace(/^["']|["']$/g, '');
    } catch (err: any) {
      setError(err.message || 'Summarization failed');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const suggestMissing = useCallback(async (mindmapId: string): Promise<string[]> => {
    const config = getAIConfig();
    if (!config) { setError('No AI provider configured.'); return []; }

    setIsGenerating(true);
    setError(null);

    try {
      const state = useStore.getState();
      const mindmap = state.mindmaps.find(m => m.id === mindmapId);
      if (!mindmap) throw new Error('Mindmap not found');

      const allTexts = mindmap.nodes.map(n => n.text);
      const messages = buildSuggestMissingPrompt(mindmap.title, allTexts);
      const response = await chatCompletion(config, messages);
      return parseJsonArray(response.content);
    } catch (err: any) {
      setError(err.message || 'Suggestion failed');
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    isGenerating,
    error,
    generateChildren,
    expandNode,
    autoGenerateMindmap,
    summarizeBranch,
    suggestMissing,
    clearError,
  };
}
