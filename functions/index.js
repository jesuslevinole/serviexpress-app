/**
 * ServiExpress · Cloud Functions — Correos AUTOMÁTICOS desde el dominio propio
 * ---------------------------------------------------------------------------
 * Los avisos NO dependen del navegador: los dispara Firestore en el servidor.
 * Si alguien guarda un registro y cierra la pestaña, o el guardado entra por
 * una importación, el correo sale igual.
 *
 * Cómo funciona
 *  1. Cada colección del app tiene un disparador onCreate/onUpdate.
 *  2. El disparador busca la configuración del módulo en
 *     `settings_notifications` (la que el admin guarda desde el botón
 *     "Automatic emails" de cada vista). SIN configuración, no hace nada.
 *  3. Decide si ese evento está encendido:
 *     - al CREAR            → onCreate
 *     - al EDITAR           → onEdit
 *     - una REGLA de campo  → p. ej. Status pasa a APROBADO (aunque onEdit
 *                             esté apagado: es un evento con nombre propio)
 *  4. Arma el correo con los campos que la configuración lista (resolviendo
 *     los que son referencia a su nombre) y lo envía por SMTP.
 *  5. Cada envío queda en `messages_log`.
 *
 * SMTP, no un servicio de terceros: se usa el buzón que la empresa YA tiene
 * (Google Workspace, Microsoft 365 o el del hosting). Lo único que hace
 * falta son los datos de ese servidor, guardados como secretos:
 *
 *   firebase functions:secrets:set SMTP_HOST   (smtp.gmail.com, smtp.office365.com…)
 *   firebase functions:secrets:set SMTP_PORT   (465 con SSL, o 587 con STARTTLS)
 *   firebase functions:secrets:set SMTP_USER   (la cuenta que autentica)
 *   firebase functions:secrets:set SMTP_PASS   (su contraseña de aplicación)
 *   firebase functions:secrets:set MAIL_FROM   (remitente: noreply@tudominio.com)
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const MAIL_FROM = defineSecret('MAIL_FROM'); // p. ej. noreply@serviexpress.com

/** Todos los secretos que necesita cualquier función que envíe correo. */
const MAIL_SECRETS = [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM];

/**
 * Conexión SMTP reutilizada entre invocaciones de la misma instancia: abrir
 * una por correo sería lento y algunos proveedores lo castigan.
 */
let transport = null;

/**
 * Limpia lo que se guardó en el secreto. Al pegar en la terminal se cuela
 * con facilidad un salto de línea, un espacio al final o unas comillas, y
 * entonces el servidor de correo rechaza el nombre ("EBADNAME") o la clave
 * sin decir por qué. Aquí se quitan una sola vez, para todos los valores.
 */
