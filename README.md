# ServiExpress · Control de Flotilla

App de control de unidades (mantenimiento, taller, drivers, assets, rentas,
reportes BC, requerimientos y uniformes) construida con React + TypeScript +
Vite + Firebase (Auth y Firestore).

## Arquitectura

El corazón del app es un **motor CRUD config-driven**:

- `src/config/modules.ts` — configuración declarativa de cada módulo
  (campos, etiquetas, tipos, enums, referencias, requeridos, detalle).
- `src/components/crud/CrudModule.tsx` — un solo componente genérico que
  renderiza cualquier módulo: tabla con búsqueda, formulario modal con
  validación, permisos por rol, maestro-detalle y export a Excel.

Para agregar un módulo nuevo NO se crean componentes: se agrega su
configuración en `modules.ts` y aparece solo en el menú, con permisos,
formulario y Excel incluidos.

Reglas de referencia en pantalla: **nunca se muestran IDs** — los campos
`ref` se resuelven a nombres con `useRefMaps` (`src/hooks/useRefMaps.ts`).

## Estructura de carpetas

```
src/
├── components/
│   ├── crud/        Motor CRUD genérico (CrudModule, CrudForm, DetailModal)
│   ├── layout/      Sidebar, Topbar, AppLayout
│   └── ui/          Modal, DataTable, SearchableSelect, FormField, Badge…
├── config/          Módulos, enums y colecciones (todo declarativo)
├── context/         AuthContext (sesión + permisos)
├── firebase/        Inicialización de Firebase
├── hooks/           useCollection, useRefMaps
├── pages/           Login, Dashboard, Catálogos, Usuarios, Roles
├── services/        Firestore genérico, export Excel, alta de usuarios
├── styles/          variables.css (tema) + index.css (globales)
└── types/           Modelos TypeScript (cero `any`)
```

## Puesta en marcha

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en [Firebase Console](https://console.firebase.google.com):
   - Activa **Authentication → Email/Password**.
   - Activa **Cloud Firestore** (modo producción).
   - Copia las credenciales web del proyecto.

3. Copia `.env.example` a `.env` y llena las variables `VITE_FIREBASE_*`.

4. Publica las reglas de `firestore.rules` (pestaña *Rules* de Firestore).

5. **Crea el primer usuario administrador** (una sola vez):
   - En *Authentication → Users → Add user*: correo y contraseña.
   - Copia el UID generado.
   - En *Firestore*, crea el documento `users/{UID}` con:

     ```
     name:   "Tu Nombre"      (string)
     email:  "tu@correo.com"  (string)
     roleId: "admin"          (string)
     status: "ACTIVO"         (string)
     ```

   - Al iniciar sesión por primera vez, el app crea automáticamente el rol
     `admin` con todos los permisos. Después ya puedes dar de alta usuarios
     y roles desde la propia interfaz.

6. Arranca en desarrollo:

   ```bash
   npm run dev
   ```

## Comandos

| Comando           | Qué hace                                 |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Servidor de desarrollo                   |
| `npm run build`   | Verifica tipos (`tsc -b`) y build de producción |
| `npm run lint`    | ESLint (con `no-explicit-any` en error)  |
| `npm run preview` | Sirve el build de producción             |

## Notas de diseño

- Los enums del sistema viven en `src/config/enums.ts`; ajusta ahí los
  valores permitidos y se propagan a formularios, tablas y reportes.
- Los usuarios INACTIVOS no pueden iniciar sesión (se valida el perfil al
  entrar). La baja de usuarios es por estatus, no se borran de Auth.
- El alta de usuarios usa una instancia secundaria de Firebase para no
  cerrar la sesión del administrador.
- El logo está en `public/logo.svg`: reemplázalo por el logo real de
  ServiExpress con el mismo nombre de archivo.
