// Pês — o Cantinho: todas as semanas uma pessoa do grupo conversa com o Anfitrião (IA).
// Corre no GitHub Actions. Segredos: FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE_KEY e ANTHROPIC_API_KEY.
// Sem ANTHROPIC_API_KEY o cantinho abre com uma pergunta preparada e o Anfitrião espera pela chave para responder.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import webpush from "web-push";

const SA = process.env.FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY, VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const AI_KEY = process.env.ANTHROPIC_API_KEY || "", MODEL = process.env.CANTINHO_MODEL || "claude-sonnet-5-5";
const DRY = !!process.env.DRY_WEEK; // test: simulate a week without writing anything
if (!SA) { console.log("Falta FIREBASE_SERVICE_ACCOUNT."); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(SA)) });
const db = getFirestore();
if (VAPID_PRIVATE) webpush.setVapidDetails("mailto:goncaloxavier13@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

const CANT_START = "2026-W48", FULL_VOTE_FROM = "2026-W47", BOT = "bot";
const ymd = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hourLx = () => +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(new Date());
function weekOf(s) { const [y, m, d] = s.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); const day = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - day + 3);
  const fy = dt.getUTCFullYear(); const jan4 = new Date(Date.UTC(fy, 0, 4)); const w = 1 + Math.round(((dt - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7); return `${fy}-W${String(w).padStart(2, "0")}`; }
function weekMonday(w) { const y = +w.slice(0, 4), n = +w.slice(6); const jan4 = new Date(Date.UTC(y, 0, 4)); const mon = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (n - 1) * 7); return mon; }
const prevWeek = w => weekOf(new Date(weekMonday(w).getTime() - 3 * 864e5).toISOString().slice(0, 10));
const weekEndMs = w => weekMonday(w).getTime() + 7 * 864e5 + 2 * 3600e3;
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
function weekQuestions(gid,w){ if(!w||w<Q_START) return []; const y=+w.slice(0,4), n=+w.slice(6); const N=QUESTIONS.length;
  // a fixed shuffle per group and year, walked 2 by 2 each week → no repeats within the year
  const idx=[...Array(N).keys()]; let seed=hashStr2(gid+"|"+y); for(let i=N-1;i>0;i--){ seed=(Math.imul(seed,1664525)+1013904223)>>>0; const j=seed%(i+1); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  return [0,1].map(o=>{ const i=idx[((n-1)*2+o)%N]; return {id:"q:"+i,text:QUESTIONS[i]}; }); }

const today = ymd(); const wk = process.env.DRY_WEEK || weekOf(today);
if (wk < CANT_START) { console.log(`O cantinho só começa em ${CANT_START} (agora ${wk}).`); process.exit(0); }

const all = async c => Object.fromEntries((await db.collection(c).get()).docs.map(d => [d.id, d.data()]));
const [people, groups, rankings, votes, awards, events, reads] = await Promise.all(["people", "groups", "rankings", "votes", "awards", "events", "reads"].map(all));
const name = k => k === BOT ? "Anfitrião" : people[k]?.name || "Alguém"; const first = k => name(k).split(" ")[0];
const stRef = db.doc("system/cantinho"); const st = (await stRef.get()).data() || {};

// Same rule as the app: the vote of a week is complete = ranking (+ awards and questions from W47 on)
function weekComplete(gid, k, w) {
  if (!rankings[k]?.weeks?.[w]?.[gid]) return false; if (w < FULL_VOTE_FROM) return true;
  const v = votes[k]?.weeks?.[w] || {}; const end = weekEndMs(w);
  const aw = Object.entries(awards).filter(([, a]) => a.groupId === gid && (!a.createdAt || ms(a.createdAt) < end)).map(([id]) => id);
  return [...aw, ...weekQuestions(gid, w).map(q => q.id)].every(id => v[id]);
}

let sent = 0;
async function send(key, payload) {
  if (DRY || !VAPID_PRIVATE) return; const push = reads[key]?.push; if (!push || push.prefs?.messages === false) return;
  for (const [h, sub] of Object.entries(push.subs || {})) {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 86400 }); sent++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.doc("reads/" + key).update({ [`push.subs.${h}`]: FieldValue.delete() }).catch(() => {}); }
  }
}

