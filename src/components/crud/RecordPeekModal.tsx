import { useMemo } from 'react';
import { RecordDetailModal } from './RecordDetailModal';
import { useRefMaps } from '../../hooks/useRefMaps';
import { CRUD_MODULES, catalogModules } from '../../config/modules';
import { buildRefLabel } from '../../config/collections';
import type { EntityData } from '../../types/models';

interface RecordPeekModalProps {
  /** Colección del registro (trucks). */
  collection: string;
  record: EntityData;
  onClose: () => void;
}

/**
 * Visor rápido de un registro desde cualquier lista informativa (los números
 * de camión de los avisos de cobertura, faltantes de la ventana, bloqueados,
 * "My trucks"): un clic abre el detalle de solo lectura del camión con sus
 * referencias resueltas, sin salir de la pantalla actual.
 */
export function RecordPeekModal({ collection, record, onClose }: RecordPeekModalProps) {
  const config = useMemo(
    () =>
      [...CRUD_MODULES, ...catalogModules].find((module) => module.collection === collection) ??
      null,
    [collection],
  );
  const refMaps = useRefMaps(config?.fields ?? []);

  if (!config) return null;

  const refLabels = (refCollection: string, id: string): string => {
    const data = refMaps[refCollection];
    if (!data) return id;
    const label = data.labels.get(id);
    if (label !== undefined) return label;
    const row = data.rows.find((r) => r.id === id);
    return row ? buildRefLabel(refCollection, row) : id;
  };

  return (
    <RecordDetailModal
      title={config.title.replace(/s$/, '')}
      fields={config.fields}
      record={record}
      refLabels={refLabels}
      onClose={onClose}
    />
  );
}
