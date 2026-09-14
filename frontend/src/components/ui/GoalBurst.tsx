import { motion, useReducedMotion } from 'framer-motion';

export function GoalBurst({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  if (!active || reduce) return null;

  const bits = Array.from({ length: 14 }, (_, index) => index);

  return (
    <div className="goal-burst" aria-hidden="true">
      {bits.map((bit) => (
        <motion.span
          key={bit}
          className={bit % 2 === 0 ? 'burst-bit is-green' : 'burst-bit is-coral'}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }}
          animate={{
            opacity: 0,
            x: Math.cos((bit / bits.length) * Math.PI * 2) * 72,
            y: Math.sin((bit / bits.length) * Math.PI * 2) * 56,
            scale: 1,
          }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
