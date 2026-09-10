/**
 * ServiExpress · Cloud Function — Correos desde el dominio propio
 *
 * sendEmail (callable): envía correos con remitente noreply@<tu dominio>
 * usando RESEND (https://resend.com) — sin Twilio.
 * - Solo usuarios con sesión Y con permiso: rol admin, o un rol con la
 *   acción "enviarMensajes" concedida en cualquier módulo.
 * - La API key vive en un SECRETO de Firebase (nunca en el navegador).
 * - Cada envío queda en la colección `messages_log` (quién, a quién,
 *   cuándo, resultado) — la bitácora de mensajes del app.
 * - Node 20 trae fetch integrado: cero dependencias de terceros.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY'); // re_...
const MAIL_FROM = defineSecret('MAIL_FROM'); // p. ej. noreply@serviexpress.com

/** ¿El usuario puede enviar mensajes? (admin, o acción enviarMensajes). */
async function canSendMessages(uid) {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return false;
  const roleId = userSnap.get('roleId');
  if (roleId === 'admin') return true;
  if (typeof roleId !== 'string' || roleId === '') return false;
  const roleSnap = await db.collection('roles').doc(roleId).get();
  if (!roleSnap.exists) return false;
  const name = String(roleSnap.get('name') ?? '').toLowerCase();
  if (name.includes('admin')) return true;
  const permissions = roleSnap.get('permissions') ?? {};
  return Object.values(permissions).some(
    (perms) => perms && perms.enviarMensajes === true,
  );
}

/**
 * notifyModuleSave: aviso por correo AL GUARDAR un formulario.
 * El cliente solo informa "se guardó un registro en el módulo X"; los
 * DESTINATARIOS los decide este servidor leyendo la configuración que el
 * admin guardó con el botón del módulo (settings_notifications/<moduleId>).
 * Sin destinatarios configurados, no se envía nada. Así, quien captura no
 * necesita permisos de envío y nadie puede mandar correos a direcciones
 * arbitrarias desde el navegador.
 */
exports.notifyModuleSave = onCall(
  {
    region: 'us-central1',
    secrets: [RESEND_API_KEY, MAIL_FROM],
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    const uid = request.auth.uid;
    const moduleId = String(request.data?.moduleId ?? '').trim().slice(0, 60);
    const moduleTitle = String(request.data?.moduleTitle ?? moduleId).trim().slice(0, 80);
    const action = request.data?.action === 'update' ? 'update' : 'create';
    const recordLabel = String(request.data?.recordLabel ?? '').trim().slice(0, 160);
    const summary = String(request.data?.summary ?? '').trim().slice(0, 1500);
    if (moduleId === '') {
      throw new HttpsError('invalid-argument', 'Falta el módulo.');
    }

    // La configuración manda: sin lista, no hay envío.
    const cfgSnap = await db.collection('settings_notifications').doc(moduleId).get();
    if (!cfgSnap.exists) return { ok: true, sent: 0, reason: 'no-config' };
    const cfg = cfgSnap.data() ?? {};
    const userIds = Array.isArray(cfg.userIds) ? cfg.userIds.slice(0, 30) : [];
    if (userIds.length === 0) return { ok: true, sent: 0, reason: 'no-recipients' };
    if (action === 'create' && cfg.onCreate === false) return { ok: true, sent: 0, reason: 'off' };
    if (action === 'update' && cfg.onEdit !== true) return { ok: true, sent: 0, reason: 'off' };

    // Correos de los destinatarios y nombre de quien guardó.
    const userSnaps = await db.getAll(
      ...userIds.map((id) => db.collection('users').doc(String(id))),
      db.collection('users').doc(uid),
    );
    const bySnap = userSnaps[userSnaps.length - 1];
    const byName = bySnap.exists ? String(bySnap.get('name') ?? bySnap.get('email') ?? uid) : uid;
    const recipients = userSnaps
      .slice(0, -1)
      .filter((snap) => snap.exists)
      .map((snap) => String(snap.get('email') ?? '').trim())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (recipients.length === 0) return { ok: true, sent: 0, reason: 'no-valid-emails' };

    const verb = action === 'create' ? 'Nuevo registro' : 'Registro editado';
    const subject = `[ServiExpress] ${moduleTitle}: ${verb}${recordLabel ? ` — ${recordLabel}` : ''}`;
    const lines = [
      `${verb} en ${moduleTitle}.`,
      recordLabel ? `Registro: ${recordLabel}` : null,
      `Guardado por: ${byName}`,
      summary ? `\n${summary}` : null,
    ].filter(Boolean);
    const text = lines.join('\n');
    const safeHtml = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

    let errorMessage = null;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `ServiExpress Fleet Control <${MAIL_FROM.value()}>`,
          to: recipients,
          subject,
          text,
          html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${safeHtml}</div>`,
        }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        errorMessage = detail?.message ?? `HTTP ${response.status}`;
      }
    } catch (error) {
      errorMessage = error && error.message ? error.message : String(error);
    }

    await db.collection('messages_log').add({
      type: 'EMAIL',
      auto: true,
      module: moduleId,
      action,
      to: recipients.join(', '),
      subject,
      byUid: uid,
      status: errorMessage ? 'FAILED' : 'sent',
      error: errorMessage,
      createdAt: new Date().toISOString(),
      at: FieldValue.serverTimestamp(),
    });

    if (errorMessage) {
      throw new HttpsError('internal', `El aviso no se pudo enviar: ${errorMessage}`);
    }
    return { ok: true, sent: recipients.length };
  },
);

exports.sendEmail = onCall(
  {
    region: 'us-central1',
    secrets: [RESEND_API_KEY, MAIL_FROM],
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    const uid = request.auth.uid;
    if (!(await canSendMessages(uid))) {
      throw new HttpsError('permission-denied', 'Tu rol no tiene permiso para enviar mensajes.');
    }

    const to = String(request.data?.to ?? '').trim();
    const subject = String(request.data?.subject ?? '').trim();
    const body = String(request.data?.body ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new HttpsError('invalid-argument', 'Correo destino inválido.');
    }
    if (subject === '' || subject.length > 200) {
      throw new HttpsError('invalid-argument', 'El asunto no puede ir vacío ni pasar de 200 caracteres.');
    }
    if (body === '' || body.length > 20000) {
      throw new HttpsError(
        'invalid-argument',
        'El mensaje no puede ir vacío ni pasar de 20.000 caracteres.',
      );
    }

    const safeHtml = body.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    let errorMessage = null;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `ServiExpress Fleet Control <${MAIL_FROM.value()}>`,
          to: [to],
          subject,
          text: body,
          html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${safeHtml}</div>`,
        }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        errorMessage = detail?.message ?? `HTTP ${response.status}`;
      }
    } catch (error) {
      errorMessage = error && error.message ? error.message : String(error);
    }

    await db.collection('messages_log').add({
      type: 'EMAIL',
      to,
      subject,
      body,
      byUid: uid,
      status: errorMessage ? 'FAILED' : 'sent',
      error: errorMessage,
      createdAt: new Date().toISOString(),
      at: FieldValue.serverTimestamp(),
    });

    if (errorMessage) {
      throw new HttpsError('internal', `El envío fue rechazado: ${errorMessage}`);
    }
    return { ok: true };
  },
);
