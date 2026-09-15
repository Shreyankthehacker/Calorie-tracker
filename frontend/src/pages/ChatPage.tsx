import { ChatPanel, chatSuggestions, useSageChat } from '../components/chat/SageChat';

export function ChatPage() {
  const chat = useSageChat();

  return (
    <div className="page-chat">
      <div className="main-inner">
        <div className="top-row">
          <div className="kicker">Sage assistant</div>
          <h1 className="sr-only">Assistant</h1>
          <h1 className="page-title">Chat with Sage</h1>
        </div>

        <div className="chat-shell">
          <ChatPanel chat={chat} inputId="chat-message" />

          <div>
            <div className="side-card">
              <div className="who">Try asking</div>
              {chat.extraChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="suggest-chip"
                  disabled={chat.busy}
                  onClick={() => chat.send(chip)}
                >
                  {chip}
                </button>
              ))}
              {chat.messages.length === 0
                ? chatSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="suggest-chip"
                      disabled={chat.busy}
                      onClick={() => chat.send(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))
                : null}
            </div>
            <div className="side-card">
              <div className="who">About Sage</div>
              <p>
                Sage reads logged meals, goals, and entries you actually saved. If there is not enough history for a
                trend, it should say so rather than invent one.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