function secretValue(secret) {
  const clean = String(secret.value() ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
  // Contraseña de aplicación de Google: se muestra como "abcd efgh ijkl mnop"
  // y hay que entregarla SIN espacios. Si viene con ellos, se quitan; no se
  // toca ningún otro valor, porque una contraseña normal sí puede llevarlos.
  if (/^[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}$/i.test(clean)) {
    return clean.replace(/\s+/g, '');
  }
  return clean;
}

function mailer() {
  if (transport) return transport;
  const nodemailer = require('nodemailer');
  const port = Number(secretValue(SMTP_PORT)) || 587;
  transport = nodemailer.createTransport({
    host: secretValue(SMTP_HOST),
    port,
    // 465 = SSL directo; 587 (y los demás) = STARTTLS sobre conexión limpia.
    secure: port === 465,
    auth: { user: secretValue(SMTP_USER), pass: secretValue(SMTP_PASS) },
    pool: true,
    maxConnections: 1,
    // Un servidor lento no puede dejar la función colgada.
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  return transport;
}

const REGION = 'us-central1';
const CONFIG_COLLECTION = 'settings_notifications';

/**
 * Colecciones vigiladas. Una colección sin disparador no manda avisos, por
 * mucho que se configure en el app; y un disparador sin configuración no
 * cuesta más que una lectura. Si mañana nace un módulo, se agrega aquí y se
 * vuelve a desplegar.
 *
 * A propósito NO están los renglones de detalle (bcReportDetails, uniforms):
 * son miles de escrituras por semana y no tienen pantalla de configuración
 * propia, así que cada una sería una invocación tirada a la basura.
 */
const WATCHED = [
  'fleetReports',
  'bcReports',
  'requirements',
  'maintenance',
  'shopOrders',
  'accidents',
  'trucks',
  'drivers',
  'assets',
  'rentals',
  'fleet',
];

/* ────────────────────────── utilidades ────────────────────────── */

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Fecha ISO (2026-10-16) a formato de Estados Unidos. */
function formatValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }
  const text = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return iso ? `${iso[2]}/${iso[3]}/${iso[1]}` : text;
}

/**
 * Configuración del módulo dueño de esta colección. El app guarda en cada
 * documento de `settings_notifications` el campo `collection`, así que basta
 * una consulta por igualdad (sin índice compuesto).
 */
async function configFor(collectionName) {
  const snap = await db
    .collection(CONFIG_COLLECTION)
    .where('collection', '==', collectionName)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() ?? {};
  return {
    moduleId: doc.id,
    title: String(data.title ?? doc.id),
    userIds: Array.isArray(data.userIds) ? data.userIds.map(String).slice(0, 50) : [],
    onCreate: data.onCreate === true,
    onEdit: data.onEdit === true,
    notifyOwner: data.notifyOwner === true,
    ownerKey: typeof data.ownerKey === 'string' ? data.ownerKey : null,
    labelKeys: Array.isArray(data.labelKeys) ? data.labelKeys.map(String).slice(0, 4) : [],
    fields: Array.isArray(data.fields) ? data.fields.slice(0, 25) : [],
    rules: Array.isArray(data.rules) ? data.rules.slice(0, 10) : [],
  };
}

/** Nombres de los documentos referenciados (camión, driver, estación…). */
async function resolveRefs(pairs) {
  const unique = new Map();
  pairs.forEach(({ collection, id }) => {
    if (collection && id) unique.set(`${collection}/${id}`, { collection, id });
  });
  const entries = [...unique.values()].slice(0, 30);
  if (entries.length === 0) return new Map();
  const snaps = await db.getAll(
    ...entries.map((entry) => db.collection(entry.collection).doc(entry.id)),
  );
  const names = new Map();
  snaps.forEach((snap, index) => {
    if (!snap.exists) return;
    const data = snap.data() ?? {};
    const name =
      data.name ?? data.unidad ?? data.numero ?? data.title ?? data.email ?? snap.id;
    names.set(`${entries[index].collection}/${entries[index].id}`, String(name));
  });
  return names;
}

/** Correos de los destinatarios, sin repetir y solo los válidos. */
async function recipientEmails(userIds) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))].slice(0, 50);
  if (ids.length === 0) return [];
  const snaps = await db.getAll(...ids.map((id) => db.collection('users').doc(id)));
  const emails = snaps
    .filter((snap) => snap.exists)
    .filter((snap) => String(snap.get('status') ?? '').toUpperCase() !== 'INACTIVO')
    .map((snap) => String(snap.get('email') ?? '').trim())
    .filter(isEmail);
  return [...new Set(emails)];
}

