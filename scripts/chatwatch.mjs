// Pês — vigia do chat: verifica as conversas a cada minuto e envia as notificações de mensagens novas quase na hora.
// Corre no GitHub Actions em blocos de ~50 minutos, uns atrás dos outros. Quando o Cantinho mexe, corre também o Anfitrião.
// Gasta poucas leituras: com o chat parado, faz só 1 consulta por minuto.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import webpush from "web-push";
import { spawnSync } from "node:child_process";

const SA = process.env.FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY, VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
if (!SA || !VAPID_PRIVATE) { console.log("Faltam os segredos."); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(SA)) });
const db = getFirestore();
webpush.setVapidDetails("mailto:goncaloxavier13@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

const MINUTES = +(process.env.MINUTES || 50), TICK = +(process.env.TICK_SECONDS || 60) * 1000;
const end = Date.now() + MINUTES * 60e3;
const stRef = db.doc("system/chatwatch");
let cursor = (await stRef.get()).data()?.cursor || Date.now() - 15 * 60e3;
let sent = 0, ticks = 0;
const ownerKey = (await db.doc("config/app").get()).data()?.ownerKey || null;
const authorOf = async m => m.as === "claude" && ownerKey && m.from === ownerKey ? "Cláudio" : await nameOf(m.from);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const peopleCache = {};
const nameOf = async k => peopleCache[k] ??= ((await db.doc("people/" + k).get()).data()?.name || "Alguém");
const first = s => s.split(" ")[0];

async function send(key, rd, payload) {
  const push = rd?.push; if (!push || push.prefs?.messages === false) return;
  for (const [h, sub] of Object.entries(push.subs || {})) {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 86400 }); sent++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.doc("reads/" + key).update({ [`push.subs.${h}`]: FieldValue.delete() }).catch(() => {}); else console.warn("push falhou", e.statusCode || e.message); }
  }
}

// momentos marcados (Lisboa): cantinho (20:00), Preferias Flash (20:30 e 21:30) e prazos do Tribunal (10:00, 15:00, 17:00, 20:00, 21:00).
// Nesses minutos corre o cantinho.mjs logo, sem esperar pelo agendamento de 5 em 5 minutos.
const lxHM = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).replace("24:", "00:");
const MARKS = ["10:00", "15:00", "17:00", "20:00", "20:30", "21:00", "21:30"]; let lastMark = null;
while (Date.now() < end) {
  ticks++;
  { const hm = lxHM(); const mk = MARKS.find(m => hm >= m && hm < m.slice(0, 3) + String(+m.slice(3) + 3).padStart(2, "0"));
    if (mk && lastMark !== mk + new Date().toDateString()) { lastMark = mk + new Date().toDateString(); const r = spawnSync("node", ["scripts/cantinho.mjs"], { stdio: "inherit", env: process.env }); if (r.status) console.log("cantinho terminou com", r.status); } }
  try {
    const changed = (await db.collection("chats").where("lastAt", ">", cursor).get()).docs;
    if (changed.length) {
      const since = cursor; cursor = Math.max(cursor, ...changed.map(d => d.data().lastAt || 0));
      let cantinho = false;
      for (const c of changed) {
        const chat = c.data();
        if (chat.type === "cantinho") { cantinho = true; continue; }
        const msgs = (await db.collection(`chats/${c.id}/msgs`).where("at", ">", since).get()).docs.map(m => m.data()).sort((a, b) => a.at - b.at);
        if (!msgs.length) continue;
        const groupName = chat.type === "direct" ? null : (chat.name || (await db.doc("groups/" + chat.groupId).get()).data()?.name || "Grupo");
        for (const k of chat.members || []) {
          const rd = (await db.doc("reads/" + k).get()).data();
          const mine = msgs.filter(m => m.from !== k && m.at > (rd?.chats?.[c.id] || 0)); if (!mine.length) continue;
          const last = mine[mine.length - 1]; const who = first(await authorOf(last));
          await send(k, rd, { title: groupName || await authorOf(last),
            body: (mine.length === 1 ? `${groupName ? who + ": " : ""}${last.text}` : `${mine.length} mensagens novas · ${who}: ${last.text}`).slice(0, 180),
            tag: "chat-" + c.id, url: `./?g=${chat.groupId}&t=gap&c=${c.id}` });
        }
      }
      await stRef.set({ cursor, at: Date.now() }, { merge: true });
      if (cantinho) { const r = spawnSync("node", ["scripts/cantinho.mjs"], { stdio: "inherit", env: process.env }); if (r.status) console.log("cantinho terminou com", r.status); }
    }
    if (ticks % 5 === 1) await stRef.set({ alive: Date.now(), cursor }, { merge: true }); // sinal de vida para o notify.mjs
  } catch (e) { console.warn("erro no ciclo:", e.message); }
  await sleep(TICK);
}
console.log(`Feito: ${ticks} verificações, ${sent} notificações enviadas.`);
