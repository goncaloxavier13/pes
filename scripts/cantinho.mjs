// Pês — o Cantinho: de 2 em 2 dias uma pessoa do grupo (sorteada, sem repetir até passarem todos) fica no cantinho.
// 3 secções: 💭 Pensamentos (escrita livre), ❓ Perguntas (o Anfitrião faz uma pergunta nova a cada resposta) e
// 🎯 Quanto conheces o …? (responde em segredo; o grupo adivinha entre 4 opções). No fim, o resumo (calculado na app).
// Corre no GitHub Actions. Segredos: FIREBASE_SERVICE_ACCOUNT e VAPID_PRIVATE_KEY.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import webpush from "web-push";
import { PHILO, ROUTINE, PREF, PROV } from "./cantinho-temas.mjs";
import { QUIZ } from "./cantinho-quiz.mjs";

const SA = process.env.FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY, VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const DRY = !!(process.env.DRY_WEEK || process.env.DRY_DAY); // test: simulate a week without writing anything
if (!SA) { console.log("Falta FIREBASE_SERVICE_ACCOUNT."); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(SA)) });
const db = getFirestore();
if (VAPID_PRIVATE) webpush.setVapidDetails("mailto:goncaloxavier13@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

const Q_START = "2026-W47";
const CANT_START = "2026-W48", FULL_VOTE_FROM = "2026-W47", BOT = "bot";
const ymd = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hourLx = () => +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(new Date());
function weekOf(s) { const [y, m, d] = s.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); const day = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - day + 3);
  const fy = dt.getUTCFullYear(); const jan4 = new Date(Date.UTC(fy, 0, 4)); const w = 1 + Math.round(((dt - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7); return `${fy}-W${String(w).padStart(2, "0")}`; }
function weekMonday(w) { const y = +w.slice(0, 4), n = +w.slice(6); const jan4 = new Date(Date.UTC(y, 0, 4)); const mon = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (n - 1) * 7); return mon; }
const prevWeek = w => weekOf(new Date(weekMonday(w).getTime() - 3 * 864e5).toISOString().slice(0, 10));
const weekEndMs = w => weekMonday(w).getTime() + 7 * 864e5 - 3 * 3600e3; // domingo às 21h
const ms = x => x == null ? 0 : typeof x === "number" ? x : x.toMillis ? x.toMillis() : +new Date(x);

