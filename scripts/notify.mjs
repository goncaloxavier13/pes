// Pês — envia notificações push. Corre no GitHub Actions a cada ~10 minutos.
// Segredos necessários: FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço) e VAPID_PRIVATE_KEY.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const SA = process.env.FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
if (!SA || !VAPID_PRIVATE) { console.log("Faltam os segredos FIREBASE_SERVICE_ACCOUNT / VAPID_PRIVATE_KEY — nada a fazer."); process.exit(0); }

initializeApp({ credential: cert(JSON.parse(SA)) });
const db = getFirestore();
webpush.setVapidDetails("mailto:goncaloxavier13@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

// ── time (Portugal) ──
const ymd = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hourLx = () => +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(new Date());
const weekdayLx = () => new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Lisbon", weekday: "short" }).format(new Date());
function weekOf(s) { const [y, m, d] = s.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); const day = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - day + 3);
  const fy = dt.getUTCFullYear(); const jan4 = new Date(Date.UTC(fy, 0, 4)); const w = 1 + Math.round(((dt - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7); return `${fy}-W${String(w).padStart(2, "0")}`; }
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtDay = s => { const [, m, d] = s.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };

// ── load state ──
const now = Date.now();
const stRef = db.doc("system/notify");
const st = (await stRef.get()).data() || {};
const since = Math.max(st.lastRun || now - 15 * 6e4, now - 6 * 3600e3); // never look back more than 6 h
const all = async c => Object.fromEntries((await db.collection(c).get()).docs.map(d => [d.id, d.data()]));
const [people, groups, reads] = await Promise.all([all("people"), all("groups"), all("reads")]);
const name = k => people[k]?.name || "Alguém";
const first = k => name(k).split(" ")[0];

let sent = 0;
async function send(key, pref, payload) {
  const push = reads[key]?.push; if (!push || push.prefs?.[pref] === false) return;
  for (const [h, sub] of Object.entries(push.subs || {})) {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 86400 }); sent++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await db.doc("reads/" + key).update({ [`push.subs.${h}`]: FieldValue.delete() }).catch(() => {});
      else console.warn("push falhou", key, e.statusCode || e.message);
    }
  }
}

// 1) eventos novos
for (const d of (await db.collection("events").where("createdAt", ">", since).get()).docs) {
  const e = d.data(); const g = groups[e.groupId]; if (!g) continue;
  for (const k of Object.keys(e.att || {})) {
    if (k === e.createdBy || e.att[k] === "no") continue;
    await send(k, "events", { title: `Novo evento em ${g.name}`, body: `${first(e.createdBy)} adicionou-te a “${e.title}” · ${fmtDay(e.date)}${e.time ? " às " + e.time : ""}`, tag: "ev-" + d.id, url: `./?g=${e.groupId}&t=events` });
  }
}

// 2) mensagens novas (agrupadas por conversa)
for (const c of (await db.collection("chats").where("lastAt", ">", since).get()).docs) {
  const chat = c.data();
  const msgs = (await db.collection(`chats/${c.id}/msgs`).where("at", ">", since).get()).docs.map(m => m.data()).sort((a, b) => a.at - b.at);
  if (!msgs.length) continue;
  const title = chat.type === "direct" ? null : (chat.name || groups[chat.groupId]?.name || "Grupo");
  for (const k of chat.members || []) {
    const mine = msgs.filter(m => m.from !== k && m.at > (reads[k]?.chats?.[c.id] || 0)); if (!mine.length) continue;
    const last = mine[mine.length - 1];
    await send(k, "messages", {
      title: title || name(last.from),
      body: mine.length === 1 ? `${title ? first(last.from) + ": " : ""}${last.text}`.slice(0, 180) : `${mine.length} mensagens novas · ${first(last.from)}: ${last.text}`.slice(0, 180),
      tag: "chat-" + c.id, url: `./?g=${chat.groupId}&t=gap&c=${c.id}`,
    });
  }
}

// 3) lembrete na véspera (a partir das 18h em Portugal)
const tomorrow = (() => { const [y, m, d] = ymd().split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); })();
if (hourLx() >= 18) {
  for (const d of (await db.collection("events").where("date", "==", tomorrow).get()).docs) {
    const e = d.data(); if (e.reminded) continue;
    for (const k of Object.keys(e.att || {})) {
      if (e.att[k] === "no") continue;
      await send(k, "reminders", { title: `Amanhã: ${e.title}`, body: [e.time && `às ${e.time}`, e.place].filter(Boolean).join(" · ") || "Não te esqueças!", tag: "rem-" + d.id, url: `./?g=${e.groupId}&t=events` });
    }
    await d.ref.update({ reminded: true });
  }
}

// 4) votação de domingo (a partir das 18h; uma vez por semana)
const wk = weekOf(ymd());
if (weekdayLx() === "Sun" && hourLx() >= 18 && st.weekly !== wk) {
  const [awards, votes, rankings] = await Promise.all([all("awards"), all("votes"), all("rankings")]);
  const todo = {}, firstG = {};
  for (const [gid, g] of Object.entries(groups)) {
    // Gala already happened this week: the season is closed until Monday, no reminder
    if ((g.galas || []).some(d => d < ymd() && weekOf(d) === wk)) continue;
    const aw = Object.entries(awards).filter(([, a]) => a.groupId === gid).map(([id]) => id);
    for (const k of g.members || []) {
      const v = votes[k]?.weeks?.[wk] || {}; const r = rankings[k]?.weeks?.[wk]?.[gid];
      const missingVote = aw.some(id => !v[id]); const missingRank = (g.members || []).length > 1 && !r;
      if (missingVote || missingRank) { (todo[k] = todo[k] || []).push(g.name); (firstG[k] = firstG[k] || gid); }
    }
  }
  for (const [k, gs] of Object.entries(todo))
    await send(k, "votes", { title: "Ainda vais a tempo de votar", body: `Faltam os teus votos ou o ranking em ${gs.slice(0, 3).join(", ")}. O prazo acaba hoje às 23:59.`, tag: "votes-" + wk, url: `./?g=${firstG[k]}&t=journey` });
  st.weekly = wk;
}

await stRef.set({ lastRun: now, weekly: st.weekly || null }, { merge: true });
console.log(`Feito: ${sent} notificações enviadas.`);
process.exit(0);
