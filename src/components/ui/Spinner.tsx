import './Spinner.css';

interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = 'Cargando…' }: SpinnerProps) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner-circle" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