// ── weekly questions (same list and order as the app) ──
const QUESTIONS=[
"Quem é o mais provável de se esquecer do próprio aniversário?","Bateste com o carro: a quem ligas primeiro?","Tens um cão e vais de férias: a quem o deixas?",
"Quem é o mais provável de ficar famoso?","Quem sobreviveria mais tempo numa ilha deserta?","Ficaste fechado fora de casa às 3h: a quem ligas?",
"Quem é o mais provável de chegar atrasado ao próprio casamento?","A quem confiarias o PIN do teu cartão?","Quem é o mais provável de ganhar o Euromilhões e perder o bilhete?",
"Precisas de um álibi: quem escolhes?","Quem é o mais provável de adormecer num concerto?","Quem levarias para uma entrevista de emprego como teu advogado?",
"Quem é o mais provável de se perder com o GPS ligado?","A quem pedias conselhos amorosos?","Quem é o mais provável de abrir um restaurante?",
"Vais mudar de casa: quem ajuda de certeza?","Quem é o mais provável de chorar num filme da Disney?","A quem deixavas as chaves de casa durante um mês?",
"Quem é o mais provável de ser presidente da Junta?","Quem é o mais provável de desaparecer de uma festa sem dizer nada?","Precisas de 500€ emprestados hoje: a quem pedes?",
"Quem é o mais provável de fazer uma tatuagem de que se arrepende?","Quem escolhias para fazer equipa num quiz?","Quem é o mais provável de se meter numa discussão com um árbitro?",
"Quem cozinha o melhor jantar do grupo?","Quem é o mais provável de ir viver para o estrangeiro?","Ficaste sem bateria numa cidade desconhecida: quem queres ao teu lado?",
"Quem é o mais provável de comer a última fatia sem perguntar?","A quem contarias um segredo que não podes contar a ninguém?","Quem é o mais provável de ser preso por algo ridículo?",
"Quem levarias para uma viagem de mochila às costas?","Quem é o mais provável de se casar primeiro?","Quem é o mais provável de esquecer onde estacionou?",
"Quem deveria ser o padrinho do teu casamento?","Quem é o mais provável de entrar num reality show?","Estás doente em casa: quem te leva canja?",
"Quem é o mais provável de ganhar uma discussão sem ter razão?","Quem escolhias para conduzir numa fuga?","Quem é o mais provável de responder a uma mensagem só 3 dias depois?",
"Quem é o mais provável de ter um segundo emprego secreto?","A quem confiavas a escolha do restaurante para o jantar de Natal?","Quem é o mais provável de cantar no karaoke sem ser preciso pedir?",
"Quem é o mais provável de adotar 5 gatos?","Quem levavas para um apocalipse zombie?","Quem é o mais provável de mandar mensagem para a pessoa errada?",
"Precisas de alguém que fale com o senhorio por ti: quem?","Quem é o mais provável de começar uma dieta e desistir no mesmo dia?","Quem é o mais provável de se tornar milionário?",
"Quem é o melhor a contar histórias à mesa?","A quem pedias para escolher a tua roupa para um casamento?","Quem é o mais provável de ser o último a sair da festa?",
"Quem é o mais provável de fazer uma maratona?","Ficaste preso num elevador durante 3 horas: com quem queres estar?","Quem é o mais provável de se esquecer de um jantar marcado?",
"Quem tem o pior sentido de orientação?","Quem é o mais provável de abrir um podcast?","Quem escolhias para negociar a compra do teu carro?",
"Quem é o mais provável de dizer 'só mais uma' e ficar até às 6h?","A quem pedias ajuda para montar um móvel do IKEA?","Quem é o mais provável de ter uma conta secreta no TikTok?",
"Quem é o mais provável de ser apanhado a dormir no trabalho?","Quem levavas para ver um jogo decisivo do teu clube?","Quem é o mais provável de mudar de clube de futebol?",
"Quem tem o melhor gosto musical?","Quem é o mais provável de fazer uma surpresa que corre mal?","Precisas de um discurso emocionante: quem o escreve?",
"Quem é o mais provável de se esquecer do nome de alguém a meio da conversa?","Quem é o mais provável de ganhar um concurso de dança?","A quem ligavas para ir buscar-te ao aeroporto às 5h?",
"Quem é o mais provável de ser influencer?","Quem é o mais provável de fazer as compras de Natal no dia 24?","Quem é o mais provável de perder o telemóvel numa noite de copos?",
"Quem escolhias como colega de casa?","Quem é o mais provável de chorar no jantar de Natal?","Quem é o mais provável de mentir sobre a idade?",
"Quem tem a gargalhada mais contagiante?","Quem é o mais provável de ser expulso de um bar?","A quem confiavas a organização da tua despedida de solteiro?",
"Quem é o mais provável de ficar com a conta toda do jantar por engano?","Quem é o mais provável de saber os mexericos antes de toda a gente?","Quem levavas a um casino com 100€?",
"Quem é o mais provável de ter um plano para tudo?","Quem é o mais provável de fazer amizade com um desconhecido no comboio?","A quem pedias para tomar conta de uma planta durante um ano?",
"Quem é o mais provável de ganhar um prémio Nobel?","Quem é o mais provável de esquecer-se do aniversário da namorada?","Quem é o mais provável de aparecer de fato de treino num casamento?",
"Quem escolhias para fazer contigo o Caminho de Santiago?","Quem é o mais provável de comprar algo inútil na Internet às 3h?","Quem é o mais provável de se atirar à piscina vestido?",
"Precisas de alguém para te defender numa discussão: quem chamas?","Quem é o mais provável de ser o primeiro a ter filhos?","Quem é o mais provável de ter um blogue de culinária?",
"Quem dá os melhores abraços?","Quem é o mais provável de esquecer-se da carteira no jantar?","A quem pedias para escolher o teu próximo carro?",
"Quem é o mais provável de fazer bungee jumping?","Quem é o mais provável de ser o primeiro a desistir numa caminhada?","Quem é o mais provável de escrever um livro?",
"Quem levavas para um fim de semana em Paris?","Quem é o mais provável de ainda estar a dormir ao meio-dia de sábado?","Quem é o mais provável de te ligar só para conversar?",
"Quem seria o melhor professor?","Quem é o mais provável de fazer uma tatuagem com o nome do grupo?","Tens um problema às 4h da manhã: quem atende o telefone?",
"Quem é o mais provável de ganhar um jogo de póquer a fazer bluff?","Quem é o mais provável de se candidatar a um programa de culinária?","Quem é o mais provável de ser o mais velho a jogar futebol de 5?",
"Quem é o mais provável de organizar a próxima viagem do grupo?","Quem é o mais provável de inventar uma desculpa genial para faltar?","A quem deixavas escolher o filme de sexta à noite?",
];
function hashStr2(t){ let h=2166136261; for(const c of t){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function weekQuestions(gid,w){ if(!w||w<Q_START) return []; const y=+w.slice(0,4), n=+w.slice(6); const N=QUESTIONS.length;
  // a fixed shuffle per group and year, walked 2 by 2 each week → no repeats within the year
  const idx=[...Array(N).keys()]; let seed=hashStr2(gid+"|"+y); for(let i=N-1;i>0;i--){ seed=(Math.imul(seed,1664525)+1013904223)>>>0; const j=seed%(i+1); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  return [0,1].map(o=>{ const i=idx[((n-1)*2+o)%N]; return {id:"q:"+i,text:QUESTIONS[i]}; }); }

// ── pedidos de admins para apagar eventos de outras pessoas (as regras só deixam o criador apagar diretamente) ──
if (!DRY) {
  const rs = await db.collection("reads").get();
  for (const d of rs.docs) { const req = d.data().delReq; if (!req || !Object.keys(req).length) continue;
    for (const [eid, r] of Object.entries(req)) {
      const ev = (await db.doc("events/" + eid).get()).data(); const g = ev && (await db.doc("groups/" + ev.groupId).get()).data();
      if (ev && g && (g.admins || []).includes(d.id)) { await db.doc("events/" + eid).delete(); console.log("Evento apagado a pedido de um admin."); }
      else console.log("Pedido de apagar evento ignorado (não é admin ou o evento já não existe).");
    }
    await db.doc("reads/" + d.id).update({ delReq: FieldValue.delete() });
  }
}

const today = ymd(); const wk = weekOf(today); const wkV = weekOf(ymd(new Date(Date.now() + 3 * 3600e3))); // semana de votação (fecha domingo 21h)
// ── períodos de 2 dias: o período 0 é 23–24 nov 2026 (o cantinho do Manel) ──
// ── períodos de 2 dias que mudam às 20:00 (Lisboa): o período 0 vai de 23 nov 20:00 a 25 nov 20:00 (o cantinho do Manel) ──
const lxOff = (t = Date.now()) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(t / 1000) * 1000; };
const lxNow = process.env.DRY_DAY ? Date.UTC(+process.env.DRY_DAY.slice(0, 4), +process.env.DRY_DAY.slice(5, 7) - 1, +process.env.DRY_DAY.slice(8, 10), 21) : Date.now() + lxOff();
const P0 = Date.UTC(2026, 10, 23, 20), PLEN = 2 * 864e5;
const period = Math.floor((lxNow - P0) / PLEN);
const periodEndMs = p => { const local = P0 + (p + 1) * PLEN; return local - lxOff(local); }; // 20:00 em Lisboa

const all = async c => Object.fromEntries((await db.collection(c).get()).docs.map(d => [d.id, d.data()]));
const [people, groups, rankings, votes, awards, events, reads] = await Promise.all(["people", "groups", "rankings", "votes", "awards", "events", "reads"].map(all));
// eventos antigos: as presenças que já existem contam como marcadas pelo organizador (a partir de agora, quem se marca sozinho fica para o organizador confirmar)
if (!DRY) for (const [id, e] of Object.entries(events)) { if (Array.isArray(e.org)) continue;
  const org = Object.keys(e.att || {}).filter(k => k !== e.createdBy && e.att[k] === "yes"); try { await db.doc("events/" + id).update({ org }); e.org = org; } catch (err) { console.log("org", id, err.message); } }
const name = k => k === BOT ? "Anfitrião" : people[k]?.name || "Alguém"; const first = k => name(k).split(" ")[0];
const stRef = db.doc("system/cantinho"); const st = (await stRef.get()).data() || {};

// Same rule as the app: the vote of a week is complete = ranking (+ awards and questions from W47 on)
function weekComplete(gid, k, w) {
  if (!rankings[k]?.weeks?.[w]?.[gid]) return false; if (w < FULL_VOTE_FROM) return true;
  const v = votes[k]?.weeks?.[w] || {}; const end = weekEndMs(w);
  const aw = Object.entries(awards).filter(([, a]) => a.groupId === gid && (!a.createdAt || ms(a.createdAt) < end)).map(([id]) => id);
  return [...aw, ...weekQuestions(gid, w).map(q => q.id), ...(w >= "2026-W48" ? ["reg:irrit", "reg:expert", "reg:coro", "reg:mom"] : [])].every(id => v[id]);
}

let sent = 0;
async function send(key, payload) {
  if (DRY || !VAPID_PRIVATE) return; const push = reads[key]?.push; if (!push || push.prefs?.messages === false) return;
  for (const [h, sub] of Object.entries(push.subs || {})) {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 86400 }); sent++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.doc("reads/" + key).update({ [`push.subs.${h}`]: FieldValue.delete() }).catch(() => {}); }
  }
}


