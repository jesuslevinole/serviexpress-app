# ServiExpress · V00053 — Reglas, Company en Roles y duplicados de Fleet

Reemplaza la carpeta `src/` completa y `public/version.json`.
Incluye también `firestore.rules` (ver punto 1).

## 1. El error rojo: "Missing or insufficient permissions"
Ese mensaje es de FIRESTORE, no del app: las reglas PUBLICADAS en tu consola
no permiten leer `settings_company`. Se arregla en 2 minutos y NO requiere
publicar el app:
  Consola Firebase -> Firestore Database -> pestaña REGLAS -> pega esto ->
  PUBLICAR:

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }

Con eso desaparece el aviso rojo, el nombre deja de revertirse y el logo se
queda. (El mismo archivo va incluido como firestore.rules.)
Las colecciones que estaban quedando fuera: settings_company,
settings_alerts, settings_notifications, settings_windows, change_log y
messages_log.

## 2. Company ahora está en Roles
"Company (logo, name)" aparece como un módulo más en la matriz de permisos:
- Ver: quién puede abrir el módulo (el menú lo muestra solo a esos roles).
- Editar: quién puede subir el logo y cambiar los textos; sin ese permiso
  se ve la información pero los botones quedan bloqueados.
Ya no depende de "ser admin" a secas.

## 3. Fleet: un renglón por camión
- INDICADOR: los camiones que aparecen MÁS DE UNA VEZ muestran una etiqueta
  roja "DUPLICATE" en la fila, en los registros MÁS VIEJOS (el más reciente
  queda sin marca). Así sabes exactamente cuál borrar.
- BORRAR NO PIERDE HISTORIA: eliminar un renglón de Fleet no toca el
  historial del camión en Trucks (pestañas Shop, mantenimientos, cambios de
  estación y bitácora viven en sus propias colecciones); solo desaparece de
  Fleet, que es lo que quieres.
- NO SE PUEDE DUPLICAR MÁS: si alguien intenta agregar un camión que ya
  está en Fleet, el app lo detiene, avisa quién lo registró y ofrece
  "Editar el existente" — lo abre directo para editarlo, sin buscarlo a
  mano. Nada se guarda por duplicado.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00053.
