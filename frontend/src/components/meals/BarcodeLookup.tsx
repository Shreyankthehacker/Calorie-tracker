import type { FormEvent, RefObject } from 'react';

type BarcodeLookupProps = {
  id: string;
  value: string;
  pending: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onLookup: (barcode: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  description?: string;
};

export function BarcodeLookup({
  id,
  value,
  pending,
  error,
  onChange,
  onLookup,
  inputRef,
  description = 'Packaged products use a barcode lookup, not the meal-photo vision flow.',
}: BarcodeLookupProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (next.length < 6) {
      return;
    }
    onLookup(next);
  }

  return (
    <form className="barcode-lookup-block" onSubmit={handleSubmit}>
      <div className="who">Barcode lookup</div>
      <p>{description}</p>
      <label className="field" htmlFor={id}>
        <span className="field-label">Barcode</span>
        <div className="barcode-lookup">
        <input
  ref={inputRef}
  id={id}
  value={value}
  inputMode="numeric"
  autoComplete="off"
  placeholder="e.g. 3017620422003"
  onChange={(event) => onChange(event.target.value)}
  style={{
    width: "430px",
    height: "42px",
    padding: "0 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    backgroundColor: "#fff",
    color: "#111",
    boxSizing: "border-box",
    outline: "none",
  }}
/>
          <button type="submit" className="btn-primary" disabled={pending || value.trim().length < 6}>
            {pending ? 'Looking up…' : 'Look up barcode'}
          </button>
        </div>
      </label>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
