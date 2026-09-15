import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption<T extends string = string> = { value: T; label: string };

type MenuCoords = { top: number; left: number; width: number; maxHeight: number; openUp: boolean };

export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  id?: string;
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
}) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const labelId = `${triggerId}-label`;
  const listId = `${triggerId}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  function placeMenu() {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(280, openUp ? spaceAbove : spaceBelow));
    setCoords({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight,
      openUp,
    });
  }

  function close() {
    setOpen(false);
    setCoords(null);
  }

  function toggle() {
    if (disabled) {
      return;
    }
    setOpen((current) => {
      if (current) {
        setCoords(null);
        return false;
      }
      placeMenu();
      return true;
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      close();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    }

    function onReposition() {
      placeMenu();
    }

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  return (
    <div className="field select-field">
      {label ? (
        <span className="field-label" id={labelId}>
          {label}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className={`select-field-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        <span>{selected?.label ?? 'Select'}</span>
        <span className="select-field-caret" aria-hidden="true" />
      </button>
      {open && coords
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              className={`select-field-menu${coords.openUp ? ' is-up' : ''}`}
              role="listbox"
              aria-labelledby={label ? labelId : undefined}
              style={{
                top: coords.openUp ? 'auto' : coords.top,
                bottom: coords.openUp ? window.innerHeight - coords.top : 'auto',
                left: coords.left,
                width: coords.width,
                maxHeight: coords.maxHeight,
              }}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value || 'empty'}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`select-field-option${isSelected ? ' is-selected' : ''}`}
                      onClick={() => {
                        onChange(option.value);
                        close();
                        triggerRef.current?.focus();
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
