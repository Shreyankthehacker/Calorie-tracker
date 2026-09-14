import { motion, useReducedMotion } from 'framer-motion';
import { formatAmount } from '../../lib/nutrition';
import { GoalBurst } from '../ui/GoalBurst';

export function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number | null;
}) {
  const reduce = useReducedMotion();
  const size = 212;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target && target > 0 ? consumed / target : 0;
  const over = ratio > 1;
  const progress = Math.min(1, ratio);
  const dash = circumference * progress;
  const remaining = target == null ? null : target - consumed;
  const hitGoal = Boolean(target && target > 0 && consumed >= target);
  const label =
    remaining == null
      ? `${formatAmount(consumed)} kcal logged`
      : remaining >= 0
        ? `${formatAmount(remaining)} kcal remaining`
        : `${formatAmount(Math.abs(remaining))} kcal over`;

  return (
    <div className="calorie-ring">
      <div className="calorie-ring-stage">
        <GoalBurst active={hitGoal} />
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={
            target
              ? `${formatAmount(consumed)} of ${formatAmount(target)} kcal. ${label}`
              : `${formatAmount(consumed)} kcal logged. No calorie goal set.`
          }
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="calorie-ring-track"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={over ? 'calorie-ring-over' : 'calorie-ring-progress'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={reduce ? false : { strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dash} ${circumference}` }}
            transition={{ duration: reduce ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          <text x="50%" y="46%" textAnchor="middle" className="calorie-ring-value">
            {formatAmount(consumed)}
          </text>
          <text x="50%" y="58%" textAnchor="middle" className="calorie-ring-unit">
            kcal
          </text>
        </svg>
      </div>
      <p className="calorie-ring-caption">{label}</p>
      {target ? (
        <p className="muted small">Goal {formatAmount(target)} kcal</p>
      ) : (
        <p className="muted small">Set a calorie goal to see remaining energy.</p>
      )}
    </div>
  );
}
