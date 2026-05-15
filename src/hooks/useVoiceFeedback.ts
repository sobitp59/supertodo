/**
 * useVoiceFeedback - Watches for new AI assistant messages and speaks them aloud.
 * Only speaks responses that were triggered during the current voice session.
 */
import { useEffect, useRef } from 'react';
import { useStore } from '../store';

interface UseVoiceFeedbackOptions {
  enabled: boolean;
  speak: (text: string) => void;
}

/**
 * Strips markdown/formatting from text for cleaner TTS output
 */
function cleanTextForSpeech(text: string): string {
  return text
    // Remove markdown bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links, keep text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    // Remove bullet points
    .replace(/^[\-\*]\s+/gm, '')
    // Remove numbered list markers
    .replace(/^\d+\.\s+/gm, '')
    // Collapse multiple newlines
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    // Clean up extra spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Truncate long responses for speech (nobody wants to hear a 5-paragraph essay)
 */
function truncateForSpeech(text: string, maxLength: number = 300): string {
  if (text.length <= maxLength) return text;
  
  // Try to cut at a sentence boundary
  const truncated = text.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  
  if (lastSentence > maxLength * 0.5) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  return truncated + '...';
}

export function useVoiceFeedback({ enabled, speak }: UseVoiceFeedbackOptions) {
  const chatHistory = useStore((s) => s.chatHistory);
  const lastSpokenIdRef = useRef<string | null>(null);
  const enabledRef = useRef(enabled);

  // Track enabled state
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabledRef.current) return;
    if (chatHistory.length === 0) return;

    const lastMessage = chatHistory[chatHistory.length - 1];

    // Only speak assistant messages that we haven't spoken yet
    if (
      lastMessage.role === 'assistant' &&
      lastMessage.id !== lastSpokenIdRef.current
    ) {
      lastSpokenIdRef.current = lastMessage.id;

      // Don't speak error messages from "no AI configured"
      if (lastMessage.content.startsWith('No AI provider configured')) return;
      if (lastMessage.content.startsWith('Error:')) return;

      const cleaned = cleanTextForSpeech(lastMessage.content);
      const speechText = truncateForSpeech(cleaned);

      if (speechText) {
        speak(speechText);
      }
    }
  }, [chatHistory, speak]);
}
