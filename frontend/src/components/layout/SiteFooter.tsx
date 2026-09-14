import { NavLink } from 'react-router-dom';
import { BrandMark, BrandWord } from './BrandMark';
import { toolsNav, trackNav } from './nav-config';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div className="brand" style={{ color: 'var(--black)' }}>
            <BrandMark />
            <BrandWord />
          </div>
          <p>
            A calmer way to track food, water, and family nutrition — with Sage keeping quiet, useful watch in
            the background.
          </p>
        </div>
        <div className="footer-col">
          <h4>Track</h4>
          {trackNav.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="footer-col">
          <h4>Tools</h4>
          {toolsNav.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="footer-col">
          <h4>Account</h4>
          <NavLink to="/login">Sign in</NavLink>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#help">Help centre</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 CalorieTracker. All rights reserved.</span>
        <span className="powered">
          CalorieTracker powered by <b>Typeface</b>
        </span>
      </div>
    </footer>
  );
}