const OPENERS = [
  "Se pudesses saber a resposta a uma única pergunta sobre o universo, qual escolhias?",
  "Achas que somos a mesma pessoa que éramos há dez anos? O que é que mudou de verdade?",
  "O que é, para ti, uma vida bem vivida?",
  "Se ninguém se lembrasse de nada do que fizeste, o que é que farias de diferente?",
  "A felicidade procura-se ou acontece?",
];
function systemPrompt(g, host, cw) {
  const evs = Object.values(events).filter(e => e.groupId === g.id && e.date >= ymd(new Date(Date.now() - 7 * 864e5)) && e.date <= ymd(new Date(Date.now() + 7 * 864e5)))
    .map(e => `${e.title} (${e.date})`).slice(0, 6);
  const others = (g.members || []).filter(k => k !== host).map(first);
  const gala = (g.galas || []).filter(d => d >= today).sort()[0];
  return `És o "Anfitrião do Cantinho", um bot numa app de um grupo de amigos portugueses chamado "${g.name}".
Esta semana, quem está sentado no cantinho é ${name(host)} (trata-o por ${first(host)}). Só ele te responde; o resto do grupo (${others.join(", ")}) lê a conversa e reage.
Hoje é ${today}.${evs.length ? ` Eventos do grupo por estes dias: ${evs.join("; ")}.` : ""}${gala ? ` A Gala de fim de época (jantar de Natal) é a ${gala}.` : ""}

Como te comportas:
- Escreves sempre em português de Portugal (nunca do Brasil), num tom caloroso, curioso e com humor leve, como um amigo de café com alma de filósofo.
- Fazes UMA pergunta de cada vez e esperas pela resposta. Mensagens curtas: 1 a 3 frases, no máximo cerca de 50 palavras.
- Começas a semana com perguntas filosóficas. Depois das primeiras respostas, vais misturando perguntas sobre a rotina, a semana, os gostos e o grupo, sempre a partir do que ele disse.
- Reages ao que ele respondeu (com interesse genuíno, às vezes um pequeno comentário ou provocação simpática) e só depois fazes a pergunta seguinte.
- Lembra-te de que o grupo está a ler: podes de vez em quando puxar pelos amigos ("o que é que o ${others[0] || "grupo"} diria disto?"), sem nunca gozar com ninguém de forma maldosa.
- Nunca falas de votos, rankings, prémios ou de quem votou em quem. Não fazes perguntas sobre saúde, dinheiro, política, religião ou vida íntima.
- Se ele disser algo que mostre que não está bem, respondes com cuidado e sem fazer piadas.
- Não uses listas nem formatação; escreve como numa conversa de chat.`;
}
async function ai(system, msgs) {
  if (!AI_KEY) return null;
  const turns = [];
  for (const m of msgs) { const role = m.from === BOT ? "assistant" : "user"; const text = (m.text || "").slice(0, 2000);
    if (turns.length && turns[turns.length - 1].role === role) turns[turns.length - 1].content += "\n" + text; else turns.push({ role, content: text }); }
  if (!turns.length || turns[0].role !== "user") turns.unshift({ role: "user", content: "(O cantinho desta semana acabou de abrir.)" });
  if (turns[turns.length - 1].role !== "user") return null;
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "content-type": "application/json", "x-api-key": AI_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: turns.slice(-40) }) });
  if (!r.ok) { console.log("Erro da IA:", r.status, (await r.text()).slice(0, 300)); return null; }
  const j = await r.json(); return (j.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim() || null;
}
async function botSay(cid, text) {
  const at = Date.now();
  if (DRY) { console.log("[simulação] o Anfitrião diria:", text); return; }
  await db.collection(`chats/${cid}/msgs`).add({ from: BOT, text, at });
  await db.doc("chats/" + cid).update({ lastAt: at, lastText: text.slice(0, 140), lastFrom: BOT });
}

