# ServiExpress · V00052 — Company: por qué "se borra" y cómo verlo

Reemplaza la carpeta `src/` completa y `public/version.json`.

## El diagnóstico
Los datos NO se borran: se guardan, pero la app no logra LEER el documento
de vuelta y caía a los valores de fábrica EN SILENCIO. Como los campos se
re-sincronizan con lo leído, parecía que al guardar "se revertía solo", y
al volver a entrar salía otra vez "ServiExpress / Fleet control".

Causa casi segura: las reglas de Firestore DESPLEGADAS no permiten leer la
colección `settings_company` (el archivo firestore.rules del proyecto está
abierto, pero lo que manda es lo publicado en la consola).

## Qué cambia en esta versión
1. El error de lectura YA NO SE ESCONDE: si el documento no se puede leer,
   Company muestra el motivo exacto en rojo y aclara que mientras tanto se
   usan los valores de fábrica.
2. Al guardar, la app RELEE lo guardado y muestra lo que realmente quedó en
   la base. Si no lo puede leer, lo dice — ya no revierte en silencio.
3. Si la lectura falla, lo que escribiste NO se borra de la pantalla.

## Lo que debes revisar (2 minutos)
Consola de Firebase -> Firestore Database -> pestaña REGLAS. Deben permitir
lectura y escritura a usuarios autenticados; lo más simple, publicar:

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }

(Si prefieres reglas por colección, asegúrate de incluir `settings_company`,
`settings_alerts`, `settings_notifications`, `settings_windows`, `change_log`
y `messages_log`, que son las colecciones de configuración y bitácoras.)

Publica las reglas, recarga el app con Ctrl+Shift+R y guarda de nuevo: el
nombre debe quedarse, y el logo (que se aplica al subirlo) también.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00052.
