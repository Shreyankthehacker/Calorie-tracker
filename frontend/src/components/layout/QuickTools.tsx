import { Link } from 'react-router-dom';
import { bonusNav, toolsNav } from './nav-config';

export function QuickTools() {
  return (
    <div className="tools-strip">
      <div className="strip-head">
        <h2>Quick tools</h2>
        <span className="strip-sub">Everything beyond the daily ledger, one tap away</span>
      </div>
      <div className="tools-grid">
        {[...bonusNav, ...toolsNav].map((item) => (
          <Link className="tool-card" to={item.to} key={item.to}>
            <div className="ic">{item.icon}</div>
            <div className="t">{item.label}</div>
            <div className="s">{item.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