// ── 💡 Portal da Criatividade: as ideias de rubrica (reads/{k}.ideas) vão para a caixa do criador da app ──
if (!DRY) { const ownerKey = (await db.doc("config/app").get()).data()?.ownerKey; if (ownerKey) { const box = reads[ownerKey]?.ideasInbox || {}; let nNew = 0, last = null;
  for (const [k, r] of Object.entries(reads)) for (const [id, x] of Object.entries(r?.ideas || {})) { if (!x || !x.name || box[k + "_" + id]) continue;
    const it = { from: k, name: String(x.name).slice(0, 80), desc: String(x.desc || "").slice(0, 2000), gid: x.gid || null, at: x.at || Date.now() };
    await db.doc("reads/" + ownerKey).set({ ideasInbox: { [k + "_" + id]: it } }, { merge: true }); box[k + "_" + id] = it; nNew++; last = it; }
  if (nNew) await send(ownerKey, { title: nNew === 1 ? `💡 Nova ideia de rubrica: ${last.name}` : `💡 ${nNew} ideias novas de rubrica`, body: nNew === 1 ? `Sugerida por ${first(last.from)}. Vê no Portal da Criatividade.` : "Vê no Portal da Criatividade.", tag: "portal", url: `./?g=${last.gid || ""}&t=rubricas&portal=1` }); } }

// ── perguntas do Anfitrião (❓): rodam entre 4 tipos e não se repetem por grupo até se esgotarem ──
const rnd = n => Math.floor(Math.random() * n);
const pick = (n, used) => { const free = [...Array(n).keys()].filter(i => !used.includes(i)); const pool = free.length ? free : [...Array(n).keys()]; return pool[rnd(pool.length)]; };
const QTYPES = [["P", PHILO.map(t => t[0])], ["R", ROUTINE.map(t => t[0])], ["F", PREF], ["M", PROV]];
function nextQ(gs, n) { const [k, arr] = QTYPES[n % QTYPES.length]; const key = "used" + k; let used = gs[key] || []; if (used.length >= arr.length) used = [];
  const i = pick(arr.length, used); gs[key] = [...used, i]; return { qk: k + i, text: arr[i] }; }
function nextQuiz(gs) { let used = gs.usedQuiz || []; if (used.length >= QUIZ.length) used = []; const i = pick(QUIZ.length, used); gs.usedQuiz = [...used, i]; return i; }
async function say(cid, msg, last) { const at = Date.now(); if (DRY) { console.log("[simulação] mensagem", msg.sec, msg.kind || ""); return; }
  await db.collection(`chats/${cid}/msgs`).add({ from: BOT, at, ...msg }); if (last) await db.doc("chats/" + cid).update({ lastAt: at, lastText: last.slice(0, 140), lastFrom: BOT }); }
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

