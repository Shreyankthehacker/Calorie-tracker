import { useState } from 'react';
import type { FoodEntry, MealType } from '../../api/types';
import { formatConsumedAt } from '../../lib/dates';
import { MEAL_SECTIONS } from '../../lib/nutrition';
import { EmptyState } from '../ui/EmptyState';
import { FoodThumb } from './FoodThumb';
import { Coffee, Cookie, Moon, Sun } from 'lucide-react';

const mealIcons = {
  BREAKFAST: Coffee,
  LUNCH: Sun,
  DINNER: Moon,
  SNACKS: Cookie,
} as const;

const emptyCopy: Record<MealType, string> = {
  BREAKFAST: 'Nothing here yet. Log breakfast?',
  LUNCH: 'Nothing here yet. Log lunch?',
  DINNER: 'Nothing here yet. Log dinner?',
  SNACKS: 'Nothing here yet. Add a snack?',
};

export function MealTimeline({
  entries,
  onEdit,
  onDelete,
  onAdd,
}: {
  entries: FoodEntry[];
  onEdit: (entry: FoodEntry) => void;
  onDelete: (entry: FoodEntry) => void;
  onAdd?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="meal-timeline">
      {MEAL_SECTIONS.map((section) => {
        const items = entries.filter((entry) => entry.mealType === section.type);
        const sectionCalories = items.reduce((sum, entry) => sum + entry.calories, 0);
        const Icon = mealIcons[section.type];
        return (
          <section className="timeline-block" key={section.type}>
            <header className="timeline-head">
              <h3>
                <Icon size={16} aria-hidden="true" />
                {section.label}
              </h3>
              <p className="muted small">
                {items.length === 0 ? 'Nothing logged' : `${Math.round(sectionCalories)} kcal`}
              </p>
            </header>
            {items.length === 0 ? (
              <EmptyState
                title={emptyCopy[section.type]}
                {...(onAdd
                  ? {
                      action: (
                        <button type="button" className="button button-secondary" onClick={onAdd}>
                          Log food
                        </button>
                      ),
                    }
                  : {})}
              />
            ) : (
              <ul className="timeline-list">
                {items.map((entry) => {
                  const expanded = openId === entry.id;
                  return (
                    <li className="timeline-item" key={entry.id}>
                      <button
                        type="button"
                        className="timeline-main"
                        aria-expanded={expanded}
                        onClick={() => setOpenId(expanded ? null : entry.id)}
                      >
                        <FoodThumb name={entry.foodName} />
                        <span>
                          <strong className="meal-name">{entry.foodName}</strong>
                          <span className="muted small">
                            {entry.quantity} {entry.quantityUnit}, {formatConsumedAt(entry.consumedAt)}
                          </span>
                        </span>
                        <span className="stat-value">
                          {entry.calories} <span className="unit">kcal</span>
                        </span>
                      </button>
                      {expanded ? (
                        <div className="timeline-detail">
                          <p className="muted small">
                            P {entry.protein}g, C {entry.carbs}g, F {entry.fat}g
                          </p>
                          {entry.micronutrients.length > 0 ? (
                            <p className="muted small">
                              {entry.micronutrients
                                .map((nutrient) => `${nutrient.nutrientKey} ${nutrient.amount}${nutrient.unit}`)
                                .join(', ')}
                            </p>
                          ) : null}
                          <div className="action-row">
                            <button type="button" className="button button-secondary" onClick={() => onEdit(entry)}>
                              Edit
                            </button>
                            <button type="button" className="button button-danger" onClick={() => onDelete(entry)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
