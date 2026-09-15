import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { MealType } from '../../api/types';
import { isMealType } from '../../lib/nutrition';
import { FoodLogger } from '../meals/FoodLogger';
import { useToast } from '../ui/ToastProvider';

type LogFoodContextValue = {
  isOpen: boolean;
  openLogFood: (mealType?: MealType) => void;
  closeLogFood: () => void;
};

const LogFoodContext = createContext<LogFoodContextValue | null>(null);

/**
 * Global log-food modal. `openLogFood` ignores click events — only a real MealType
 * is stored, otherwise the logger defaults to breakfast.
 */
export function LogFoodProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType | undefined>();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const value = useMemo(
    () => ({
      isOpen,
      openLogFood: (next?: MealType) => {
        setMealType(isMealType(next) ? next : undefined);
        setOpen(true);
      },
      closeLogFood: () => {
        setMealType(undefined);
        setOpen(false);
      },
    }),
    [isOpen],
  );

  return (
    <LogFoodContext.Provider value={value}>
      {children}
      {isOpen ? (
        <FoodLogger
          initialMealType={mealType}
          onClose={() => {
            setMealType(undefined);
            setOpen(false);
          }}
          onLogged={async () => {
            notify('Meal added.');
            setMealType(undefined);
            setOpen(false);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['food-entries'] }),
              queryClient.invalidateQueries({ queryKey: ['reports'] }),
            ]);
          }}
        />
      ) : null}
    </LogFoodContext.Provider>
  );
}

export function useLogFood(): LogFoodContextValue {
  const context = useContext(LogFoodContext);
  if (!context) {
    return {
      isOpen: false,
      openLogFood: () => undefined,
      closeLogFood: () => undefined,
    };
  }
  return context;
}
