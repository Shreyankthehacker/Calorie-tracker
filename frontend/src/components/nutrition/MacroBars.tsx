import { motion, useReducedMotion } from 'framer-motion';
import { formatAmount } from '../../lib/nutrition';

type Macro = {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  current: number;
  target?: number | undefined;
  unit: string;
};

export function MacroBars({
  protein,
  carbs,
  fat,
  proteinTarget,
  carbTarget,
  fatTarget,
}: {
  protein: number;
  carbs: number;
  fat: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
}) {
  const reduce = useReducedMotion();
  const rows: Macro[] = [
    { key: 'protein', label: 'Protein', current: protein, target: proteinTarget, unit: 'g' },
    { key: 'carbs', label: 'Carbs', current: carbs, target: carbTarget, unit: 'g' },
    { key: 'fat', label: 'Fat', current: fat, target: fatTarget, unit: 'g' },
  ];

  return (
    <ul className="macro-bars">
      {rows.map((row) => {
        const pct =
          row.target && row.target > 0 ? Math.min(100, Math.round((row.current / row.target) * 100)) : 0;
        return (
          <li className="macro-bar" key={row.key}>
            <div className="macro-bar-meta">
              <span>{row.label}</span>
              <strong>
                {formatAmount(row.current)}
                {row.target !== undefined ? ` / ${formatAmount(row.target)}` : ''} {row.unit}
              </strong>
            </div>
            <div
              className="macro-bar-track"
              role="progressbar"
              aria-valuenow={row.target ? pct : Math.round(row.current)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${row.label} ${formatAmount(row.current)}${row.unit}`}
            >
              <motion.div
                className={`macro-bar-fill is-${row.key}`}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: row.target ? `${pct}%` : '0%' }}
                transition={{ duration: reduce ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
