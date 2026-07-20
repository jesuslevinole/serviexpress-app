import { useState } from 'react';
import { CrudModule } from '../components/crud/CrudModule';
import { catalogModules } from '../config/modules';
import './CatalogosPage.css';

/**
 * Todos los catálogos (CAT_ del diagrama) en una sola página con pestañas.
 * Cada pestaña reutiliza el mismo motor CRUD — sin duplicar nada.
 */
export function CatalogosPage() {
  const [activeId, setActiveId] = useState(catalogModules[0].id);
  const active = catalogModules.find((m) => m.id === activeId) ?? catalogModules[0];

  return (
    <div className="catalogs">
      <div className="catalogs-tabs" role="tablist">
        {catalogModules.map((module) => (
          <button
            key={module.id}
            type="button"
            role="tab"
            aria-selected={module.id === activeId}
            className={`catalogs-tab ${module.id === activeId ? 'is-active' : ''}`}
            onClick={() => setActiveId(module.id)}
          >
            {module.title}
          </button>
        ))}
      </div>
      <CrudModule
        key={active.id}
        config={{ ...active, id: 'catalogs', title: active.title }}
      />
    </div>
  );
}
