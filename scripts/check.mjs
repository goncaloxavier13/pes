// Pês — verificação só de leitura (não altera nada). Imprime apenas contagens, sem dados pessoais.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const all = async c => Object.fromEntries((await db.collection(c).get()).docs.map(d => [d.id, d.data()]));
const ymd = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
function weekOf(s) { const [y, m, d] = s.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); const day = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - day + 3);
  const fy = dt.getUTCFullYear(); const jan4 = new Date(Date.UTC(fy, 0, 4)); const w = 1 + Math.round(((dt - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7); return `${fy}-W${String(w).padStart(2, "0")}`; }
const [people, groups, uids, rankings, votes, awards, events, reads, chats, sys] = await Promise.all(["people","groups","uids","rankings","votes","awards","events","reads","chats","system"].map(all));
const wk = weekOf(ymd()); const prev = weekOf(ymd(new Date(Date.now() - 7 * 864e5)));
const out = { semana: wk, pessoas: Object.keys(people).length, contas_ligadas: Object.keys(uids).length, problemas: [] };
const mapped = Object.values(uids).map(u => u.key || u.person || u.k || u);
const dupMap = mapped.filter((k, i) => mapped.indexOf(k) !== i).length; if (dupMap) out.problemas.push(`${dupMap} contas ligadas ao mesmo perfil`);
for (const [gid, g] of Object.entries(groups)) {
  const ms = g.members || []; const aw = Object.entries(awards).filter(([, a]) => a.groupId === gid).map(([id]) => id);
  const orphan = ms.filter(k => !people[k]).length; if (orphan) out.problemas.push(`${g.name}: ${orphan} membros sem perfil`);
  const noAcc = ms.filter(k => !mapped.includes(k)).length;
  const r = w => ms.filter(k => rankings[k]?.weeks?.[w]?.[gid]).length;
  const full = w => ms.filter(k => rankings[k]?.weeks?.[w]?.[gid] && aw.every(id => votes[k]?.weeks?.[w]?.[id])).length;
  const ev = Object.values(events).filter(e => e.groupId === gid).length;
  const push = ms.filter(k => Object.keys(reads[k]?.push?.subs || {}).length).length;
  const bd = ms.filter(k => people[k]?.birthday).length;
  out[g.name] = { membros: ms.length, sem_conta: noAcc, premios: aw.length, ranking_esta_semana: r(wk), ranking_e_premios_esta_semana: full(wk), ranking_semana_anterior: r(prev), eventos: ev, notificacoes_ativas: push, aniversarios: bd, gala: g.galaDate || g.gala || null, gala_aberta: !!g.galaOpen };
}
out.conversas = Object.keys(chats).length;
const n = sys.notify || {}; out.notificacoes_ultima_execucao = n.lastRun ? new Date(n.lastRun).toISOString() : null;
console.log(JSON.stringify(out, null, 2));
