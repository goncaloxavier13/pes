// Pês — envia notificações push. Corre no GitHub Actions a cada ~10 minutos.
// Segredos necessários: FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço) e VAPID_PRIVATE_KEY.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
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

// 2) mensagens novas (agrupadas por conversa) — só se o vigia do chat (chatwatch.mjs) não estiver a correr
const cw = (await db.doc("system/chatwatch").get()).data() || {};
const watcherAlive = cw.alive && Date.now() - cw.alive < 12 * 60e3;
if (watcherAlive) console.log("Mensagens: tratadas pelo vigia do chat.");
for (const c of watcherAlive ? [] : (await db.collection("chats").where("lastAt", ">", since).get()).docs) {
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
      body: (w => mine.length === 1 ? `${title ? w + ": " : ""}${last.text}`.slice(0, 180) : `${mine.length} mensagens novas · ${w}: ${last.text}`.slice(0, 180))(last.as === "claude" ? "Cláudio" : first(last.from)),
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
  return [...aw, ...weekQuestions(gid, w).map(q => q.id), ...(w >= "2026-W48" ? ["reg:irrit", "reg:expert", "reg:coro", "reg:mom"] : [])].every(id => v[id]);
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

// 4a) Registos da semana: quando a semana fecha, os textos passam para uma lista anónima e baralhada no grupo
//     e são apagados dos votos de cada pessoa (fica só "1" = respondeu, para as regras de acesso continuarem a funcionar)
{ const pw0 = weekOf(new Date(wkMonday(wk).getTime() - 3 * 864e5).toISOString().slice(0, 10));
  if (pw0 >= "2026-W48" && st.regs !== pw0) {
    const vr = await loadVR(); const votesAll = vr[1]; const RK = { "reg:irrit": "irrit", "reg:coro": "coro", "reg:mom": "mom" };
    for (const [gid, g] of Object.entries(groups)) {
      const lists = { irrit: [], coro: [], mom: [] }; const touched = [];
      for (const k of g.members || []) { const v = votesAll[k]?.weeks?.[pw0] || {};
        for (const [id, key] of Object.entries(RK)) { const t = v[id]; if (typeof t !== "string" || t === "1") continue; if (t !== "∅" && t.trim()) lists[key].push(t.trim().slice(0, 400)); touched.push([k, id]); } }
      for (const key in lists) lists[key].sort(() => Math.random() - .5);
      await db.doc("groups/" + gid).update(new FieldPath("regs", pw0), lists);
      for (const [k, id] of touched) await db.doc("votes/" + k).update(new FieldPath("weeks", pw0, id), "1");
      console.log(`${g.name}: registos da semana anonimizados (${touched.length}).`);
    }
    st.regs = pw0;
  } }

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

const PF={
rotina:[
["Nunca mais beber café","Nunca mais dormir uma sesta"],["Acordar todos os dias às 6h","Só conseguir jantar depois das 23h"],["Viver sem telemóvel um mês","Viver sem televisão nem streaming um ano"],
["Comer sopa ao pequeno-almoço todos os dias","Comer cereais ao jantar todos os dias"],["Fazer a cama todos os dias","Nunca mais ter de lavar a loiça"],["Ter sempre 5 minutos de atraso","Chegar sempre 30 minutos adiantado"],
["Tomar só banhos frios","Só poder tomar banho à noite"],["Ir ao ginásio todos os dias às 7h","Correr 10 km todos os domingos"],["Nunca mais comer pizza","Nunca mais comer hambúrgueres"],
["Trabalhar 4 dias por semana com 10h por dia","5 dias por semana com 8h"],["Ter um despertador que toca uma música que odeias","Acordar sem despertador mas sempre às 5h"],["Viver no centro da cidade num T0","Viver no campo numa casa enorme"],
["Ter o frigorífico sempre cheio","Ter a casa sempre arrumada sem esforço"],["Só poder ouvir uma música para o resto da vida","Só poder ver um filme para o resto da vida"],["Conduzir sempre no trânsito da 2.ª Circular","Andar sempre de autocarro cheio"],
["Ter Wi-Fi lento para sempre","Ter bateria do telemóvel sempre a 10%"],["Nunca mais poder comer fora","Nunca mais poder cozinhar em casa"],["Passar as férias sempre na praia","Passar as férias sempre na neve"],
["Ter um fim de semana de 3 dias com segunda a trabalhar o dobro","Fim de semana normal"],["Dormir só 5 horas e sentir-te bem","Dormir 10 horas e sentir-te sempre cansado"],["Nunca mais usar meias","Nunca mais usar sapatos fechados"],
["Ter um vizinho que toca bateria","Um vizinho que faz obras ao sábado de manhã"],["Ficar sem internet um fim de semana","Ficar sem água quente uma semana"],["Ter de responder a todos os emails no próprio dia","Nunca mais poder enviar áudios"],
["Comer sempre a mesma coisa ao almoço","Nunca repetir um almoço"],["Ir às compras ao sábado à tarde","Ir às compras às 8h de segunda"],["Ter sempre a mochila pesada","Ter sempre os bolsos cheios de coisas"],
["Passar o domingo inteiro no sofá","Passar o domingo inteiro fora de casa"],["Ter de cozinhar para o grupo todo todas as semanas","Ter de lavar a loiça do grupo todo todas as semanas"],["Ser sempre o condutor da noite","Pagar sempre o Uber de toda a gente"],
["Ter um cão que ladra a noite toda","Um gato que te acorda às 5h"],["Viver sem ar condicionado no verão","Sem aquecimento no inverno"],["Ver todos os jogos do teu clube no estádio à chuva","Ver todos no sofá sem som"],
["Esquecer sempre onde estacionaste","Esquecer sempre as chaves de casa"],["Ir trabalhar de fato todos os dias","Ir trabalhar de fato de treino mas com reuniões por vídeo o dia todo"],["Ter sempre fome às 3h da manhã","Nunca ter fome ao pequeno-almoço"],
["Ter um chefe que manda mensagens ao domingo","Um chefe que marca reuniões às 18h de sexta"],["Nunca mais ver séries","Nunca mais ver futebol"],["Fazer uma maratona","Fazer um mês sem açúcar"],
["Viver numa casa sem espelhos","Numa casa sem cortinas"],["Comer só comida picante","Comer só comida sem sal"],["Acordar sempre com o cabelo perfeito","Nunca mais ter olheiras"],
["Ter um carro velho que nunca avaria","Um carro novo que avaria todos os meses"],["Passar o Natal sozinho numa praia tropical","Passar o Natal com a família toda e 40 primos"],["Ter de ler um livro por semana","Não poder ler nada durante um ano"],
["Ir sempre a pé para todo o lado","Ir sempre de trotinete"],["Ter um colega de casa que nunca limpa","Um colega de casa que limpa às 7h com música alta"],["Beber só água para sempre","Beber só sumos para sempre"],
["Jantar sempre às 19h","Jantar sempre às 22h30"],["Ter de cantar sempre que entras num elevador","Ter de dançar sempre que ouves música"],
],
erotico:[
["Que o teu histórico de pesquisas fosse lido em voz alta no jantar de Natal","Que os teus pais vissem as tuas últimas 50 mensagens"],["Um primeiro encontro perfeito sem beijo no fim","Um encontro desastroso que acaba na melhor noite da tua vida"],
["Só poder namorar com quem o grupo escolhesse","Ter de apresentar cada pessoa com quem sais ao grupo todo no primeiro encontro"],["Beijar alguém com mau hálito","Beijar alguém que não pára de falar"],
["Uma noite de paixão inesquecível que nunca podes contar a ninguém","Uma noite banal que podes contar a toda a gente"],["Ser apanhado pelos pais num momento íntimo","Ser apanhado pelo grupo de amigos"],
["Mandar uma mensagem atrevida para o grupo errado","Receber uma mensagem atrevida no ecrã do telemóvel durante uma reunião"],["Saber exatamente o que o teu par pensa de ti na cama","Nunca saber e viver na dúvida"],
["Um encontro às escuras escolhido pela tua mãe","Um encontro às escuras escolhido pelo teu melhor amigo"],["Namorar alguém muito bonito sem piada nenhuma","Alguém com imensa piada mas sem química nenhuma"],
["Ter o teu ex como vizinho da porta ao lado","Ter o teu ex como colega de trabalho"],["Ser sempre tu a dar o primeiro passo","Esperar sempre que dêem o primeiro passo"],
["Perder o telemóvel com as fotos todas","Perder a carteira com todos os documentos"],["Um beijo à chuva","Um beijo ao pôr do sol na praia"],
["Que o teu par ressonasse como um trator","Que roubasse sempre o edredão todo"],["Uma relação à distância com a pessoa certa","Viver ao lado da pessoa quase certa"],
["Ter de ler em voz alta a tua última conversa de engate","Ter de mostrar a tua galeria de fotos ao grupo durante 1 minuto"],["Um encontro num restaurante de luxo com conversa chata","Um encontro numa bifana com a melhor conversa da tua vida"],
["Saber dançar slow na perfeição","Saber fazer massagens na perfeição"],["Um flirt num casamento","Um flirt num avião"],
["Que o teu par fosse ciumento","Que o teu par fosse completamente indiferente"],["Uma noite num hotel de cinco estrelas","Uma noite numa tenda debaixo das estrelas"],
["Ter um par que canta no duche todas as manhãs","Um par que fala a dormir e conta segredos"],["Nunca mais poder usar emojis para namorar","Só poder namorar por áudios"],
["Ser engatado com a pior frase de engate do mundo","Seres tu a usar essa frase e resultar"],["Ir a um speed dating com o grupo a ver","Ter o grupo a escolher o teu perfil numa app de encontros"],
["Ficar preso num elevador com o teu crush","Com o teu ex"],["Fazer uma serenata à janela de alguém","Receber uma serenata à frente de toda a gente"],
["Que soubessem todos os teus crushes de sempre","Que soubessem todas as tuas desculpas para não sair"],["Uma paixão de verão intensa que acaba em setembro","Uma relação morna que dura para sempre"],
["Ter química com toda a gente mas não te apaixonares","Apaixonares-te facilmente sem química nenhuma"],["Um jantar romântico cozinhado por ti","Um jantar romântico cozinhado por quem amas mas que sabe mal"],
["Que o teu par fosse dez anos mais velho","Dez anos mais novo"],["Ter um encontro com alguém famoso que não conheces","Com alguém normal que conheces muito bem"],
["Beijar com os olhos abertos","Ser beijado por alguém de olhos abertos"],["Ter de mandar uma mensagem picante ao último contacto com quem falaste","Ter de ler em voz alta a última mensagem picante que recebeste"],
["Dormir de conchinha a noite toda","Dormir cada um no seu lado da cama"],["Um par que manda mensagens de bom dia todos os dias","Um par que só responde ao fim do dia"],
["Conhecer o amor da tua vida numa app","Num bar às 4h da manhã"],["Que o teu par tivesse cócegas em todo o lado","Que não tivesse cócegas em lado nenhum"],
["Ir a um casamento sozinho e conhecer alguém","Ir acompanhado e passar a noite a dançar com o grupo"],["Ter sempre as mãos frias","Ter sempre os pés frios na cama"],
["Uma lingerie ou boxers ridículos que adoras","Uns que odeias mas que o teu par adora"],["Que o teu par fosse muito romântico em público","Só romântico quando estão sozinhos"],
["Ter de recriar o teu primeiro beijo com o grupo a ver","Ter de contar como foi ao pormenor"],["Um encontro num museu","Um encontro num karaoke"],
["Um par que adora o teu grupo de amigos","Um par que o grupo adora mas que não aguenta o grupo"],["Saber sempre quando alguém está interessado em ti","Saber sempre quando alguém está a mentir"],
["Fazer um strip ao som do Quim Barreiros","Fazer uma dança sensual ao som do hino nacional"],["Ter o primeiro encontro numa feira popular","Numa aula de dança de salão"],
],
filosofia:[
["Saber a data em que vais morrer","Saber a forma como vais morrer"],["Ser muito feliz sem ninguém se lembrar de ti","Ser lembrado para sempre e nunca ser totalmente feliz"],["Poder voltar ao passado","Poder ver o futuro"],
["Viver 200 anos com saúde média","Viver 70 anos com saúde perfeita"],["Saber sempre a verdade","Ser sempre feliz"],["Ser o mais inteligente da sala","Ser o mais divertido da sala"],
["Ter muito dinheiro sem amigos","Ter amigos incríveis sem dinheiro"],["Esquecer as tuas piores memórias","Lembrar-te para sempre das melhores com todo o pormenor"],["Ser famoso sem talento","Ter talento e ninguém saber"],
["Viver uma vida tranquila e previsível","Uma vida cheia de aventuras e altos e baixos"],["Mudar o passado do mundo","Mudar o futuro do mundo"],["Ler mentes","Ser invisível"],
["Nunca mais mentir","Nunca mais ouvir uma mentira"],["Ser imortal sozinho","Morrer com quem gostas"],["Conhecer o sentido da vida","Ter uma vida com sentido sem nunca saber qual é"],
["Ter um botão de pausa na vida","Um botão de avançar"],["Ser lembrado como boa pessoa","Ser lembrado como génio"],["Perder todas as memórias de infância","Nunca mais criar memórias novas por um ano"],
["Ter sempre razão","Ser sempre amado"],["Viver numa utopia aborrecida","Num mundo caótico mas emocionante"],["Saber o que todos pensam de ti","Que ninguém nunca saiba o que pensas"],
["Ser capaz de falar com animais","Falar todas as línguas do mundo"],["Viver no ano 1500","No ano 2500"],["Começar a vida de novo com o que sabes hoje","Continuar a vida sem arrependimentos"],
["Ter coragem total","Ter calma total"],["Ver o mundo todo e não ter casa","Ter a casa perfeita e nunca viajar"],["Ser o primeiro humano em Marte","O último humano na Terra"],
["Dizer sempre o que pensas","Nunca mais falar"],["Ter memória perfeita","Ter imaginação infinita"],["Ser jovem para sempre por fora","Sábio para sempre por dentro"],
["Viver sem música","Viver sem cores"],["Saber como o universo começou","Saber como vai acabar"],["Perdoar tudo","Nunca precisar de ser perdoado"],
["Ganhar o Euromilhões","Encontrar a tua vocação"],["Ser uma pessoa normal num mundo de génios","Um génio num mundo de pessoas normais"],["Ter um amigo que te diz sempre a verdade","Um amigo que te apoia sempre, mesmo sem razão"],
["Viver sem medo","Viver sem dor"],["Ter tempo infinito e pouco dinheiro","Dinheiro infinito e pouco tempo"],["Nunca mais sentir tristeza","Nunca mais sentir saudade"],
["Saber tudo sobre o passado","Saber tudo sobre ti próprio"],["Ser lembrado por uma única coisa grandiosa","Por mil pequenas coisas boas"],["Viver num sonho perfeito sem saberes","Na realidade dura, a saber tudo"],
["Ter a vida decidida por outro e ser feliz","Decidir tudo e falhar muitas vezes"],["Ser o mais rico do cemitério","O mais feliz do bairro"],["Ser admirado","Ser compreendido"],
["Ter um dom que te isola","Ser comum e muito acompanhado"],["Voltar a ter 10 anos por um dia","Ter 80 anos por um dia"],["Nunca mais ter de dormir","Nunca mais ter de comer"],
["Escolher o teu destino","Ser surpreendido pelo destino"],["Viver numa cidade onde todos te conhecem","Numa onde ninguém te conhece"],
],
membros:[
["Ficar fechado num elevador 5 horas com o {A}","Fazer uma viagem de 10 horas de carro com o {B} ao volante"],["Que o {A} escolhesse a tua roupa durante um mês","Que o {B} escolhesse todas as tuas refeições"],
["Ter o sentido de humor do {A}","Ter a lábia do {B}"],["Ir de férias uma semana só com o {A}","Partilhar casa um mês com o {B}"],["Que o {A} organizasse o teu aniversário","Que o {B} escrevesse o teu discurso de casamento"],
["Ter o estilo do {A}","Ter a sorte do {B}"],["Que o {A} lesse as tuas mensagens","Que o {B} visse o teu histórico do YouTube"],["Ser treinado pelo {A} no ginásio","Aprender a cozinhar com o {B}"],
["Que o {A} fosse o teu advogado","Que o {B} fosse o teu médico"],["Ter o {A} como chefe","Ter o {B} como colega de secretária"],["Dançar um slow com o {A} no próximo jantar","Cantar um dueto no karaoke com o {B}"],
["Fazer uma maratona de séries com o {A}","Fazer uma caminhada de 20 km com o {B}"],["Que o {A} conduzisse o teu carro um mês","Que o {B} tomasse conta da tua casa um mês"],["Ter a energia do {A} às 4h da manhã","Ter a calma do {B} numa discussão"],
["Que o {A} fosse o teu padrinho de casamento","Que o {B} fosse o padrinho do teu filho"],["Jogar à bola na equipa do {A}","Ter o {B} como guarda-redes da tua equipa"],["Ir a um casino com o {A}","Ir a um festival de verão com o {B}"],
["Que o {A} escolhesse o teu corte de cabelo","Que o {B} escolhesse a tua próxima tatuagem"],["Ter o telemóvel do {A} durante um dia","Ter a carteira do {B} durante um dia"],["Ser o melhor amigo do {A} numa ilha deserta","Ser o melhor amigo do {B} num apocalipse zombie"],
["Que o {A} te desse conselhos amorosos","Que o {B} te desse conselhos financeiros"],["Ir às compras de Natal com o {A}","Montar um móvel do IKEA com o {B}"],["Ter a memória do {A}","Ter a pontualidade do {B}"],
["Ser fotografado pelo {A} para o teu perfil","Que o {B} escrevesse a tua biografia"],["Que o {A} planeasse a próxima viagem do grupo","Que o {B} tratasse do orçamento"],["Passar a noite de Ano Novo com o {A}","Passar o dia de anos com o {B}"],
["Ter o gosto musical do {A}","Ter o gosto para filmes do {B}"],["Que o {A} fosse o teu DJ de casamento","Que o {B} fosse o fotógrafo"],["Cozinhar um jantar para o {A}","Que o {B} cozinhasse para ti"],
["Que o {A} te acordasse todos os dias","Que o {B} te deitasse todos os dias com uma história"],["Ser o par do {A} numa competição de dança","Ser a dupla do {B} num quiz de cultura geral"],["Fazer o Caminho de Santiago com o {A}","Uma road trip pela Europa com o {B}"],
["Trocar de vida com o {A} durante uma semana","Trocar de casa com o {B} durante um mês"],["Que o {A} fosse presidente da Câmara","Que o {B} fosse primeiro-ministro"],["Que o {A} gerisse as tuas redes sociais","Que o {B} respondesse às tuas mensagens"],
["Ter a paciência do {A}","Ter a coragem do {B}"],["Ir a um jantar de família com o {A} como teu par","Levar o {B} à tua entrevista de emprego"],["Ser o colega de quarto do {A} num Erasmus","Ser o colega de tenda do {B} num festival"],
["Que o {A} contasse a tua história mais embaraçosa no jantar de Natal","Que o {B} mostrasse a tua foto mais embaraçosa"],["Ter o carro do {A}","Ter a casa do {B}"],["Ser defendido pelo {A} numa discussão","Ser acalmado pelo {B} depois dela"],
["Que o {A} escolhesse o teu próximo destino de férias","Que o {B} escolhesse o hotel"],["Aprender uma língua com o {A}","Aprender a tocar guitarra com o {B}"],["Ter o {A} como vizinho","Ter o {B} como senhorio"],
["Fazer um podcast com o {A}","Abrir um restaurante com o {B}"],["Que o {A} fosse o teu treinador de vida","Que o {B} fosse o teu personal shopper"],["Passar 24 horas sem telemóvel com o {A}","24 horas a pão e água com o {B}"],
["Ter o talento do {A} para engatar","Ter o talento do {B} para desenrascar"],["Ser herdeiro do {A}","Ser o confidente do {B}"],["Ir num cruzeiro com o {A}","Num safari com o {B}"],
],
};
const PF_CATS=[["rotina","☕ Rotina"],["erotico","🌶️ Picante"],["filosofia","🧠 Filosofia"],["membros","👥 Malta"]];
const PF_START = "2026-W48";
function weekPFIds(gid, w) { if (w < PF_START) return []; const y = +w.slice(0, 4), n = +w.slice(6);
  return PF_CATS.map(([cat]) => { const N = PF[cat].length; const idx = [...Array(N).keys()]; let seed = hashStr2(gid + "|" + y + "|" + cat);
    for (let i = N - 1; i > 0; i--) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const j = seed % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return `pf:${cat}:${idx[(n - 1) % N]}`; }); }
// 4c) Preferias Flash: abre quarta às 00:00 (aviso a todos) e às 20h de quinta lembra quem ainda não jogou
if (wk >= PF_START) {
  const dow = weekdayLx(), h = hourLx();
  const stagePF = dow === "Wed" ? "open" : (dow === "Thu" && h >= 20 && h < 23) ? "last" : null;
  if (stagePF && st.pf !== wk + ":" + stagePF) {
    const vr = await loadVR(); const votesAll = vr[1];
    for (const [gid, g] of Object.entries(groups)) {
      if ((g.galas || []).some(d => d < ymd() && weekOf(d) === wk)) continue;
      const ids = weekPFIds(gid, wk); const mem = g.members || []; if (mem.length < 2 || !ids.length) continue;
      const played = k => ids.every(id => votesAll[k]?.weeks?.[wk]?.[id]);
      for (const k of mem) {
        if (stagePF === "open") await send(k, "votes", { title: "⚡ Preferias Flash!", body: "4 dilemas: rotina, picante, filosofia e a malta. Só até quinta às 23:30. Quem não jogar não vê as respostas dos outros 😏", tag: "pf-" + wk, url: `./?g=${gid}&t=dash` });
        else if (!played(k)) await send(k, "votes", { title: "⚡ O Preferias Flash fecha às 23:30", body: `Já jogaram ${mem.filter(played).length} de ${mem.length}. Se não jogares, na segunda não vês o que a malta escolheu 👀`, tag: "pf-" + wk, url: `./?g=${gid}&t=dash` });
      }
    }
    st.pf = wk + ":" + stagePF;
  }
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

await stRef.set({ lastRun: now, weekly: st.weekly || null, locked: st.locked || null, pf: st.pf || null, regs: st.regs || null, bday: st.bday || null, nudged: st.nudged || null }, { merge: true });
console.log(`Feito: ${sent} notificações enviadas.`);
process.exit(0);
