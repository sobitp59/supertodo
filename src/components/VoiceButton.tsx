/**
 * VoiceButton - Floating microphone button with visual feedback
 * Shows listening state with pulsing animation and displays transcript
 */
import { useState, useEffect, useRef } from 'react';
import { Microphone, MicrophoneSlash, SpeakerHigh, Stop } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '../hooks/useVoice';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';

export function VoiceButton() {
  const {
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
  } = useVoice();

  // Track if voice was recently used (auto-speak AI responses for 60s after last voice input)
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When user uses voice, activate the session for talk-back
  useEffect(() => {
    if (transcript) {
      setVoiceSessionActive(true);
      // Keep voice session active for 60s after last voice interaction
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = setTimeout(() => {
        setVoiceSessionActive(false);
      }, 60000);
    }
    return () => {
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, [transcript]);

  // Hook up TTS for AI responses when voice session is active
  useVoiceFeedback({ enabled: voiceSessionActive, speak });

  const handleClick = () => {
    if (!isSupported) {
      // Show a temporary error - speech recognition not available
      return;
    }
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      {/* Floating Voice Button */}
      <motion.button
        className={`voice-btn ${isListening ? 'voice-btn--listening' : ''} ${isSpeaking ? 'voice-btn--speaking' : ''} ${!isSupported ? 'voice-btn--unsupported' : ''}`}
        onClick={handleClick}
        title={!isSupported ? 'Speech recognition not supported in this browser' : isListening ? 'Stop listening' : isSpeaking ? 'Stop speaking' : 'Voice command'}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <span className="voice-btn__pulse voice-btn__pulse--1" />
            <span className="voice-btn__pulse voice-btn__pulse--2" />
            <span className="voice-btn__pulse voice-btn__pulse--3" />
          </>
        )}

        {/* Speaker animation when speaking */}
        {isSpeaking && (
          <span className="voice-btn__speaking-ring" />
        )}

        {/* Icon */}
        <span className="voice-btn__icon">
          {!isSupported ? (
            <MicrophoneSlash size={20} weight="bold" />
          ) : isSpeaking ? (
            <SpeakerHigh size={20} weight="bold" />
          ) : isListening ? (
            <Stop size={20} weight="bold" />
          ) : (
            <Microphone size={20} weight="bold" />
          )}
        </span>
      </motion.button>

      {/* Transcript overlay */}
      <AnimatePresence>
        {(isListening || transcript || error) && (
          <motion.div
            className="voice-transcript"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {error ? (
              <div className="voice-transcript__error">
                <MicrophoneSlash size={16} />
                <span>{error}</span>
              </div>
            ) : (
              <div className="voice-transcript__text">
                {isListening && !interimTranscript && !transcript && (
                  <span className="voice-transcript__placeholder">Listening...</span>
                )}
                {interimTranscript && (
                  <span className="voice-transcript__interim">{interimTranscript}</span>
                )}
                {transcript && (
                  <span className="voice-transcript__final">{transcript}</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
