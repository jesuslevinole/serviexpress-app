import { NEGATIVE_STATUS, POSITIVE_STATUS } from '../../config/enums';
import './Badge.css';

interface BadgeProps {
  value: string;
}

/** Pastilla de estatus con color automático (verde/rojo/neutro). */
export function Badge({ value }: BadgeProps) {
  const upper = value.toUpperCase();
  const tone = POSITIVE_STATUS.includes(upper)
    ? 'positive'
    : NEGATIVE_STATUS.includes(upper)
      ? 'negative'
      : 'neutral';
  return <span className={`badge-pill badge-${tone}`}>{value}</span>;
}
