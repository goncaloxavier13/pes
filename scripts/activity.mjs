// Pês — contadores de participação para o Activity score (mensagens, reações e cantinho), por semana e por pessoa.
// Incremental: só lê as mensagens novas desde a última execução. Grava em groups/{id}.act (só números).
// Corre no GitHub Actions a seguir às notificações. Segredo: FIREBASE_SERVICE_ACCOUNT.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const SA = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!SA) { console.log("Falta FIREBASE_SERVICE_ACCOUNT."); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(SA)) });
const db = getFirestore();
const BOT = "bot", KEEP_WEEKS = 12;

const ymd = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
function weekOf(s) { const [y, m, d] = s.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); const day = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - day + 3);
  const fy = dt.getUTCFullYear(); const jan4 = new Date(Date.UTC(fy, 0, 4)); const w = 1 + Math.round(((dt - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7); return `${fy}-W${String(w).padStart(2, "0")}`; }
const wkOf = at => weekOf(ymd(new Date(at + 3 * 3600e3))); // a semana de votação fecha ao domingo às 21h
const ms = x => x == null ? 0 : typeof x === "number" ? x : x.toMillis ? x.toMillis() : +new Date(x);

const now = Date.now(); const wkNow = wkOf(now);
const stRef = db.doc("system/activity"); const st = (await stRef.get()).data() || {};
const since = st.lastRun || 0; // primeira execução: conta tudo
const groups = Object.fromEntries((await db.collection("groups").get()).docs.map(d => [d.id, d.data()]));
const chats = Object.fromEntries((await db.collection("chats").get()).docs.map(d => [d.id, d.data()]));

const act = {}; for (const [gid, g] of Object.entries(groups)) { const a = g.act || {}; act[gid] = { w: a.w || {}, cp: a.cp || {}, rxs: a.rxs || {}, ca: {} }; }
const bump = (gid, w, k, f, n = 1) => { const W = act[gid].w[w] = act[gid].w[w] || {}; const P = W[k] = W[k] || {}; P[f] = (P[f] || 0) + n; };

let nMsgs = 0;
for (const [cid, c] of Object.entries(chats)) {
  const gid = c.groupId; if (!gid || !act[gid]) continue; const A = act[gid]; const mem = groups[gid].members || [];
  // mensagens novas
  if (ms(c.lastAt) > since) {
    const msgs = (await db.collection(`chats/${cid}/msgs`).where("at", ">", since).get()).docs.map(d => d.data()).filter(m => m.at <= now); nMsgs += msgs.length;
    for (const m of msgs) {
      const w = wkOf(m.at);
      if (m.from !== BOT && mem.includes(m.from) && !m.as) {
        if (c.type === "cantinho") { const cp = A.cp[cid] = Array.isArray(A.cp[cid]) || !A.cp[cid] ? { w: wkOf(ms(c.createdAt) || m.at), k: A.cp[cid] || [] } : A.cp[cid]; if (!cp.k.includes(m.from)) cp.k.push(m.from);
          if (m.sec === "quiz" && m.kind === "guess") bump(gid, w, m.from, "g"); else if (m.text) bump(gid, w, m.from, "m"); }
        else if (m.text || m.photo || m.img) bump(gid, w, m.from, "m");
      }
      if (c.type === "cantinho" && m.from === BOT && m.kind === "reveal") for (const [k, o] of Object.entries(m.guesses || {})) if (o === m.correct) bump(gid, w, k, "ok");
    }
  }
  // reações: conta só as novas desde a última vez (as reações vivem no documento da conversa)
  const cur = {}; Object.values(c.rx || {}).forEach(r => Object.keys(r || {}).forEach(k => { cur[k] = (cur[k] || 0) + 1; }));
  const old = A.rxs[cid] || {}; for (const [k, n] of Object.entries(cur)) if (mem.includes(k) && n > (old[k] || 0) && since) bump(gid, wkNow, k, "r", n - (old[k] || 0));
  if (Object.keys(cur).length) A.rxs[cid] = cur; else delete A.rxs[cid];
  // acesso a cantinhos (para a percentagem de participação)
  if (c.type === "cantinho") { const w = wkOf(ms(c.createdAt) || now); for (const k of c.members || []) { const W = A.ca[w] = A.ca[w] || {}; W[k] = (W[k] || 0) + 1; } }
}
// primeira execução: as reações antigas contam na semana atual
if (!since) for (const [gid, A] of Object.entries(act)) for (const cur of Object.values(A.rxs)) for (const [k, n] of Object.entries(cur)) if ((groups[gid].members || []).includes(k)) bump(gid, wkNow, k, "r", n);

for (const [gid, A] of Object.entries(act)) {
  const keep = Object.keys(A.w).sort().slice(-KEEP_WEEKS); const w = Object.fromEntries(keep.map(k => [k, A.w[k]]));
  const cp = Object.fromEntries(Object.entries(A.cp).filter(([cid]) => chats[cid]));
  await db.doc("groups/" + gid).update({ act: { at: now, w, cp, rxs: A.rxs, ca: A.ca } });
}
await stRef.set({ lastRun: now });
console.log(`Atividade atualizada: ${nMsgs} mensagens novas lidas.`);