/** Envío real + bitácora. Nunca lanza: un correo no puede tumbar un guardado. */
async function sendMail({ to, subject, text, html, meta }) {
  let errorMessage = null;
  try {
    await mailer().sendMail({
      from: `ServiExpress Fleet Control <${secretValue(MAIL_FROM)}>`,
      // Los destinatarios van en "Para", no en copia oculta: si el remitente
      // (noreply@…) no es un buzón real, mandarle el correo a él rebotaría.
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    errorMessage = error && error.message ? error.message : String(error);
    // La conexión pudo quedar inservible (credenciales, red): se descarta
    // para que la próxima invocación abra una limpia.
    transport = null;
  }

  await db.collection('messages_log').add({
    type: 'EMAIL',
    auto: true,
    to: to.join(', '),
    subject,
    status: errorMessage ? 'FAILED' : 'sent',
    error: errorMessage,
    ...meta,
    createdAt: new Date().toISOString(),
    at: FieldValue.serverTimestamp(),
  });
  return errorMessage;
}

/* ────────────────────── el aviso, en un solo sitio ────────────────────── */

/**
 * Decide y envía. `before` es null en un alta.
 * Devuelve un texto corto para los registros de la función.
 */
async function notify(collectionName, docId, before, after) {
  const config = await configFor(collectionName);
  if (!config) return 'sin configuración';
  if (config.userIds.length === 0 && !config.notifyOwner) return 'sin destinatarios';

  const creating = before === null;

  /** Reglas de campo: "Status pasó a APROBADO". */
  let ruleHit = null;
  if (!creating) {
    ruleHit =
      config.rules.find((rule) => {
        const key = String(rule.field ?? '');
        if (key === '') return false;
        const to = String(rule.to ?? '');
        const nextValue = String(after[key] ?? '');
        const prevValue = String(before[key] ?? '');
        return nextValue !== prevValue && nextValue === to;
      }) ?? null;
  }

  if (creating && !config.onCreate) return 'alta no configurada';
  if (!creating && !ruleHit && !config.onEdit) return 'edición no configurada';

  // Destinatarios: los configurados y, si se pidió, el capturista del registro.
  const ids = [...config.userIds];
  if (config.notifyOwner && config.ownerKey) {
    const owner = after[config.ownerKey];
    if (typeof owner === 'string' && owner !== '') ids.push(owner);
  }
  const to = await recipientEmails(ids);
  if (to.length === 0) return 'sin correos válidos';

  // Campos del correo, con las referencias resueltas a su nombre.
  const fields = config.fields.filter((field) => field && field.key);
  const refNames = await resolveRefs(
    fields
      .filter((field) => field.ref)
      .map((field) => ({ collection: field.ref, id: String(after[field.key] ?? '') })),
  );
  const valueOf = (field) => {
    const raw = after[field.key];
    if (field.ref && typeof raw === 'string' && raw !== '') {
      return refNames.get(`${field.ref}/${raw}`) ?? '—';
    }
    return formatValue(raw);
  };

  const label = config.labelKeys
    .map((key) => {
      const field = fields.find((item) => item.key === key);
      return field ? valueOf(field) : formatValue(after[key]);
    })
    .filter((text) => text !== '')
    .join(' · ');

  const event = ruleHit
    ? String(ruleHit.label ?? `${ruleHit.field}: ${ruleHit.to}`)
    : creating
      ? 'Nuevo registro'
      : 'Registro editado';

  const subject = `[ServiExpress] ${config.title}: ${event}${label ? ` — ${label}` : ''}`;

  // Qué cambió (solo en ediciones): se ve de un vistazo sin abrir el app.
  const changes = creating
    ? []
    : fields
        .filter((field) => String(before[field.key] ?? '') !== String(after[field.key] ?? ''))
        .map((field) => {
          const raw = before[field.key];
          const previous =
            field.ref && typeof raw === 'string' && raw !== ''
              ? (refNames.get(`${field.ref}/${raw}`) ?? '—')
              : formatValue(raw);
          return { label: field.label ?? field.key, from: previous || '—', to: valueOf(field) || '—' };
        });

  const rows = fields
    .map((field) => ({ label: field.label ?? field.key, value: valueOf(field) }))
    .filter((row) => row.value !== '');

  const text = [
    `${event} en ${config.title}.`,
    label ? `Registro: ${label}` : null,
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
    changes.length > 0 ? '\nCambios:' : null,
    ...changes.map((change) => `· ${change.label}: ${change.from} → ${change.to}`),
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2430;line-height:1.5">
      <p style="margin:0 0 4px;font-size:16px;font-weight:700">${escapeHtml(config.title)}</p>
      <p style="margin:0 0 14px;color:#5b6472">${escapeHtml(event)}${
        label ? ` — <strong>${escapeHtml(label)}</strong>` : ''
      }</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;min-width:320px">
        ${rows
          .map(
            (row, index) => `<tr style="background:${index % 2 ? '#f6f7fb' : '#ffffff'}">
              <td style="color:#5b6472;border:1px solid #e3e6ef">${escapeHtml(row.label)}</td>
              <td style="border:1px solid #e3e6ef"><strong>${escapeHtml(row.value)}</strong></td>
            </tr>`,
          )
          .join('')}
      </table>
      ${
        changes.length > 0
          ? `<p style="margin:16px 0 4px;font-weight:700">Cambios</p>
             <ul style="margin:0;padding-left:18px">${changes
               .map(
                 (change) =>
                   `<li>${escapeHtml(change.label)}: ${escapeHtml(change.from)} → <strong>${escapeHtml(
                     change.to,
                   )}</strong></li>`,
               )
               .join('')}</ul>`
          : ''
      }
      <p style="margin:18px 0 0;font-size:12px;color:#8a93a5">
        Aviso automático de ServiExpress Fleet Control. No respondas a este correo.
      </p>
    </div>`;

  const error = await sendMail({
    to,
    subject,
    text,
    html,
    meta: { module: config.moduleId, collection: collectionName, recordId: docId, event },
  });
  return error ? `error: ${error}` : `enviado a ${to.length}`;
}

/* ───────────────────────── disparadores ───────────────────────── */

const triggerOptions = {
  region: REGION,
  secrets: MAIL_SECRETS,
  // Un aviso perdido no justifica reintentos infinitos ni correos repetidos.
  retry: false,
};

WATCHED.forEach((collectionName) => {
  const suffix = collectionName.charAt(0).toUpperCase() + collectionName.slice(1);

  exports[`onCreate${suffix}`] = onDocumentCreated(
    { ...triggerOptions, document: `${collectionName}/{docId}` },
    async (event) => {
      const after = event.data && event.data.data();
      if (!after) return;
      try {
        const result = await notify(collectionName, event.params.docId, null, after);
        console.log(`[notify] ${collectionName} create ${event.params.docId}: ${result}`);
      } catch (error) {
        console.error(`[notify] ${collectionName} create falló`, error);
      }
    },
  );

  exports[`onUpdate${suffix}`] = onDocumentUpdated(
    { ...triggerOptions, document: `${collectionName}/{docId}` },
    async (event) => {
      const before = event.data && event.data.before.data();
      const after = event.data && event.data.after.data();
      if (!before || !after) return;
      try {
        const result = await notify(collectionName, event.params.docId, before, after);
        console.log(`[notify] ${collectionName} update ${event.params.docId}: ${result}`);
      } catch (error) {
        console.error(`[notify] ${collectionName} update falló`, error);
      }
    },
  );
});

/* ──────────────────────── prueba de correo ──────────────────────── */

/**
 * testNotification: manda un correo de prueba A TI MISMO (a la dirección que
 * tengas en Users) y DEVUELVE LA RAZÓN EXACTA si no sale. Existe para no
 * quedarse adivinando: dice si falta la configuración, si tu usuario no
 * tiene correo, o el error literal que devolvió Resend (dominio sin
 * verificar, API key inválida…).
 *
 * Solo envía a quien la llama, así que no hace falta más permiso que tener
 * sesión iniciada.
 */
exports.testNotification = onCall(
  { region: REGION, secrets: MAIL_SECRETS, enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;
    const moduleId = String(request.data?.moduleId ?? '').trim().slice(0, 60);

    const meSnap = await db.collection('users').doc(uid).get();
    const myEmail = String(meSnap.get('email') ?? '').trim();
    if (!isEmail(myEmail)) {
      return { ok: false, reason: 'Tu usuario no tiene un correo válido en Users.' };
    }

    let title = moduleId || 'ServiExpress';
    let recipients = 0;
    if (moduleId !== '') {
      const cfgSnap = await db.collection(CONFIG_COLLECTION).doc(moduleId).get();
      if (!cfgSnap.exists) {
        return { ok: false, reason: 'Esta vista todavía no tiene configuración guardada.' };
      }
      const data = cfgSnap.data() ?? {};
      if (typeof data.collection !== 'string' || data.collection === '') {
        return {
          ok: false,
          reason:
            'La configuración es de la versión anterior: vuelve a guardarla aquí para que el servidor sepa qué colección vigilar.',
        };
      }
      title = String(data.title ?? moduleId);
      recipients = Array.isArray(data.userIds) ? data.userIds.length : 0;
    }

    const error = await sendMail({
      to: [myEmail],
      subject: `[ServiExpress] Prueba de correo — ${title}`,
      text: `Prueba de correo de ServiExpress Fleet Control.\n\nSi lees esto, el envío funciona: dominio verificado, clave válida y funciones desplegadas.\n\nVista: ${title}\nDestinatarios configurados: ${recipients}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6">
        <p style="font-size:16px;font-weight:700;margin:0 0 8px">Prueba de correo</p>
        <p style="margin:0 0 12px">Si lees esto, el envío funciona: dominio verificado, clave válida y funciones desplegadas.</p>
        <p style="margin:0;color:#5b6472">Vista: <strong>${escapeHtml(title)}</strong><br>
        Destinatarios configurados: <strong>${recipients}</strong></p>
      </div>`,
      meta: { module: moduleId || null, event: 'test', byUid: uid, auto: false },
    });
    if (error) return { ok: false, reason: error };
    return { ok: true, sentTo: myEmail, recipients };
  },
);

/* ─────────────────── envío manual (se conserva) ─────────────────── */

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
  return Object.values(permissions).some((perms) => perms && perms.enviarMensajes === true);
}

exports.sendEmail = onCall(
  { region: REGION, secrets: MAIL_SECRETS, enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;
    if (!(await canSendMessages(uid))) {
      throw new HttpsError('permission-denied', 'Tu rol no tiene permiso para enviar mensajes.');
    }

    const to = String(request.data?.to ?? '').trim();
    const subject = String(request.data?.subject ?? '').trim();
    const body = String(request.data?.body ?? '').trim();
    if (!isEmail(to)) throw new HttpsError('invalid-argument', 'Correo destino inválido.');
    if (subject === '' || subject.length > 200) {
      throw new HttpsError('invalid-argument', 'El asunto no puede ir vacío ni pasar de 200 caracteres.');
    }
    if (body === '' || body.length > 20000) {
      throw new HttpsError('invalid-argument', 'El mensaje no puede ir vacío ni pasar de 20.000 caracteres.');
    }

    const error = await sendMail({
      to: [to],
      subject,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(
        body,
      )}</div>`,
      meta: { auto: false, byUid: uid, body },
    });
    if (error) throw new HttpsError('internal', `El envío fue rechazado: ${error}`);
    return { ok: true };
  },
);
