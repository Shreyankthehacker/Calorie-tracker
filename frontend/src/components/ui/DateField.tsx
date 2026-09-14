import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateLabel, monthGrid, parseDateOnly } from '../../lib/dates';

export function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseDateOnly(value) ?? parseDateOnly(new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState({ year: parsed?.year ?? 2026, month: parsed?.month ?? 1 });
  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor.month, cursor.year]);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(cursor.year, cursor.month - 1, 1)),
  );

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(cursor.year, cursor.month - 1 + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 });
  }

  return (
    <div className="date-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="sr-only"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="date-field-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          const next = parseDateOnly(value);
          if (next) setCursor({ year: next.year, month: next.month });
          setOpen((current) => !current);
        }}
      >
        {value ? formatDateLabel(value) : 'Any date'}
      </button>
      {open ? (
        <div className="date-pop" role="dialog" aria-label={label}>
          <header className="date-pop-head">
            <button type="button" className="icon-button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <p>{monthLabel}</p>
            <button type="button" className="icon-button" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight size={16} />
            </button>
          </header>
          <div className="date-weekdays">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-grid">
            {cells.map((cell, index) =>
              cell ? (
                <button
                  key={cell}
                  type="button"
                  className={`date-cell ${cell === value ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(cell);
                    setOpen(false);
                  }}
                >
                  {Number(cell.slice(8))}
                </button>
              ) : (
                <span key={`pad-${index}`} />
              ),
            )}
          </div>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
