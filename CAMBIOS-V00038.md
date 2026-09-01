# ServiExpress · V00038 — Alertas en rojo configurables + fotos y documentos

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git (git add -A):
  src/services/alertThresholds.ts · src/hooks/useAlertThresholds.ts
  src/components/crud/AlertThresholdsModal.tsx (+.css)
  src/services/attachments.ts · src/components/crud/AttachmentsPanel.tsx (+.css)

## 1. Umbrales de alerta (números en ROJO)
- Botón nuevo "Alerts" (solo admin) en la barra de los módulos con campos
  numéricos: para cada campo (Diff mileage, los 6 de cauchos, Next mant,
  etc.) defines "Red when <= X". Vacío = sin alerta.
- Un valor EN o BAJO su umbral se pinta en rojo fuerte en TODAS las tablas:
  el detalle del BC Report, Maintenance, las pestañas del camión y los
  renglones al capturar.
- De fábrica: Difference Mileage en 0 (0 o menos = rojo), tal como pediste.
  Los cauchos los configuras tú con el número que uses de mínimo.
- Aplica para todos los usuarios; se guarda en settings_alerts.

## 2. Fotos y documentos en TODOS los módulos
En el detalle de cualquier registro (clic en la fila), pestaña nueva
"Files & photos":
- "Take photo": abre la cámara del teléfono directamente.
- "Upload photo / PDF": galería o archivos (admite varios a la vez).
- Miniaturas de fotos (clic = ver en grande), lista de documentos, y borrar
  (requiere permiso de edición del módulo).

## 3. Estructura de carpetas EXACTA en Storage
  Truck/<número de camión>/imagen|documento/<archivos>
  mantenimientoPreventivo/<número de camión>/imagen|documento/<archivos>
  mantenimientoCorrectivo/<número de camión>/imagen|documento/<archivos>
  Driver/<Nombre del driver>/imagen|documento/<archivos>
  <colección>/<etiqueta del registro>/imagen|documento/  (demás módulos)
El tipo se decide solo: imágenes van a /imagen, PDF a /documento. En
Maintenance, la carpeta (Preventivo/Correctivo) sale del Type del registro y
el número de camión se resuelve del camión enlazado.

### IMPORTANTE antes de probar (1 sola vez, consola de Firebase)
1. Firebase Console -> Build -> Storage -> "Get started" (si no está activo).
2. Pestaña Rules, pegar y publicar:
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /{allPaths=**} {
           allow read, write: if request.auth != null;
         }
       }
     }
3. Verifica que .env tenga VITE_FIREBASE_STORAGE_BUCKET (ya suele estar).
Si Storage no está habilitado, la pestaña lo dice claro en vez de fallar en
silencio.

## 4. Columna "NAME (FROM TEAM)" fuera de Drivers
Era un campo interno del motor (la copia del nombre para ordenar) que un
layout guardado había vuelto columna. Regla nueva: los campos internos ya no
pueden resucitar por un layout viejo. La columna desaparece sola al publicar.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00038.