async function revealAll(cid, chat, gs, msgs) {
  msgs = msgs || (await db.collection(`chats/${cid}/msgs`).orderBy("at", "asc").get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const z = msgs.filter(m => m.sec === "quiz"); const others = (chat.members || []).filter(k => k !== chat.host); gs.quiz = gs.quiz || {}; let n = 0;
  for (const vote of z.filter(m => m.kind === "vote" && m.from === BOT)) { const qi = vote.qi; if (z.some(m => m.kind === "reveal" && m.qi === qi)) continue;
    const sol = gs.quiz[cid + ":" + qi]; if (!sol) continue;
    const guesses = {}; z.filter(m => m.kind === "guess" && m.qi === qi && others.includes(m.from)).forEach(m => { guesses[m.from] = m.opt; });
    await say(cid, { sec: "quiz", kind: "reveal", qi, text: vote.text, opts: vote.opts, correct: sol.correct, answer: sol.answer, guesses }); n++; }
  if (n) console.log(`Revelações no fim do cantinho: ${n}.`);
}

const newSt = { ...st };
for (const [gid, g0] of Object.entries(groups)) {
  const g = { id: gid, ...g0 }; const mem = g.members || []; if (mem.length < 2) continue;
  if ((g.galas || []).some(d => d < today && weekOf(d) === wk)) continue; // época fechada depois da Gala
  const gs = newSt[gid] = { round: [], ...(st[gid] || {}) }; gs.round = [...(gs.round || gs.cycle || [])];
  const url = c => `./?g=${gid}&t=gap&c=${c}`;
  const pv = prevWeek(wkV); const eligible = mem.filter(k => weekComplete(gid, k, pv)); // quem completou a última votação fechada

  // 0) o cantinho antigo do Manel (semanal) passa a ser o período 0
  const legacy = `cant-${gid}-2026-W48`; const lg = (await db.doc("chats/" + legacy).get()).data();
  if (lg && lg.period === undefined && !DRY) { await db.doc("chats/" + legacy).update({ period: 0, endsAt: periodEndMs(0) }); if (!gs.round.includes(lg.host)) gs.round.push(lg.host); }
  const cidOf = p => p === 0 && lg ? legacy : `cant-${gid}-p${p}`;

  // 1) fechar o período anterior: avisar que há resumo
  const prevCid = cidOf(period - 1); if (period > 0 && !(gs.closed || []).includes(prevCid)) {
    const pc = (await db.doc("chats/" + prevCid).get()).data();
    if (pc) { await revealAll(prevCid, pc, gs); if (!DRY) await db.doc("chats/" + prevCid).update({ closed: true });
      for (const k of pc.members || []) await send(k, { title: `🛋️ O ${pc.name} terminou`, body: "Vê o resumo: quanto o grupo o conhece, quem acertou mais e todas as respostas 📋", tag: "cant-sum-" + prevCid, url: url(prevCid) + "&sum=1" }); }
    gs.closed = [...(gs.closed || []).slice(-30), prevCid];
  }

  // 2) abrir o cantinho deste período
  const cid = cidOf(period); const ref = db.doc("chats/" + cid); let chat = (await ref.get()).data();
  if (!chat) {
    let pool = eligible.filter(k => !gs.round.includes(k)); if (!pool.length) { const lastH = gs.round[gs.round.length - 1]; gs.round = []; pool = eligible.length > 1 ? eligible.filter(k => k !== lastH) : eligible; } // ronda nova quando já passaram todos
    const host = pool.length ? pool[rnd(pool.length)] : null;
    if (!host) { console.log(`${g.name}: ninguém com acesso para o cantinho.`); continue; }
    gs.round.push(host);
    const members = [...new Set([...eligible, host])];
    chat = { groupId: gid, type: "cantinho", host, period, week: wkV, endsAt: periodEndMs(period), name: `Cantinho do ${first(host)}`, members, createdBy: BOT, createdAt: Date.now(), lastAt: null, lastText: "", lastFrom: null };
    console.log(`${g.name}: cantinho aberto (período ${period}, ${members.length} com acesso).`);
    if (!DRY) await ref.set(chat);
    const q0 = nextQ(gs, 0); const z = nextQuiz(gs);
    await say(cid, { sec: "q", q: true, qk: q0.qk, text: `Bem-vindo ao cantinho, ${first(host)} 🛋️ Durante 2 dias o espaço é teu. Primeira pergunta: ${q0.text}` });
    await say(cid, { sec: "quiz", kind: "ask", qi: z, text: QUIZ[z][0], choices: QUIZ[z][1] }, `🛋️ É a vez do ${first(host)} no cantinho!`);
    for (const k of members) await send(k, k === host
      ? { title: "🛋️ É a tua vez no cantinho!", body: "Durante 2 dias o cantinho é teu: pensamentos, perguntas e o grupo vai tentar adivinhar as tuas respostas 🎯", tag: "cant-" + cid, url: url(cid) }
      : { title: `🛋️ Novo cantinho: é a vez do ${first(host)}!`, body: `Vai às Rubricas: durante 2 dias vais poder ler o ${first(host)} e adivinhar as respostas dele 🎯`, tag: "cant-" + cid, url: url(cid) });
    for (const k of mem) if (!members.includes(k)) await send(k, { title: `🔒 Há um cantinho novo no ${g.name}`, body: `É a vez do ${first(host)}… mas tu não votaste e ficas de fora 😬`, tag: "cant-" + cid, url: `./?g=${gid}&t=rubricas` });
    if (DRY) continue;
  }
  if (chat.closed) continue;
  if (!DRY && chat.endsAt !== periodEndMs(period)) { chat.endsAt = periodEndMs(period); await ref.update({ endsAt: chat.endsAt }); } // muda às 20:00
  const host = chat.host; const others = (chat.members || []).filter(k => k !== host);
  const msgs = (await db.collection(`chats/${cid}/msgs`).orderBy("at", "asc").get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const sec = m => m.sec || (m.from === BOT ? "q" : "q");

  // 3) notificações: publicações novas da pessoa do cantinho (pensamentos e respostas)
  const seen = gs.seen?.[cid] || 0; const fresh = msgs.filter(m => m.from === host && m.at > seen && (sec(m) === "pens" || sec(m) === "q") && m.text);
  if (fresh.length) {
    const m = fresh[fresh.length - 1];
    for (const k of others) await send(k, { title: `🛋️ ${chat.name}`, body: `${sec(m) === "pens" ? "💭" : "❓"} ${first(host)}: ${m.text}`.slice(0, 160) + (fresh.length > 1 ? ` (+${fresh.length - 1})` : ""), tag: "cant-" + cid, url: url(cid) });
    const fomo = gs.fomo?.day === today ? gs.fomo.list || [] : [];
    for (const k of mem) if (!(chat.members || []).includes(k) && !fomo.includes(k)) { fomo.push(k); await send(k, { title: `🔒 Há novidades no ${chat.name}`, body: `O ${first(host)} escreveu no cantinho… e tu não podes ler 😬 Vota esta semana para entrares no próximo.`, tag: "cant-fomo-" + gid, url: `./?g=${gid}&t=gap` }); }
    gs.fomo = { day: today, list: fomo };
  }
  gs.seen = { ...(gs.seen || {}), [cid]: Math.max(seen, ...msgs.filter(m => m.from === host).map(m => m.at)) };

  // 4) ❓ perguntas: a cada resposta, uma pergunta nova (tipo diferente)
  const qMsgs = msgs.filter(m => sec(m) === "q"); const lastQ = qMsgs[qMsgs.length - 1];
  if (lastQ && lastQ.from === host && Date.now() < chat.endsAt - 15 * 60e3) {
    const n = qMsgs.filter(m => m.from === BOT && m.q).length; const q = nextQ(gs, n);
    await say(cid, { sec: "q", q: true, qk: q.qk, text: q.text });
    await send(host, { title: "🛋️ Nova pergunta no teu cantinho", body: q.text.slice(0, 140), tag: "cant-host-" + cid, url: url(cid) });
  }

  // 5) 🎯 quanto conheces: pergunta → resposta secreta → 4 opções → votos; tudo se revela no fim do cantinho
  const z = msgs.filter(m => sec(m) === "quiz"); const asks = z.filter(m => m.kind === "ask"); const cur = asks[asks.length - 1];
  if (!cur && Date.now() < chat.endsAt - 2 * 3600e3) { const n0 = nextQuiz(gs); // cantinhos antigos sem 🎯: arranca agora
    await say(cid, { sec: "quiz", kind: "ask", qi: n0, text: QUIZ[n0][0], choices: QUIZ[n0][1] });
    await send(host, { title: "🎯 Novo no teu cantinho: quanto te conhecem?", body: `${QUIZ[n0][0]} Responde em segredo, o grupo vai tentar adivinhar.`, tag: "cant-host-" + cid, url: url(cid) }); }
  if (cur) {
    const qi = cur.qi; const answered = z.find(m => m.kind === "answered" && m.qi === qi && m.from === host);
    const vote = z.find(m => m.kind === "vote" && m.qi === qi && m.from === BOT); const reveal = z.find(m => m.kind === "reveal" && m.qi === qi);
    gs.quiz = gs.quiz || {};
    if (answered && !vote) {
      const secret = ((await db.doc("reads/" + host).get()).data()?.quizAns?.[cid]?.[qi] || "").toString().trim().slice(0, 60);
      if (secret) {
        const others3 = shuffle(QUIZ[qi][1].filter(o => o.toLowerCase() !== secret.toLowerCase())).slice(0, 3); const opts = shuffle([secret, ...others3]);
        gs.quiz[cid + ":" + qi] = { correct: opts.indexOf(secret), answer: secret };
        await say(cid, { sec: "quiz", kind: "vote", qi, text: QUIZ[qi][0], opts }, `🎯 ${QUIZ[qi][0]}`);
        for (const k of others) await send(k, { title: `🎯 Quanto conheces o ${first(host)}?`, body: `${QUIZ[qi][0]} O ${first(host)} já respondeu em segredo. Adivinha!`, tag: "cant-quiz-" + cid, url: url(cid) });
      }
    }
    // próxima pergunta logo a seguir (as revelações ficam todas para o fim do cantinho)
    const nAsks = asks.length;
    if (vote && nAsks < 15 && Date.now() < chat.endsAt - 2 * 3600e3) { const n = nextQuiz(gs); await say(cid, { sec: "quiz", kind: "ask", qi: n, text: QUIZ[n][0], choices: QUIZ[n][1] });
      await send(host, { title: "🎯 Nova pergunta: quanto te conhecem?", body: `${QUIZ[n][0]} Responde em segredo, o grupo vai tentar adivinhar.`, tag: "cant-host-" + cid, url: url(cid) }); }
  }
  // no fim do período, revela tudo (o resumo é calculado a partir daqui)
  if (Date.now() >= chat.endsAt - 5 * 60e3) await revealAll(cid, chat, gs, msgs);

  // 6) contadores públicos (só números) para o ecrã de quem está de fora
  if (!DRY) { const posts = msgs.filter(m => m.from === host && (sec(m) === "pens" || sec(m) === "q")).length; const prevC = g.cant || {};
    if (prevC.period !== period || prevC.answers !== posts || prevC.inside !== (chat.members || []).length)
      await db.doc("groups/" + gid).update({ cant: { week: wkV, period, answers: posts, inside: (chat.members || []).length } }); }
}
// ── ⚡ Preferias Flash: um dilema por dia, lançado às 21:30 (Lisboa) e aberto até ao lançamento seguinte.
//    No lançamento saem os resultados do dilema anterior (na app, só para quem jogou). Notifica todos os membros.
//    Às 20:30 lembra quem ainda não jogou o dilema que está a acabar.
{ const PF_DAY0 = "2026-11-23"; const d0 = new Date(lxNow); const mins = d0.getUTCHours() * 60 + d0.getUTCMinutes(); const todayL = d0.toISOString().slice(0, 10);
  const addD = (s, n) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + n)).toISOString().slice(0, 10);
  const ed = mins >= 21 * 60 + 30 ? todayL : addD(todayL, -1); const prevEd = addD(ed, -1);
  const played = (k, e) => !!votes[k]?.weeks?.[weekOf(e)]?.["pf:" + e];
  const pf = newSt.pf || {};
  if (ed >= PF_DAY0 && pf.launched !== ed && mins >= 21 * 60 + 30 && mins < 23 * 60 + 59) {
    for (const [gid, g] of Object.entries(groups)) { const mem = g.members || []; if (mem.length < 2) continue;
      if ((g.galas || []).some(d => d < today && weekOf(d) === wk)) continue;
      const pv = prevWeek(wkV); const url = `./?g=${gid}&t=rubricas`;
      for (const k of mem) { const can = weekComplete(gid, k, pv); const hadPrev = prevEd >= PF_DAY0;
        await send(k, !can ? { title: "⚡ Saiu o Preferias Flash de hoje", body: "Toda a gente já está a escolher… menos tu 🔒 Quem não completou a votação não joga.", tag: "pf-" + ed, url }
          : { title: "⚡ Saiu o Preferias Flash de hoje!", body: hadPrev ? (played(k, prevEd) ? "Dilema novo, e já saíram os resultados de ontem 👀" : "Dilema novo. Os resultados de ontem já saíram, mas não jogaste, por isso não os vês 😏") : "Um dilema novo todos os dias às 21:30. Amanhã à mesma hora saem os resultados (só para quem jogou) 😏", tag: "pf-" + ed, url }); }
    }
    pf.launched = ed; console.log("Preferias Flash lançado.");
  }
  if (ed >= PF_DAY0 && pf.reminded !== ed && mins >= 20 * 60 + 30 && mins < 21 * 60 + 30) {
    for (const [gid, g] of Object.entries(groups)) { const mem = g.members || []; if (mem.length < 2) continue; const pv = prevWeek(wkV);
      const can = mem.filter(k => weekComplete(gid, k, pv)); const done = can.filter(k => played(k, ed));
      for (const k of can.filter(k => !played(k, ed))) await send(k, { title: "⚡ O Preferias Flash fecha às 21:30", body: `Já jogaram ${done.length} de ${can.length}. Se não jogares, não vês o que a malta escolheu 👀`, tag: "pf-" + ed, url: `./?g=${gid}&t=rubricas` });
    }
    pf.reminded = ed;
  }
  newSt.pf = pf;
}
// ── ⚖️ Tribunal do Sr. Sid (semanal, semana de calendário seg–dom, horas de Lisboa):
//    casos até terça 17:00 (anónimos para todos, incluindo o Meritíssimo) → veredicto até quinta 20:00 → reações até sexta 20:00
//    → recurso (≥3 🔁 e mais 🔁 do que 👏) com novo veredicto até domingo 21:00. Registo de penas e finos.
//    Tudo o que os membros escrevem fica no seu reads/{key} (privado); só este script publica em groups/{id}.trib.
if (!DRY) { const TR = newSt.trib = newSt.trib || {};
  const monL = Date.UTC(+weekMonday(wk).toISOString().slice(0, 4), weekMonday(wk).getUTCMonth(), weekMonday(wk).getUTCDate());
  const subEnd = monL + 864e5 + 17 * 3600e3, verdEnd = monL + 3 * 864e5 + 20 * 3600e3, rxEnd = monL + 4 * 864e5 + 20 * 3600e3, appEnd = monL + 6 * 864e5 + 21 * 3600e3;
  const loc = t => t + lxOff(t); const hrL = Math.floor((lxNow - monL) / 3600e3); // horas desde segunda 00:00
  const MER = "Meritíssimo Sr. Sid"; const no3 = (n, y) => `${String(n).padStart(3, "0")}/${y}`;
  for (const [gid, g] of Object.entries(groups)) { const mem = g.members || []; if (mem.length < 3) continue;
    const sid = (await db.doc("config/app").get()).data()?.sidKey || mem.find(k => /^sid\b/i.test(people[k]?.name || "")); if (!sid) continue;
    const pv = prevWeek(wkV); const canBase = k => k === sid || weekComplete(gid, k, pv); const url = `./?g=${gid}&t=rubricas&trib=1`;
    const T = g.trib || {}; const pub = { year: T.year || +wk.slice(0, 4), seq: T.seq || 0, cur: T.cur || null, hist: T.hist || [], pens: T.pens || [], sid };
    if (pub.year !== +wk.slice(0, 4)) { pub.year = +wk.slice(0, 4); pub.seq = 0; }
    const can = k => canBase(k) || (!!pub.cur?.accused && pub.cur.w === wk && pub.cur.accused === k); // o acusado entra sempre no seu processo, mesmo sem ter votado
    const ts = TR[gid] = TR[gid] || {}; const tw = ts[wk] = ts[wk] || {}; let changed = !g.trib;
    const allSend = async (pl, lockedPl) => { for (const k of mem) await send(k, can(k) || !lockedPl ? pl : lockedPl); };
    const sidRd = reads[sid]?.trib || {};
    // 0) a semana nova: a rubrica abre (segunda, a partir das 10h; na estreia, logo)
    if (!pub.cur || pub.cur.w !== wk) { if (pub.cur && pub.cur.w !== wk && !pub.cur.closed) { pub.cur.closed = true; } pub.cur = { w: wk, status: "sub" }; changed = true; }
    if (!tw.opened && hrL >= 10 && lxNow < subEnd) { tw.opened = 1;
      for (const k of mem) await send(k, k === sid ? { title: "⚖️ O seu tribunal abriu, Meritíssimo", body: "Até terça às 17:00 o povo acusa. Depois escolhe o caso a levar a julgamento.", tag: "trib-" + wk, url }
        : can(k) ? { title: "⚖️ O Tribunal do Sr. Sid está aberto", body: `Até terça às 17:00, submete casos para o ${MER} julgar. É anónimo: ninguém sabe quem acusou, nem o Meritíssimo 🤫`, tag: "trib-" + wk, url }
        : { title: "⚖️ O Tribunal do Sr. Sid está aberto", body: "A malta já está a acusar… menos tu, que não votaste 🔒", tag: "trib-" + wk, url }); }
    if (!tw.lastCall && hrL >= 24 + 15 && lxNow < subEnd) { tw.lastCall = 1;
      for (const k of mem.filter(k => canBase(k) && k !== sid)) await send(k, { title: "⚖️ Últimas horas para acusar", body: `Os casos para o ${MER} fecham hoje às 17:00.`, tag: "trib-" + wk, url }); }
    // 1) casos submetidos → caixa do Meritíssimo (com o autor; só ele vê)
    const inbox = { ...(sidRd.inbox || {}) }; let newCases = 0;
    // nem o Meritíssimo vê quem acusou (desde a semana 48)
    const ANON_FROM = "2026-W48"; const authorOf = id => mem.find(k => reads[k]?.trib?.sub?.[id]);
    for (const [id, c] of Object.entries(inbox)) { if (!c) continue;
      if (c.w >= ANON_FROM && "from" in c) { delete c.from; await db.doc("reads/" + sid).update(new FieldPath("trib", "inbox", id, "from"), FieldValue.delete()); }
      else if (c.w < ANON_FROM && !c.from && authorOf(id)) { c.from = authorOf(id); await db.doc("reads/" + sid).update(new FieldPath("trib", "inbox", id, "from"), c.from); } }
    for (const k of mem) { const subs = reads[k]?.trib?.sub || {}; for (const [id, c] of Object.entries(subs)) {
      if (!c || k === sid || c.gid !== gid || c.w !== wk || inbox[id] || !canBase(k) || loc(c.at || 0) > subEnd) continue; // o Meritíssimo não acusa no seu próprio tribunal
      if (!mem.includes(c.accused) || !c.title) continue;
      inbox[id] = { gid, w: wk, title: String(c.title).slice(0, 120), desc: String(c.desc || "").slice(0, 8000), accused: c.accused, ...(wk < ANON_FROM ? { from: k } : {}), at: c.at }; newCases++; // a partir da semana 49 sem o autor
      await db.doc("reads/" + sid).set({ trib: { inbox: { [id]: inbox[id] } } }, { merge: true }); } }
    if (newCases) await send(sid, { title: `⚖️ ${newCases === 1 ? "Chegou um caso novo" : `Chegaram ${newCases} casos novos`}, Meritíssimo`, body: "A justiça aguarda pela sua sabedoria.", tag: "trib-sid-" + wk, url });
    const weekCases = Object.entries(inbox).filter(([, c]) => c.gid === gid && c.w === wk);
    if (!tw.sidCall && lxNow >= subEnd && lxNow < verdEnd) { tw.sidCall = 1;
      await send(sid, weekCases.length ? { title: `⚖️ ${weekCases.length} ${weekCases.length === 1 ? "caso aguarda" : "casos aguardam"} sentença`, body: "Escolha um e leve-o a julgamento. A sentença é até quinta às 20:00, Meritíssimo.", tag: "trib-sid-" + wk, url }
        : { title: "⚖️ Semana sem casos", body: "Ninguém acusou ninguém esta semana, Meritíssimo. Paz no reino.", tag: "trib-sid-" + wk, url }); }
    if (!tw.sidLast && weekCases.length && !pub.cur.no && hrL >= 3 * 24 + 12 && lxNow < verdEnd) { tw.sidLast = 1;
      await send(sid, { title: "⚖️ A sentença é até às 20:00", body: "O povo aguarda, Meritíssimo.", tag: "trib-sid-" + wk, url }); }
    const cur = pub.cur;
    // 1b) o Meritíssimo leva um caso a julgamento: fica visível para todos (título, descrição e acusado) até ao veredicto
    const pk = sidRd.pick?.[gid]?.[wk];
    if (cur.status === "sub" && pk && inbox[pk.caseId] && inbox[pk.caseId].w === wk && loc(pk.at || 0) <= verdEnd + 60e3) {
      const c = inbox[pk.caseId]; Object.assign(cur, { status: "trial", caseId: pk.caseId, title: c.title, desc: c.desc, accused: c.accused, trialAt: Date.now() }); changed = true;
      await allSend({ title: "⚖️ Há um caso em julgamento", body: `O ${MER} vai julgar “${c.title}”. Acusado: ${first(c.accused)}. Sentença até quinta às 20:00.`, tag: "trib-" + wk, url },
        { title: "⚖️ Há um caso em julgamento", body: "Toda a gente já sabe quem está no banco dos réus… menos tu 🔒", tag: "trib-" + wk, url });
    }
    // 2) veredicto
    const v = sidRd.verdict?.[gid]?.[wk];
    if (!cur.no && v && (!cur.caseId || v.caseId === cur.caseId) && inbox[v.caseId] && inbox[v.caseId].w === wk && loc(v.at || 0) <= verdEnd + 60e3 && (v.result === "cond" || v.result === "abs")) {
      const c = inbox[v.caseId]; pub.seq++;
      Object.assign(cur, { status: "verdict", no: no3(pub.seq, pub.year), title: c.title, desc: c.desc, accused: c.accused, result: v.result, text: String(v.text || "").slice(0, 8000), penalty: v.result === "cond" ? String(v.penalty || "").slice(0, 300) : "", at: Date.now(), rx: { jf: 0, rec: 0 } });
      changed = true;
      await allSend({ title: `⚖️ Processo n.º ${cur.no}: ${v.result === "cond" ? "CONDENADO" : "ABSOLVIDO"}`, body: `O ${MER} proferiu sentença no caso “${c.title}”. Vê o veredicto e reage até sexta às 20:00.`, tag: "trib-" + wk, url },
        { title: `⚖️ Há sentença no Processo n.º ${cur.no}`, body: "Toda a gente já sabe quem foi condenado… menos tu 🔒", tag: "trib-" + wk, url });
    }
    if (!cur.no && (cur.status === "sub" || cur.status === "trial") && lxNow >= verdEnd) { cur.status = "none"; changed = true;
      await allSend({ title: "⚖️ Semana sem julgamento", body: weekCases.length ? `O ${MER} faltou à audiência. Os réus agradecem.` : "Ninguém foi acusado esta semana. Que grupo tão exemplar 😇", tag: "trib-" + wk, url }); }
    // 3) reações (só números em público; quem pediu recurso fica guardado em privado para os finos)
    if (cur.no && cur.status === "verdict") { let jf = 0; const rec = [], jfWho = [];
      for (const k of mem) { if (k === sid || !can(k)) continue; const r = reads[k]?.trib?.rx?.[gid + "_" + wk]; if (!r || loc(r.at || 0) > rxEnd) continue; if (r.v === "jf") { jf++; jfWho.push(k); } else if (r.v === "rec") rec.push(k); }
      // em público só o total de quem já reagiu (para não haver manipulação); 👏 e 🔁 ficam em privado até sexta às 20:00
      const n = jf + rec.length; if (cur.rx?.n !== n || "jf" in (cur.rx || {})) { cur.rx = { n }; changed = true; } tw.rec = rec; tw.jf = jf;
      if (lxNow >= rxEnd) { cur.rxFinal = { jf, rec: rec.length, jfWho, recWho: rec }; // quem votou em quê só aparece quando as reações fecham
        if (rec.length >= 3 && rec.length > jf) { cur.status = "appeal"; changed = true;
          await allSend({ title: `⚖️ Processo n.º ${cur.no} vai a recurso!`, body: `${rec.length} recursos contra ${jf} “justiça feita”. O ${MER} decide até domingo às 21:00. Quem pediu recurso arrisca um fino 🍺`, tag: "trib-" + wk, url });
          await send(sid, { title: "⚖️ Recurso aceite, Meritíssimo", body: "Mantém a sentença (e cobra finos) ou revê-a? Decida até domingo às 21:00.", tag: "trib-sid-" + wk, url }); }
        else { cur.status = "final"; cur.final = cur.result; changed = true;
          await allSend({ title: `⚖️ Processo n.º ${cur.no}: transitou em julgado`, body: cur.result === "cond" ? "Sem recurso. A pena fica no registo até ser cumprida." : "Sem recurso. O réu sai em liberdade.", tag: "trib-" + wk, url }); }
      }
    }
    // 4) recurso: novo veredicto do Meritíssimo até domingo 21:00
    if (cur.status === "appeal") { const a = sidRd.appeal?.[gid]?.[wk];
      if (a && loc(a.at || 0) <= appEnd + 60e3 && (a.decision === "keep" || a.decision === "revise")) {
        cur.appeal = { decision: a.decision, text: String(a.text || "").slice(0, 8000), at: Date.now() };
        cur.final = a.decision === "keep" ? cur.result : (cur.result === "cond" ? "abs" : "cond");
        if (a.decision === "revise" && cur.final === "cond") cur.penalty = String(a.penalty || cur.penalty || "").slice(0, 300);
        if (a.decision === "keep") for (const k of tw.rec || []) pub.pens.push({ id: `f${cur.no.replace("/", "-")}-${k}`, k, no: cur.no, kind: "fino", text: `Um fino ao ${MER} no próximo evento`, done: false, at: Date.now() });
        cur.status = "final"; changed = true;
        await allSend({ title: `⚖️ Recurso do Processo n.º ${cur.no}: ${a.decision === "keep" ? "sentença mantida" : "sentença revista"}`, body: a.decision === "keep" ? `Quem pediu recurso fica a dever um fino ao ${MER} 🍺` : `O resultado inverte-se: ${cur.final === "cond" ? "CONDENADO" : "ABSOLVIDO"}.`, tag: "trib-" + wk, url });
      } else if (lxNow >= appEnd) { cur.appeal = { decision: "none", at: Date.now() }; cur.final = cur.result; cur.status = "final"; changed = true;
        await allSend({ title: `⚖️ Processo n.º ${cur.no}: o recurso caducou`, body: `O ${MER} não se pronunciou. A sentença mantém-se, sem finos.`, tag: "trib-" + wk, url }); }
    }
    // 5) sentença final → registo de penas e cadastro
    if (cur.status === "final" && !cur.logged) { cur.logged = true; changed = true;
      if (cur.final === "cond") pub.pens.push({ id: `p${cur.no.replace("/", "-")}`, k: cur.accused, no: cur.no, kind: "pena", text: cur.penalty || "Pena simbólica", done: false, at: Date.now() });
      // 📜 resumo da semana do tribunal (sem nunca dizer quem acusou)
      const byAcc = {}; weekCases.forEach(([, c]) => { byAcc[c.accused] = (byAcc[c.accused] || 0) + 1; });
      const top = Object.entries(byAcc).sort((a, b) => b[1] - a[1]); const elig = mem.filter(k => k !== sid && can(k));
      const fines = (tw.rec || []).length && cur.appeal?.decision === "keep" ? (tw.rec || []).length : 0;
      cur.sum = { cases: weekCases.length, accusedN: top.length, top: top.length && top[0][1] > 1 && (top.length < 2 || top[0][1] > top[1][1]) ? top[0] : null,
        caseAcc: byAcc[cur.accused] || 1, elig: elig.length, reacted: (tw.jf || 0) + (tw.rec || []).length, jf: tw.jf || 0, rec: (tw.rec || []).length,
        trialH: cur.trialAt ? Math.max(0, Math.round((loc(cur.trialAt) - subEnd) / 36e5)) : null, verdLeftH: cur.at ? Math.max(0, Math.round((verdEnd - loc(cur.at)) / 36e5)) : null,
        words: (cur.text || "").split(/\s+/).filter(Boolean).length, appealWords: (cur.appeal?.text || "").split(/\s+/).filter(Boolean).length, fines, at: Date.now() };
      pub.hist = [...pub.hist.filter(h => h.no !== cur.no), { no: cur.no, w: wk, title: cur.title, accused: cur.accused, result: cur.final, penalty: cur.final === "cond" ? cur.penalty || null : null, jf: tw.jf || 0, rec: (tw.rec || []).length }];
      await allSend({ title: `📜 O resumo do Processo n.º ${cur.no} já saiu`, body: "Acusações, veredicto, reações e recurso: a semana do tribunal toda, com números 🍿", tag: "trib-sum-" + wk, url: url + "&tsum=1" },
        { title: `📜 Saiu o resumo do Processo n.º ${cur.no}`, body: "Toda a gente já está a rir-se… menos tu, que não votaste 🔒", tag: "trib-sum-" + wk, url }); }
    // 6) penas cumpridas (só o Meritíssimo marca)
    for (const [pid, on] of Object.entries(sidRd.done || {})) { const p = pub.pens.find(x => x.id === pid); if (p && !!on !== !!p.done) { p.done = !!on; p.doneAt = on ? Date.now() : null; changed = true;
      if (on) await send(p.k, { title: "⚖️ Dívida saldada", body: `O ${MER} deu como cumprid${p.kind === "fino" ? "o o teu fino" : "a a tua pena"} do Processo n.º ${p.no}.`, tag: "trib-pen-" + pid, url }); } }
    // histórico com pena e reações (para o resumo da semana, mesmo depois de o processo sair de "cur")
    for (const h of pub.hist) { if (pub.cur && h.no === pub.cur.no && !("jf" in h) && pub.cur.sum) { h.penalty = h.result === "cond" ? pub.cur.penalty || null : null; h.jf = pub.cur.sum.jf || 0; h.rec = pub.cur.sum.rec || 0; changed = true; } }
    if (changed) await db.doc("groups/" + gid).update({ trib: pub });
  }
}
if (!DRY) await stRef.set(newSt);
console.log(`Feito: ${sent} notificações.`);
