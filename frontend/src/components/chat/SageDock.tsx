import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChatPanel, useSageChat } from './SageChat';

export function SageDock() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const chat = useSageChat();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname === '/chat') {
    return null;
  }

  return (
    <div className="sage-dock">
      {open ? (
        <div className="sage-dock-window" role="dialog" aria-labelledby="sage-dock-title" id="sage-dock-window">
          <header className="sage-dock-head">
            <div>
              <p className="sage-dock-kicker">Assistant</p>
              <h2 id="sage-dock-title">Sage</h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close chat" onClick={() => setOpen(false)}>
              <span className="sage-dock-close" />
            </button>
          </header>
          <ChatPanel chat={chat} inputId="sage-dock-message" compact />
        </div>
      ) : null}
      <button
        type="button"
        className={`sage-dock-fab${open ? ' is-open' : ''}`}
        aria-label="Ask Sage"
        aria-expanded={open}
        aria-controls={open ? 'sage-dock-window' : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <span className="sage-dock-close is-on-fab" /> : <SageMark />}
      </button>
    </div>
  );
}

function SageMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5h11v7h-6L4.5 14v-2.5h-2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
