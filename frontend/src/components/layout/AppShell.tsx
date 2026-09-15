import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { displayNameFromEmail, initialsFromEmail } from '../../lib/user-display';
import { SageDock } from '../chat/SageDock';
import { LogFoodProvider } from '../meals/LogFoodProvider';
import { BrandMark, BrandWord } from './BrandMark';
import { bonusNav, crumbs, toolsNav, trackNav, type NavItem } from './nav-config';
import { SiteFooter } from './SiteFooter';

export function AppShell() {
  return (
    <LogFoodProvider>
      <AppShellInner />
    </LogFoodProvider>
  );
}

function AppShellInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const crumb = crumbs[location.pathname] ?? 'Today';
  const displayName = user?.email ? displayNameFromEmail(user.email) : 'You';
  const initials = user?.email ? initialsFromEmail(user.email) : 'Y';

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNavOpen(false);
      }
    }
    function onResize() {
      if (window.matchMedia('(min-width: 861px)').matches) {
        setNavOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!navOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={`app${navOpen ? ' nav-open' : ''}`}>
      {navOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside className={`sidebar${navOpen ? ' is-open' : ''}`} aria-label="App">
        <div className="sidebar-head">
          <Link to="/dashboard" className="brand" aria-label="CalorieTracker home">
            <BrandMark />
            <BrandWord />
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="sidebar-toggle-bars" data-open={navOpen} />
          </button>
        </div>
        <div className="sidebar-navs">
          <SidebarNav label="Track" items={trackNav} onNavigate={() => setNavOpen(false)} />
          <SidebarNav label="Tools" items={bonusNav} onNavigate={() => setNavOpen(false)} />
          <SidebarNav label="More" items={toolsNav} onNavigate={() => setNavOpen(false)} />
        </div>
        <div className="sidebar-foot">
          <div className="sage-pill">
            <span className="dot" /> Sage assistant active
          </div>
          <div className="user-row">
            <div className="user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div>
              <div className="name">{displayName}</div>
              <div className="tier">Signed in</div>
            </div>
            <button
              type="button"
              className="signout"
              aria-label={loggingOut ? 'Signing out…' : 'Sign out'}
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              <svg className="signout-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M6.5 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5M10 11.5 13 8l-3-3.5M13 8H6"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="signout-text">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </aside>
      <main>
        <div className="site-header">
          <Link to="/dashboard" className="header-brand" aria-label="CalorieTracker home">
            <BrandMark size={28} />
            <span className="header-brand-name">CalorieTracker</span>
          </Link>
          <div className="crumb">
            {crumb}
          </div>
          <div className="header-actions">
            <div className="header-powered">
              Powered by <b>Typeface</b>
            </div>
          </div>
        </div>
        <Outlet />
        <SiteFooter />
      </main>
      <SageDock />
    </div>
  );
}

function SidebarNav({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="nav-label">{label}</div>
      <nav aria-label={label}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            onClick={onNavigate}
            {...(item.end ? { end: true } : {})}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {item.icon}
            <span className="nav-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