const newSt = { ...st };
for (const [gid, g0] of Object.entries(groups)) {
  const g = { id: gid, ...g0 }; const mem = g.members || []; if (mem.length < 2) continue;
  if ((g.galas || []).some(d => d < today && weekOf(d) === wk)) continue; // season closed after the Gala
  const pw = prevWeek(wk); const eligible = mem.filter(k => weekComplete(gid, k, pw));
  const gs = newSt[gid] = { hosts: {}, cycle: [], ...(st[gid] || {}) }; gs.hosts = { ...gs.hosts }; gs.cycle = [...gs.cycle];
  const cid = `cant-${gid}-${wk}`; const ref = db.doc("chats/" + cid); let chat = (await ref.get()).data();

  // 1) open this week's cantinho
  if (!chat) {
    let host = gs.hosts[wk];
    if (!host && wk === CANT_START) host = mem.find(k => first(k) === "Manel") || null; // the first one is the Manel
    if (!host) { let pool = eligible.filter(k => !gs.cycle.includes(k)); if (!pool.length) { gs.cycle = []; pool = eligible; }
      host = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; }
    if (!host) { console.log(`${g.name}: ninguém com acesso esta semana.`); continue; }
    gs.hosts[wk] = host; if (!gs.cycle.includes(host)) gs.cycle.push(host);
    const members = [...new Set([...eligible, host])];
    chat = { groupId: gid, type: "cantinho", host, week: wk, name: `Cantinho do ${first(host)}`, members, createdBy: BOT, createdAt: Date.now(), lastAt: null, lastText: "", lastFrom: null };
    console.log(`${g.name}: cantinho aberto (${members.length} com acesso).`);
    if (!DRY) await ref.set(chat);
    const opening = await ai(systemPrompt(g, host, chat), []) ||
      `Bem-vindo ao cantinho, ${first(host)} 🛋️ Esta semana és tu que te sentas aqui e o grupo todo está a ler. Começamos com calma: ${OPENERS[Math.floor(Math.random() * OPENERS.length)]}`;
    await botSay(cid, opening);
    await send(host, { title: "🛋️ Estás no cantinho esta semana!", body: "O Anfitrião já te fez a primeira pergunta. O grupo está à espera da tua resposta 👀", tag: "cant-" + cid, url: `./?g=${gid}&t=gap&c=${cid}` });
    if (DRY) continue;
  }

  // 2) the host answered → notify the group and let the AI reply
  const msgs = (await db.collection(`chats/${cid}/msgs`).orderBy("at", "desc").limit(60).get()).docs.map(d => ({ id: d.id, ...d.data() })).reverse();
  const seen = gs.seen?.[cid] || 0; const fresh = msgs.filter(m => m.from === chat.host && m.at > seen);
  if (fresh.length) {
    for (const k of chat.members || []) if (k !== chat.host)
      await send(k, { title: `🛋️ ${chat.name}`, body: `O ${first(chat.host)} respondeu no cantinho 👀`, tag: "cant-" + cid, url: `./?g=${gid}&t=gap&c=${cid}` });
    gs.seen = { ...(gs.seen || {}), [cid]: Math.max(...fresh.map(m => m.at)) };
  }
  const last = msgs[msgs.length - 1];
  const botToday = msgs.filter(m => m.from === BOT && ymd(new Date(m.at)) === today).length;
  if (last && last.from === chat.host && botToday < 40) {
    const reply = await ai(systemPrompt(g, chat.host, chat), msgs.filter(m => m.from === BOT || m.from === chat.host));
    if (reply) { await botSay(cid, reply); await send(chat.host, { title: "🛋️ O Anfitrião respondeu", body: reply.slice(0, 120), tag: "cant-host-" + cid, url: `./?g=${gid}&t=gap&c=${cid}` }); }
    else if (!AI_KEY) console.log(`${g.name}: resposta à espera da chave ANTHROPIC_API_KEY.`);
  }
}
if (!DRY) await stRef.set(newSt);
console.log(`Feito: ${sent} notificações.${AI_KEY ? "" : " (sem chave da IA)"}`);
