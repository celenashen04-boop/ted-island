import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { islands } from './public/islands.mjs';

const day = 86_400_000;
const hues = ['#F05A3C', '#1E9E6A', '#3358E0'];
const escapedCharacters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => escapedCharacters[character]);
const digest = value => createHash('sha256').update(value).digest('hex');

export function renderEmail(template, values) {
  const layout = values.quote ? template : template.replace(/<!-- Quote:[\s\S]*?(?=<!-- Primary button)/, '');
  return layout.replace(/{{(\w+)}}/g, (_, field) => escape(values[field]));
}

export function createEmailDelivery(db, { origin, key, from, send = fetch }) {
  const available = Boolean(origin && key && from);
  const template = available ? readFileSync(new URL('./public/ui/email-notification.html', import.meta.url), 'utf8') : null;
  if (!db.prepare('PRAGMA table_info(notifications)').all().some(column => column.name === 'emailed')) {
    db.exec('ALTER TABLE notifications ADD COLUMN emailed INTEGER NOT NULL DEFAULT 0');
    db.prepare('UPDATE notifications SET emailed=1 WHERE created<?').run(Date.now());
  }
  const pending = db.prepare(`
    SELECT n.*, a.email, a.public_id, a.unsubscribe_token, access.expiry, p.title, p.island AS origin_island,
           c.body, author.public_id AS author
    FROM notifications n
    JOIN accounts a ON a.player=n.recipient AND a.judge=0 AND a.email IS NOT NULL AND a.unsubscribe_token IS NOT NULL
    LEFT JOIN plants p ON p.id=n.plant
    LEFT JOIN comments c ON c.id=n.comment
    LEFT JOIN accounts author ON author.player=c.player
    LEFT JOIN island_access access ON access.player=n.recipient AND access.island=n.island
    WHERE n.emailed=0 AND n.created>=? AND n.created>=a.email_consent_at AND (
      (n.type IN ('reply','comment') AND a.remind_replies=1 AND c.id IS NOT NULL)
      OR (n.type='access-ending' AND a.remind_access=1 AND access.expiry>?
          AND n.event_key='access:'||n.island||':'||access.expiry)
      OR (n.type IN ('thirsty','retention') AND a.remind_replies=1 AND p.id IS NOT NULL)
    )
    ORDER BY n.created, n.id LIMIT 100
  `);
  const delivered = db.prepare('UPDATE notifications SET emailed=1 WHERE id=? AND recipient=? AND event_key=?');
  let running = false;

  function link(params, { token = false } = {}) {
    const url = new URL('/', origin);
    const encoded = new URLSearchParams(params);
    if (token) url.hash = encoded.toString();
    else url.search = encoded.toString();
    return url.href;
  }

  async function deliver(email, subject, html, id) {
    const response = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': id },
      body: JSON.stringify({ from, to: [email], subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Email provider HTTP ' + response.status);
    await response.body?.cancel();
  }

  async function sendGroup(group) {
    const [notice] = group;
    const accessReminder = notice.type === 'access-ending';
    const reply = notice.type === 'reply';
    const discussion = reply || notice.type === 'comment';
    const names = group.map(row => islands.find(island => island.id === row.island)?.name).filter(Boolean);
    const author = notice.author ?? 'Another player';
    const subject = accessReminder ? names.join(' and ') + ' access ends soon'
      : discussion ? author + (reply ? ' replied to you' : ' commented on your seed')
      : notice.type === 'thirsty' ? 'Your tree is getting thirsty' : 'A plant is scheduled for deletion';
    const lead = accessReminder ? 'Water or nourish an idea from ' + names.join(' or ') + ' to extend your access.'
      : discussion ? author + (reply ? ' replied to your comment on ' : ' commented on ') + notice.title + '.'
      : notice.type === 'thirsty' ? notice.title + ' can use a like or comment.'
      : notice.title + ' will be removed after 30 more days without activity.';
    const html = renderEmail(template, {
      subject, lead, quote: discussion ? notice.body : null,
      island_hex: hues[accessReminder ? notice.island : notice.origin_island],
      action_url: accessReminder ? link({ panel: 'access' }) : link({ plant: notice.plant }),
      action_label: accessReminder ? 'Open Island Access' : 'Open the plant',
      note: discussion ? 'Replying keeps the conversation and the plant growing.' : '',
      player_id: notice.public_id, preferences_url: link({ panel: 'settings' }),
      unsubscribe_url: link({ unsubscribe: notice.unsubscribe_token }, { token: true }),
    });
    const id = 'chi-notice-' + digest([notice.recipient, ...group.map(row => row.event_key)].join(':'));
    await deliver(notice.email, subject, html, id);
    for (const row of group) delivered.run(row.id, row.recipient, row.event_key);
  }

  return {
    available,
    async reset({ token, email, id }) {
      const url = escape(link({ reset: token }, { token: true }));
      await deliver(email, 'Reset your CHI Island password',
        `<p>Reset the password for ${escape(id)}. This link expires in 30 minutes.</p><p><a href="${url}">Set a new password</a></p>`,
        'chi-reset-' + digest(token));
    },
    async flush(now = Date.now()) {
      if (!available || running) return;
      running = true;
      try {
        const accessGroups = new Map();
        const groups = [];
        for (const notice of pending.all(now - day, now)) {
          if (notice.type !== 'access-ending') { groups.push([notice]); continue; }
          if (!accessGroups.has(notice.recipient)) accessGroups.set(notice.recipient, []);
          accessGroups.get(notice.recipient).push(notice);
        }
        for (const group of [...groups, ...accessGroups.values()]) {
          try { await sendGroup(group); }
          catch (error) { console.error('CHI Island email delivery:', error.message); }
        }
      } finally { running = false; }
    },
  };
}
