import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FoodLogger } from '../meals/FoodLogger';
import { useToast } from '../ui/ToastProvider';

type LogFoodContextValue = {
  isOpen: boolean;
  openLogFood: () => void;
  closeLogFood: () => void;
};

const LogFoodContext = createContext<LogFoodContextValue | null>(null);

export function LogFoodProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const value = useMemo(
    () => ({
      isOpen,
      openLogFood: () => setOpen(true),
      closeLogFood: () => setOpen(false),
    }),
    [isOpen],
  );

  return (
    <LogFoodContext.Provider value={value}>
      {children}
      {isOpen ? (
        <FoodLogger
          onClose={() => setOpen(false)}
          onLogged={async () => {
            notify('Meal added.');
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
