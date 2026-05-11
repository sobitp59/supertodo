import { useRef, useEffect, useState } from 'react';
import { X, Trash, ChatCircleDots, Plus, ArrowsOutSimple, ArrowsInSimple, PencilSimple } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { useChat } from '../../hooks/useChat';
import { ChatMessageBubble } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function ChatPanel() {
  const {
    chatSessions, activeChatSessionId, chatOpen, chatFullscreen,
    toggleChat, setChatFullscreen, createChatSession, deleteChatSession,
    renameChatSession, setActiveChatSession, clearChatHistory,
  } = useStore();
  const { sendMessage, isLoading, chatHistory } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const activeSession = chatSessions.find(s => s.id === activeChatSessionId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length, isLoading]);

  if (!chatOpen) return null;

  const handleNewChat = () => {
    createChatSession();
  };

  const handleSend = (text: string) => {
    // Auto-create session if none active
    if (!activeChatSessionId) {
      createChatSession();
      // Small delay to let state update
      setTimeout(() => sendMessage(text), 20);
    } else {
      sendMessage(text);
    }
  };

  const handleRenameSubmit = (id: string) => {
    if (editTitle.trim()) renameChatSession(id, editTitle.trim());
    setEditingSessionId(null);
  };

  return (
    <div className={`chat-panel ${chatFullscreen ? 'chat-panel-fullscreen' : ''}`}>
      {/* Session Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="chat-new-session-btn" onClick={handleNewChat}>
            <Plus size={14} weight="bold" /> New Chat
          </button>
        </div>
        <div className="chat-session-list">
          {chatSessions.map(session => (
            <div
              key={session.id}
              className={`chat-session-item ${activeChatSessionId === session.id ? 'active' : ''}`}
              onClick={() => setActiveChatSession(session.id)}
            >
              {editingSessionId === session.id ? (
                <input
                  autoFocus
                  className="chat-session-rename-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(session.id); if (e.key === 'Escape') setEditingSessionId(null); }}
                  onBlur={() => handleRenameSubmit(session.id)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <ChatCircleDots size={14} />
                  <span className="chat-session-title">{session.title}</span>
                  <div className="chat-session-actions">
                    <button onClick={e => { e.stopPropagation(); setEditingSessionId(session.id); setEditTitle(session.title); }}>
                      <PencilSimple size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteChatSession(session.id); }}>
                      <Trash size={11} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {chatSessions.length === 0 && (
            <div className="chat-sidebar-empty">No conversations yet</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-panel-header">
          <div className="chat-panel-title">
            <ChatCircleDots size={18} weight="bold" />
            <span>{activeSession?.title || 'SuperTodo AI'}</span>
          </div>
          <div className="chat-panel-header-actions">
            <button className="chat-header-btn" onClick={clearChatHistory} title="Clear messages">
              <Trash size={14} />
            </button>
            <button className="chat-header-btn" onClick={() => setChatFullscreen(!chatFullscreen)} title={chatFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {chatFullscreen ? <ArrowsInSimple size={14} /> : <ArrowsOutSimple size={14} />}
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
                <button className="chat-suggestion" onClick={() => handleSend("What should I focus on today?")}>
                  What should I focus on?
                </button>
                <button className="chat-suggestion" onClick={() => handleSend("Summarize my week")}>
                  Summarize my week
                </button>
                <button className="chat-suggestion" onClick={() => handleSend("How are my goals progressing?")}>
                  How are my goals?
                </button>
                <button className="chat-suggestion" onClick={() => handleSend("Plan my day")}>
                  Plan my day
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
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
