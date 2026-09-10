# Correos noreply@tudominio · Cloud Function + Resend (SIN Twilio)

## Qué es Resend
Servicio de envío de correos independiente (resend.com). Gratis hasta 3.000
correos/mes (100/día), suficiente para los avisos del app. La función queda
sin ninguna dependencia de Twilio.

## REQUISITO CLAVE: el dominio
Para que el remitente sea noreply@serviexpress.com hay que CONTROLAR EL DNS
de ese dominio: agregar los registros (TXT/MX) que Resend te dé. El buzón
"noreply" NO necesita existir — es solo el remitente. Si serviexpress.com no
es de ustedes: usar un dominio propio o comprar uno (~$10/año).

## 1. Resend (una sola vez)
1) Crea la cuenta en https://resend.com (correo y contraseña, sin tarjeta).
2) Domains -> Add Domain -> escribe tu dominio -> Resend te muestra 3
   registros DNS (SPF, DKIM y MX de retorno) -> agrégalos donde esté el DNS
   (Cloudflare: pega tal cual; los TXT/MX no llevan proxy) -> Verify.
   Cuando el dominio quede "Verified", listo.
3) API Keys -> Create API Key -> nombre "serviexpress-functions",
   permiso "Sending access" -> copia la key (empieza con re_, se muestra
   una sola vez).

## 2. Preparar la máquina (solo la primera vez)
1) Node.js 20+: https://nodejs.org
2) En una terminal:
   npm install -g firebase-tools
   firebase login

## 3. Desplegar
1) Descomprime este zip en una carpeta y entra:
   cd sx-mail
   firebase use serviexpress        (el ID de tu proyecto Firebase)
   cd functions && npm install && cd ..
2) Guarda los 2 secretos (los pedirá uno a uno, pégalos sin comillas):
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set MAIL_FROM
   (MAIL_FROM = noreply@tudominio.com)
3) Despliega:
   firebase deploy --only functions
   Al terminar verás sendEmail (us-central1). Listo.

## 4. Seguridad, como quedó
- Solo usuarios con sesión Y con permiso: rol admin, o cualquier rol al que
  le concedas la acción "enviarMensajes" (entrará a la matriz de Roles
  cuando integre el botón en el app).
- La API key vive en Secret Manager de Google, jamás en el navegador ni en
  el repositorio.
- Cada correo queda en la colección `messages_log` (quién, a quién, cuándo,
  estado o error): tu bitácora de mensajes.

## 5. Costos
- Cloud Functions: el nivel sin costo cubre este volumen de sobra.
- Resend: gratis 3.000/mes. Si un día hace falta más, $20/mes por 50 mil.

## Siguiente paso (cuando me digas)
Integro el botón "Send email" en el app donde lo quieras (p. ej. en el
detalle del Driver, o avisos al BC cuando un camión cambia de estación) con
su permiso "enviarMensajes" visible en la matriz de Roles.
