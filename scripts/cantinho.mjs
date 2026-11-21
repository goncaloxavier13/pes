// Pês — o Cantinho: todas as semanas uma pessoa do grupo responde às perguntas do Anfitrião (perguntas preparadas, sem IA).
// Corre no GitHub Actions. Segredos: FIREBASE_SERVICE_ACCOUNT e VAPID_PRIVATE_KEY.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import webpush from "web-push";

const SA = process.env.FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY, VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const DRY = !!process.env.DRY_WEEK; // test: simulate a week without writing anything
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

// ── Perguntas do Anfitrião (sem IA) ──
const PHILO = [
"Se pudesses saber a resposta a uma única pergunta sobre o universo, qual escolhias?","Achas que somos a mesma pessoa que éramos há dez anos? O que mudou de verdade?",
"O que é, para ti, uma vida bem vivida?","Se ninguém se lembrasse de nada do que fizeste, o que farias de diferente?","A felicidade procura-se ou acontece?",
"Preferias saber a data em que vais morrer ou a forma como vais morrer?","Se pudesses viver noutra época, qual escolhias e porquê?","O que é mais importante: ser respeitado ou ser querido?",
"Achas que o destino existe ou fazemos tudo à nossa maneira?","Se pudesses mandar uma mensagem ao teu eu de 15 anos, o que dizias?","O que é que nunca farias, nem por um milhão de euros?",
"Achas que as pessoas mudam mesmo, ou só aprendem a esconder melhor?","Qual é a diferença entre estar sozinho e sentir-se sozinho?","Se o dinheiro não existisse, o que farias da vida?",
"O que te dá mais medo: falhar ou nunca tentar?","É melhor ter tido e perdido, ou nunca ter tido?","Uma mentira pode ser a coisa certa a fazer? Dá um exemplo.",
"O que é que a maioria das pessoas valoriza demais?","E o que é que a maioria das pessoas valoriza de menos?","Se pudesses ter um superpoder só por um dia, qual era e o que fazias?",
"O que te faz sentir mais vivo?","Achas que a amizade verdadeira aguenta tudo?","Qual é a coisa mais importante que aprendeste sem ninguém te ensinar?",
"Se pudesses apagar uma memória, apagavas? Qual?","Preferias ser o mais inteligente da sala ou o mais divertido?","O que achas que vão dizer de ti daqui a 50 anos?",
"Qual é a tua definição de sucesso?","Somos mais nós próprios sozinhos ou com os amigos?","Se pudesses jantar com qualquer pessoa da história, quem escolhias?",
"Qual é a pergunta que mais gostavas que te fizessem e ninguém faz?","Achas que há coisas que é melhor não saber?","O que é que tu sabes hoje que gostavas de ter sabido há 5 anos?",
"Qual é a regra que segues mesmo quando ninguém está a ver?","Se a tua vida fosse um filme, que género era?","O tempo cura mesmo tudo?",
"Preferias poder voltar atrás no tempo ou ver o futuro?","Qual é o maior luxo da vida que não custa dinheiro?","O que é que te faz confiar em alguém?",
"Se pudesses mudar uma coisa no mundo amanhã, o que mudavas?","Achas que é possível ser feliz sem ambição?","Qual foi o momento em que te sentiste mais adulto?",
"O que é que te torna diferente de toda a gente que conheces?","Preferias uma vida tranquila ou uma vida cheia de aventuras?","Quando foi a última vez que mudaste de opinião sobre algo importante?",
"Há algum sonho que já desististe? Arrependes-te?","O que é que o mundo precisa mais: de mais coragem ou de mais calma?","Qual é a tua maior contradição?",
"Se tivesses de escolher uma palavra para resumir a tua vida até agora, qual era?","Achas que a sorte se faz ou simplesmente acontece?","O que é que gostavas que o grupo soubesse sobre ti e talvez não saiba?",
];
const ROUTINE = [
"Como é uma manhã perfeita para ti, do acordar ao almoço?","Qual foi o melhor momento da tua semana até agora?","Qual é a primeira coisa que fazes quando acordas?",
"O que é que comeste hoje que valeu a pena?","Qual é a tua série ou programa do momento?","Que música andas a ouvir em repeat?",
"Qual é a tarefa de casa que mais odeias?","Café, chá ou nada? E como?","Qual é o teu plano ideal para um domingo?",
"Se hoje tivesses a tarde livre, o que fazias?","Qual é a tua comida de conforto?","És mais de deitar cedo ou de deitar tarde? Porquê?",
"Qual foi a última coisa que compraste e não precisavas?","Que hábito gostavas de ter e ainda não tens?","Qual é a app que mais usas no telemóvel (sem contar com esta)?",
"Qual é o teu restaurante preferido e o que pedes sempre?","O que é que te tirou do sério esta semana?","Qual é a tua rotina antes de dormir?",
"Qual foi a última vez que te riste até doer a barriga?","Qual foi o último sítio novo que visitaste?","Fazes desporto? Qual e quantas vezes?",
"Qual é a viagem que tens mesmo de fazer nos próximos anos?","Se pudesses mudar uma coisa no teu dia a dia, o que era?","Qual é o melhor conselho que já te deram?",
"Quem do grupo é que te ligava às 3h da manhã a pedir ajuda?","Qual é a tua memória preferida com este grupo?","Qual foi o jantar de grupo mais épico de sempre?",
"O que é que te põe de bom humor em 5 minutos?","Qual é o teu maior vício inofensivo?","Qual foi o último livro, filme ou podcast que te marcou?",
"Que prato sabes cozinhar melhor do que ninguém?","Qual é a coisa mais aleatória que tens no quarto?","O que é que estás a planear para o Natal?",
"Qual é o teu plano para o próximo fim de semana?","Qual foi a última mensagem que te fez sorrir?","És mais de praia ou de montanha?",
"Qual é a coisa que fazes melhor do que toda a gente do grupo?","E a coisa que fazes pior?","Qual foi a última vez que fizeste algo pela primeira vez?",
"Se tivesses de dar uma aula sobre qualquer tema, qual era?","Qual é o teu som preferido?","Qual é a tua estação do ano preferida e porquê?",
"O que é que tens sempre no frigorífico?","Qual foi o melhor presente que já recebeste?","Qual é a tua mania que mais irrita os outros?",
"Que objeto levavas para uma ilha deserta?","Qual é o teu sítio preferido em Portugal?","O que é que te dá mais preguiça?",
"Se pudesses aprender uma língua num estalar de dedos, qual era?","Qual foi o melhor concerto ou espetáculo a que foste?",
];
const REACTIONS = ["Interessante… 🤔","Gostei dessa! 👏","Hmm, isso dá que pensar 🧐","Uau, não estava à espera 😮","Fica registado 📝","Muito bem respondido 😌",
"Isso explica muita coisa 😄","Resposta digna de filósofo 🏛️","O grupo vai adorar ler isto 👀","Faz todo o sentido 👌","Ah, então é assim! 😅","Profundo… 🌊",
"Respeito 🙌","Essa vai dar conversa no próximo jantar 🍷","Nota 10 para a sinceridade 💯","Estou a ver, estou a ver… 🤓","Belíssimo 😎","Não esperava outra coisa de ti 😏",
"Guardado no cantinho 🛋️","Gosto da forma como pensas 💭","Boa! Próxima 🚀","Isso merecia um brinde 🥂","Mais uma para a coleção 😄","Está bem visto 👁️"];
const PER_DAY = 3; // perguntas por dia, no máximo
const MORNING = 10; // a partir das 10h há pergunta nova, se a de ontem já foi respondida
const pick = (arr, used) => { const free = arr.map((_, i) => i).filter(i => !used.includes(i)); const pool = free.length ? free : arr.map((_, i) => i); return pool[Math.floor(Math.random() * pool.length)]; };
function nextQuestion(gs, nAsked) {
  // começa com 3 filosóficas; depois alterna rotina / filosófica
  const philo = nAsked < 3 || (nAsked - 3) % 2 === 1; const key = philo ? "usedP" : "usedR"; const arr = philo ? PHILO : ROUTINE;
  let used = gs[key] || []; if (used.length >= arr.length) used = [];
  const i = pick(arr, used); gs[key] = [...used, i]; return arr[i];
}
function reaction(gs) { const i = pick(REACTIONS, gs.usedRx || []); gs.usedRx = [...(gs.usedRx || []).slice(-10), i]; return REACTIONS[i]; }
async function botSay(cid, text, q, end) {
  const at = Date.now();
  if (DRY) { console.log("[simulação] o Anfitrião diria:", text); return; }
  await db.collection(`chats/${cid}/msgs`).add({ from: BOT, text, at, ...(q ? { q: true } : {}), ...(end ? { end: true } : {}) });
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
    const opening = `Bem-vindo ao cantinho, ${first(host)} 🛋️ Esta semana és tu que te sentas aqui e o grupo todo está a ler. Começamos com calma: ${nextQuestion(gs, 0)}`;
    await botSay(cid, opening, true);
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
  const last = msgs[msgs.length - 1]; if (!last) continue;
  const asked = msgs.filter(m => m.from === BOT && m.q); const askedToday = asked.filter(m => ymd(new Date(m.at)) === today).length;
  const tell = text => send(chat.host, { title: "🛋️ O Anfitrião respondeu", body: text.slice(0, 140), tag: "cant-host-" + cid, url: `./?g=${gid}&t=gap&c=${cid}` });
  if (last.from === chat.host) {
    // a pessoa respondeu: reação curta + pergunta seguinte (até PER_DAY por dia)
    if (askedToday < PER_DAY) { const t = `${reaction(gs)} ${nextQuestion(gs, asked.length)}`; await botSay(cid, t, true); await tell(t); }
    else { const closed = msgs.some(m => m.from === BOT && m.end && ymd(new Date(m.at)) === today);
      await botSay(cid, closed ? reaction(gs) : `${reaction(gs)} Por hoje ficamos por aqui 🛋️ Amanhã há mais perguntas no cantinho.`, false, !closed); }
  } else if (last.from === BOT && !last.q && ymd(new Date(last.at)) < today && hourLx() >= MORNING) {
    // dia novo e a última pergunta já foi respondida: pergunta do dia
    const t = `Bom dia, ${first(chat.host)} ☀️ Pergunta do dia: ${nextQuestion(gs, asked.length)}`; await botSay(cid, t, true); await tell(t);
  }
}
if (!DRY) await stRef.set(newSt);
console.log(`Feito: ${sent} notificações.`);
