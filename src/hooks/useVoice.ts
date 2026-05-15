/**
 * Voice hook - Speech Recognition (STT) + Text-to-Speech (TTS)
 * Uses Web Speech API (SpeechRecognition + SpeechSynthesis)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useChat } from './useChat';
import { format } from 'date-fns';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export type VoiceCommandType = 
  | 'add_todo'
  | 'ask_ai'
  | 'navigate'
  | 'complete_todo'
  | 'unknown';

export interface VoiceCommand {
  type: VoiceCommandType;
  payload: string;
  raw: string;
}

export interface UseVoiceReturn {
  isListening: boolean;
  isSupported: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  processVoiceCommand: (transcript: string) => void;
}

/**
 * Parse natural language into a voice command
 */
function parseVoiceCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();

  // Add todo patterns
  const addTodoPatterns = [
    /^(?:add|create|new)\s+(?:a\s+)?(?:todo|task|item)\s*[:\-]?\s*(.+)/i,
    /^(?:remind me to|i need to|don't forget to)\s+(.+)/i,
    /^(?:todo|task)\s*[:\-]\s*(.+)/i,
  ];

  for (const pattern of addTodoPatterns) {
    const match = transcript.match(pattern);
    if (match) {
      return { type: 'add_todo', payload: match[1].trim(), raw: transcript };
    }
  }

  // Navigation patterns
  const navPatterns: [RegExp, string][] = [
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?todos?/i, 'todos'],
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?bookmarks?/i, 'bookmarks'],
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?notes?/i, 'notes'],
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?challenges?/i, 'challenges'],
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?goals?/i, 'goals'],
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?jobs?/i, 'jobs'],
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?(?:time\s*canvas|calendar|planner)/i, 'time-canvas'],
    [/^(?:go to|open|show|switch to)\s+(?:the\s+)?mind\s*map/i, 'mindmap'],
  ];

  for (const [pattern, mode] of navPatterns) {
    if (pattern.test(lower)) {
      return { type: 'navigate', payload: mode, raw: transcript };
    }
  }

  // Complete todo patterns
  const completePatterns = [
    /^(?:complete|finish|done|check off|mark done)\s+(.+)/i,
  ];

  for (const pattern of completePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      return { type: 'complete_todo', payload: match[1].trim(), raw: transcript };
    }
  }

  // Default: treat as AI question/chat
  const askPatterns = [
    /^(?:ask|hey|question|what|how|why|when|where|who|tell me|explain)\s*/i,
  ];

  for (const pattern of askPatterns) {
    if (pattern.test(lower)) {
      return { type: 'ask_ai', payload: transcript, raw: transcript };
    }
  }

  // If nothing matches explicitly, treat as AI chat (most flexible)
  return { type: 'ask_ai', payload: transcript, raw: transcript };
}

export function useVoice(): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const { sendMessage } = useChat();

  const isSupported = typeof window !== 'undefined' && 
    !!(window.SpeechRecognition || window.webkitSpeechRecognition) &&
    !!window.speechSynthesis;

  // Initialize speech synthesis ref
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a natural-sounding voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => 
      v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural')
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const processVoiceCommand = useCallback((text: string) => {
    const command = parseVoiceCommand(text);
    const store = useStore.getState();

    switch (command.type) {
      case 'add_todo': {
        const categoryId = store.activeCategoryId || store.categories[0]?.id;
        if (categoryId) {
          const today = format(new Date(), 'yyyy-MM-dd');
          store.addTodo(categoryId, command.payload, today);
          speak(`Added todo: ${command.payload}`);
        } else {
          speak("I couldn't add the todo. No category is selected.");
        }
        break;
      }

      case 'navigate': {
        const mode = command.payload as any;
        store.setAppMode(mode);
        speak(`Switched to ${command.payload.replace('-', ' ')} view`);
        break;
      }

      case 'complete_todo': {
        // Find a matching todo by fuzzy text match
        const searchText = command.payload.toLowerCase();
        const matchingTodo = store.todos.find(t => 
          !t.completed && t.text.toLowerCase().includes(searchText)
        );
        if (matchingTodo) {
          store.toggleTodo(matchingTodo.id);
          speak(`Completed: ${matchingTodo.text}`);
        } else {
          speak(`I couldn't find a todo matching "${command.payload}"`);
        }
        break;
      }

      case 'ask_ai': {
        // Open chat panel and send the message
        if (!store.chatOpen) {
          store.toggleChat();
        }
        sendMessage(command.payload);
        // The AI response will be spoken via the chat integration
        break;
      }

      default:
        speak("I didn't understand that command. Try saying 'add todo' followed by your task, or ask me a question.");
    }
  }, [speak, sendMessage]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(final);
        setInterimTranscript('');
        // Process the command after getting final result
        processVoiceCommand(final);
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, processVoiceCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    processVoiceCommand,
  };
}
