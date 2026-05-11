import { useRef, useEffect } from 'react';
import { X, Trash, ChatCircleDots } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { useChat } from '../../hooks/useChat';
import { ChatMessageBubble } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function ChatPanel() {
  const { chatHistory, chatOpen, toggleChat, clearChatHistory } = useStore();
  const { sendMessage, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length, isLoading]);

  if (!chatOpen) return null;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="chat-panel-title">
          <ChatCircleDots size={18} weight="bold" />
          <span>SuperTodo AI</span>
        </div>
        <div className="chat-panel-header-actions">
          <button className="chat-header-btn" onClick={clearChatHistory} title="Clear history">
            <Trash size={14} />
          </button>
          <button className="chat-header-btn" onClick={toggleChat} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {chatHistory.length === 0 && (
          <div className="chat-empty">
            <ChatCircleDots size={32} weight="thin" />
            <p>Ask me about your todos, goals, jobs, or anything productivity-related.</p>
            <div className="chat-suggestions">
              <button className="chat-suggestion" onClick={() => sendMessage("What should I focus on today?")}>
                What should I focus on?
              </button>
              <button className="chat-suggestion" onClick={() => sendMessage("Summarize my week")}>
                Summarize my week
              </button>
              <button className="chat-suggestion" onClick={() => sendMessage("How are my goals progressing?")}>
                How are my goals?
              </button>
            </div>
          </div>
        )}

        {chatHistory.map(msg => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
