# ServiExpress · V00047 — "Email on save": avisos por correo configurables por módulo

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git: src/services/emailNotifications.ts,
src/components/crud/EmailRecipientsModal.tsx (+.css).
TAMBIÉN reemplaza el paquete de la Cloud Function (nueva función
notifyModuleSave en serviexpress-mail-function.zip) y vuelve a desplegar:
  firebase deploy --only functions

## Cómo funciona (tal como lo pediste)
- NADA se envía automático a ciegas: en TODOS los módulos hay un botón nuevo
  "Email on save" (solo admin) que abre la lista de usuarios del app con
  casillas — ahí eliges QUIÉNES reciben el correo cuando se guarda un
  formulario de ESE módulo, con buscador y dos opciones:
    [x] Send when a record is created   (encendida por defecto)
    [ ] Also when a record is edited
- Sin usuarios marcados, guardar no envía nada. Cada módulo tiene su propia
  lista (Shop puede avisar a unos, Accidents a otros).
- El correo llega desde noreply@tudominio con asunto
  "[ServiExpress] Shop: Nuevo registro — 510002 · XKB7324" y un resumen de
  los primeros campos capturados + quién lo guardó.

## Seguridad (importante)
Quien captura NO necesita permisos de envío: el navegador solo informa "se
guardó un registro en el módulo X" y la Cloud Function decide los
destinatarios LEYENDO la configuración del admin en el servidor
(settings_notifications). Nadie puede mandar correos a direcciones
arbitrarias desde el app; todo envío queda en la bitácora messages_log.
El guardado JAMÁS se bloquea por el correo: si el aviso falla, el registro
se guarda igual y el error queda en consola.

## Para que funcione
1. La Cloud Function desplegada (zip actualizado) con el dominio verificado
   en Resend y los secretos RESEND_API_KEY y MAIL_FROM.
2. Los usuarios destinatarios deben tener su correo en el módulo Users (los
   que no tienen aparecen deshabilitados con "no email").

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00047.
