import type { ChatMessage as ChatMessageType } from '../../store';
import { Check, X } from '@phosphor-icons/react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className="chat-message-content">
        {message.content.split('\n').map((line, i) => (
          <p key={i} style={{ margin: '4px 0' }}>{line || '\u00A0'}</p>
        ))}
      </div>

      {/* Action cards */}
      {message.actions && message.actions.length > 0 && (
        <div className="chat-actions-list">
          {message.actions.map((action, i) => (
            <div key={i} className={`chat-action-card ${action.success === false ? 'error' : ''}`}>
              <span className="chat-action-icon">
                {action.success === false ? <X size={12} /> : <Check size={12} />}
              </span>
              <span className="chat-action-text">
                {action.resultText || `${action.action}: ${JSON.stringify(action.params)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <span className="chat-message-time">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
