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

// ── weekly questions (copied from the app: same list and same order) ──
const QUESTIONS=[
"Quem é o mais provável de se esquecer do próprio aniversário?","Bateste com o carro: a quem ligas primeiro?","Tens um cão e vais de férias: a quem o deixas?",
"Quem é o mais provável de ficar famoso?","Quem sobreviveria mais tempo numa ilha deserta?","Ficaste fechado fora de casa às 3h: a quem ligas?",
"Quem é o mais provável de chegar atrasado ao próprio casamento?","A quem confiarias o PIN do teu cartão?","Quem é o mais provável de ganhar o Euromilhões e perder o bilhete?",
"Precisas de um álibi: quem escolhes?","Quem é o mais provável de adormecer num concerto?","Quem levarias para uma entrevista de emprego como teu advogado?",
"Quem é o mais provável de se perder com o GPS ligado?","A quem pedias conselhos amorosos?","Quem é o mais provável de abrir um restaurante?",
"Vais mudar de casa: quem ajuda de certeza?","Quem é o mais provável de chorar num filme da Disney?","A quem deixavas as chaves de casa durante um mês?",
"Quem é o mais provável de ser presidente da Junta?","Quem é o mais provável de desaparecer de uma festa sem dizer nada?","Precisas de 500€ emprestados hoje: a quem pedes?",
"Quem é o mais provável de fazer um tatuagem de que se arrepende?","Quem escolhias para fazer equipa num quiz?","Quem é o mais provável de se meter numa discussão com um árbitro?",
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
"Quem é o mais provável de ficar com a conta toda do jantar por engano?","Quem é o mais provável de saber a fofoca antes de toda a gente?","Quem levavas a um casino com 100€?",
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
const Q_START="2026-W47"; // first week with questions
function weekQuestions(gid,w){ if(!w||w<Q_START) return []; const y=+w.slice(0,4), n=+w.slice(6); const N=QUESTIONS.length;
  // a fixed shuffle per group and year, walked 2 by 2 each week → no repeats within the year
  const idx=[...Array(N).keys()]; let seed=hashStr2(gid+"|"+y); for(let i=N-1;i>0;i--){ seed=(Math.imul(seed,1664525)+1013904223)>>>0; const j=seed%(i+1); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  return [0,1].map(o=>{ const i=idx[((n-1)*2+o)%N]; return {id:"q:"+i,text:QUESTIONS[i]}; }); }

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
  if (chat.type === "cantinho") continue; // o cantinho tem as suas próprias notificações (scripts/cantinho.mjs)
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

// 4) votação de domingo: às 18h lembrete e às 22h última chamada (com FOMO)
const wk = weekOf(ymd());
const FULL_VOTE_FROM = "2026-W47";
const tsMs = x => x == null ? 0 : typeof x === "number" ? x : x.toMillis ? x.toMillis() : +new Date(x);
function wkMonday(w) { const y = +w.slice(0, 4), n = +w.slice(6); const j4 = new Date(Date.UTC(y, 0, 4)); const m = new Date(j4); m.setUTCDate(j4.getUTCDate() - ((j4.getUTCDay() + 6) % 7) + (n - 1) * 7); return m; }
let VR = null; const loadVR = async () => VR || (VR = await Promise.all([all("awards"), all("votes"), all("rankings")]));
function complete([awards, votes, rankings], gid, k, w) { // mesma regra da app
  if (!rankings[k]?.weeks?.[w]?.[gid]) return false; if (w < FULL_VOTE_FROM) return true;
  const v = votes[k]?.weeks?.[w] || {}; const end = wkMonday(w).getTime() + 7 * 864e5 + 2 * 3600e3;
  const aw = Object.entries(awards).filter(([, a]) => a.groupId === gid && (!a.createdAt || tsMs(a.createdAt) < end)).map(([id]) => id);
  return [...aw, ...weekQuestions(gid, w).map(q => q.id)].every(id => v[id]);
}
const stage = weekdayLx() === "Sun" ? (hourLx() >= 22 ? "22" : hourLx() >= 18 ? "18" : null) : null;
if (stage && st.weekly !== wk + ":" + stage && !(stage === "18" && st.weekly === wk + ":22")) {
  const vr = await loadVR();
  for (const [gid, g] of Object.entries(groups)) {
    if ((g.galas || []).some(d => d < ymd() && weekOf(d) === wk)) continue; // época fechada depois da Gala
    const mem = g.members || []; if (mem.length < 2) continue;
    const done = mem.filter(k => complete(vr, gid, k, wk)); const miss = mem.filter(k => !done.includes(k));
    for (const k of miss) {
      const others = miss.length - 1;
      const p = stage === "18"
        ? { title: `⏳ A votação do ${g.name} fecha hoje às 23:59`, body: `Já votaram ${done.length} de ${mem.length}. Se não votares, amanhã ficas sem ranking, sem resumo da semana e sem Cantinho 🔒` }
        : { title: "🚨 Última chamada: faltam 2 horas", body: others ? `Só faltas tu e mais ${others}. À meia-noite fecha e ficas de fora a semana toda 😬` : `Só faltas TU. O grupo todo já votou… à meia-noite ficas sozinho de fora 😬` };
      await send(k, "votes", { ...p, tag: "votes-" + wk, url: `./?g=${gid}&t=dash` });
    }
  }
  st.weekly = wk + ":" + stage;
}

// 4b) segunda-feira: quem não completou a votação da semana passada fica a saber que ficou de fora (uma vez por semana)
if (weekdayLx() === "Mon" && st.locked !== wk) {
  const vr = await loadVR(); const pw = weekOf(new Date(wkMonday(wk).getTime() - 3 * 864e5).toISOString().slice(0, 10));
  for (const [gid, g] of Object.entries(groups)) {
    if ((g.galas || []).some(d => weekOf(d) === pw || weekOf(d) === wk)) continue; // semana da Gala: sem castigos
    const mem = g.members || []; if (mem.length < 2) continue;
    const inside = mem.filter(k => complete(vr, gid, k, pw)); if (!inside.length) continue;
    for (const k of mem.filter(k => !inside.includes(k)))
      await send(k, "votes", { title: "🔒 Esta semana ficaste de fora", body: `${inside.length} ${inside.length === 1 ? "amigo já está" : "amigos já estão"} a ver o ranking, o resumo e o Cantinho do ${g.name}. Tu não 😬 Vota esta semana para voltares na próxima segunda.`, tag: "locked-" + wk, url: `./?g=${gid}&t=dash` });
  }
  st.locked = wk;
}

// 5) aniversários (a partir das 9h; uma vez por dia)
const today = ymd(), md = today.slice(5);
if (hourLx() >= 9 && st.bday !== today) {
  const told = new Set(); // one notification per (recipient, birthday person), even if they share several groups
  for (const [gid, g] of Object.entries(groups)) {
    for (const b of (g.members || []).filter(k => people[k]?.birthday === md)) {
      for (const k of g.members || []) {
        const id = k + "|" + b; if (told.has(id)) continue; told.add(id);
        await send(k, "birthdays", k === b
          ? { title: `Parabéns, ${first(b)}! 🎉`, body: `Hoje o dia é teu. Todo o ${g.name} está a celebrar contigo 🥳`, tag: "bday-" + b, url: `./?g=${gid}&t=dash` }
          : { title: `🎂 Hoje é o aniversário do ${first(b)}!`, body: `Dá-lhe os parabéns no GAP 🥳`, tag: "bday-" + b, url: `./?g=${gid}&t=dash` });
      }
    }
  }
  st.bday = today;
}

// 6) toques anónimos ("ainda não votaste 👀"): no máximo 1 por pessoa, por grupo, por dia
const nudges = [];
for (const [key, r] of Object.entries(reads)) for (const [gid, n] of Object.entries(r.nudges || {})) if (n?.at > since && n.wk === wk) nudges.push({ from: key, gid });
if (nudges.length) {
  const [awards, votes, rankings] = await Promise.all([all("awards"), all("votes"), all("rankings")]);
  const done = st.nudged && st.nudged.day === today ? st.nudged.list || [] : [];
  for (const { from, gid } of nudges) {
    const g = groups[gid]; if (!g) continue;
    if ((g.galas || []).some(d => d < today && weekOf(d) === wk)) continue;
    const aw = [...Object.entries(awards).filter(([, a]) => a.groupId === gid).map(([id]) => id), ...weekQuestions(gid, wk).map(q => q.id)];
    for (const k of g.members || []) {
      if (k === from || done.includes(k + "|" + gid)) continue;
      const missing = !rankings[k]?.weeks?.[wk]?.[gid] || aw.some(id => !votes[k]?.weeks?.[wk]?.[id]);
      if (!missing) continue;
      done.push(k + "|" + gid);
      await db.doc("reads/" + k).set({ nudged: { [gid]: { at: now, wk } } }, { merge: true });
      await send(k, "votes", { title: `👀 Alguém do ${g.name} deu-te um toque`, body: "Ainda não votaste esta semana. Vai lá, demora 1 minuto!", tag: "nudge-" + gid, url: `./?g=${gid}&t=dash` });
    }
  }
  st.nudged = { day: today, list: done };
}

await stRef.set({ lastRun: now, weekly: st.weekly || null, locked: st.locked || null, bday: st.bday || null, nudged: st.nudged || null }, { merge: true });
console.log(`Feito: ${sent} notificações enviadas.`);
process.exit(0);
