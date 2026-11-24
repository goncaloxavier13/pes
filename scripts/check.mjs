// Pês — verificação só de leitura (não altera nada). Imprime apenas contagens, sem dados pessoais.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const all = async c => Object.fromEntries((await db.collection(c).get()).docs.map(d => [d.id, d.data()]));
const ymd = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
function weekOf(s) { const [y, m, d] = s.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); const day = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - day + 3);
  const fy = dt.getUTCFullYear(); const jan4 = new Date(Date.UTC(fy, 0, 4)); const w = 1 + Math.round(((dt - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7); return `${fy}-W${String(w).padStart(2, "0")}`; }
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
const cfg = (await db.doc("config/app").get()).data() || {};
const [people, groups, uids, rankings, votes, awards, events, reads, chats, sys] = await Promise.all(["people","groups","uids","rankings","votes","awards","events","reads","chats","system"].map(all));
function weekEndIso(w) { const [y, n] = [+w.slice(0, 4), +w.slice(6)]; const jan4 = new Date(Date.UTC(y, 0, 4)); const mon = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (n - 1) * 7); return new Date(mon.getTime() + 7 * 864e5 + 2 * 3600e3).toISOString(); }
const wk = weekOf(ymd(new Date(Date.now() + 3 * 3600e3))); // a semana de votação fecha ao domingo às 21h
const prev = weekOf(ymd(new Date(Date.now() + 3 * 3600e3 - 7 * 864e5)));
const out = { semana: wk, pessoas: Object.keys(people).length, contas_ligadas: Object.keys(uids).length, problemas: [] };
const mapped = Object.values(uids).map(u => u.key || u.person || u.k || u);
const dupMap = mapped.filter((k, i) => mapped.indexOf(k) !== i).length; if (dupMap) out.problemas.push(`${dupMap} contas ligadas ao mesmo perfil`);
for (const [gid, g] of Object.entries(groups)) {
  const ms = g.members || []; const aw = Object.entries(awards).filter(([, a]) => a.groupId === gid).map(([id]) => id);
  const orphan = ms.filter(k => !people[k]).length; if (orphan) out.problemas.push(`${g.name}: ${orphan} membros sem perfil`);
  const noAcc = ms.filter(k => !mapped.includes(k)).length;
  const r = w => ms.filter(k => rankings[k]?.weeks?.[w]?.[gid]).length;
  const full = w => ms.filter(k => rankings[k]?.weeks?.[w]?.[gid] && aw.every(id => votes[k]?.weeks?.[w]?.[id])).length;
  const qs = [...weekQuestions(gid, wk).map(q => q.id), ...(wk >= "2026-W48" ? ["reg:irrit", "reg:expert", "reg:coro", "reg:mom"] : [])]; const tudo = ms.filter(k => rankings[k]?.weeks?.[wk]?.[gid] && [...aw, ...qs].every(id => votes[k]?.weeks?.[wk]?.[id])).length; const qAns = ms.filter(k => qs.every(id => votes[k]?.weeks?.[wk]?.[id])).length;
  const ev = Object.values(events).filter(e => e.groupId === gid).length;
  const push = ms.filter(k => Object.keys(reads[k]?.push?.subs || {}).length).length;
  const bd = ms.filter(k => people[k]?.birthday).length;
  out[g.name] = { id: gid, membros: ms.length, admins: (g.admins || []).length, admin_e_dono: (g.admins || []).filter(k => Object.entries(uids).some(([u, v]) => (v.key || v) === k && u === (cfg.ownerUid || "?"))).length, sem_conta: noAcc, premios: aw.length, ranking_esta_semana: r(wk), ranking_e_premios_esta_semana: full(wk), ranking_semana_anterior: r(prev), premios_semana_anterior: ms.filter(k => aw.filter(id => !awards[id].createdAt || +new Date(awards[id].createdAt) < +new Date(weekEndIso(prev))).every(id => votes[k]?.weeks?.[prev]?.[id])).length, trancados_esta_semana_regra_app: ms.filter(k => !(rankings[k]?.weeks?.[prev]?.[gid] && (prev < "2026-W47" || aw.filter(id => !awards[id].createdAt || +new Date(awards[id].createdAt) < +new Date(weekEndIso(prev))).every(id => votes[k]?.weeks?.[prev]?.[id])))).length, perguntas_esta_semana: qs.length, responderam_perguntas: qAns, votacao_completa: tudo, eventos: ev, eventos_que_contam: Object.values(events).filter(e => e.groupId === gid && Object.keys(e.att || {}).filter(k => k === e.createdBy || e.att[k] === "yes").length + (e.att?.[e.createdBy] === undefined ? 1 : 0) >= 4).length, notificacoes_ativas: push, aniversarios: bd, galas: g.galas || [], gala_comecada: Object.keys(g.galaStarted || {}), premios_criados: aw.map(id => awards[id].createdAt ? new Date(awards[id].createdAt).toISOString().slice(0, 16) : "?"), faltam_premios_a_quem_fez_ranking: ms.filter(k => rankings[k]?.weeks?.[wk]?.[gid]).map(k => aw.filter(id => !votes[k]?.weeks?.[wk]?.[id]).length).filter(x => x) };
}
out.conversas = Object.keys(chats).length;
out.perfil_claudio = cfg.ownerKey ? "ligado ao dono" : "ainda não ligado (o dono tem de abrir a app)";
const cwd = sys.chatwatch || {}; out.vigia_do_chat = cwd.alive ? `ativo há ${Math.round((Date.now() - cwd.alive) / 1000)} s` : "parado";
if (process.env.PERSON) for (const [gid, g] of Object.entries(groups)) { const k = (g.members || []).find(k => (people[k]?.name || "").split(" ")[0] === process.env.PERSON); if (!k) continue;
  out.pessoa = { fez_ranking_semana_passada: !!rankings[k]?.weeks?.[prev]?.[gid], fez_ranking_esta_semana: !!rankings[k]?.weeks?.[wk]?.[gid], tem_conta: mapped.includes(k), dispositivos_notificacoes: Object.keys(reads[k]?.push?.subs || {}).length, prefs: reads[k]?.push?.prefs || {}, ultima_leitura_ms_atras: Date.now() - Math.max(0, ...Object.values(reads[k]?.chats || reads[k]?.read || {}).map(Number).filter(Boolean)) }; }
out.cantinhos = {}; for (const [cid, c] of Object.entries(chats)) { if (c.type !== "cantinho") continue; const mm = (await db.collection(`chats/${cid}/msgs`).get()).docs.map(d => d.data()); const cnt = {}; mm.forEach(m => { const t = (m.sec || "q") + (m.kind ? ":" + m.kind : "") + (m.from === "bot" ? ":bot" : ""); cnt[t] = (cnt[t] || 0) + 1; });
  out.cantinhos[cid] = { periodo: c.period, fechado: !!c.closed, com_acesso: (c.members || []).length, termina: c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 16) : null, mensagens: cnt }; }
out.tribunal = Object.fromEntries(Object.entries(groups).map(([gid, g]) => [g.name, g.trib ? { meritissimo_encontrado: !!g.trib.sid, estado: g.trib.cur?.status || null, semana: g.trib.cur?.w || null, processos: g.trib.seq || 0, penas_por_cumprir: (g.trib.pens || []).filter(p => !p.done).length, casos_na_caixa: Object.values(reads[g.trib.sid]?.trib?.inbox || {}).filter(c => c.gid === gid && c.w === g.trib.cur?.w).length, caso_escolhido_pelo_sid: !!reads[g.trib.sid]?.trib?.pick?.[gid]?.[g.trib.cur?.w], veredicto_enviado_pelo_sid: !!reads[g.trib.sid]?.trib?.verdict?.[gid]?.[g.trib.cur?.w] } : "ainda sem dados"]));
const n = sys.notify || {}; out.notificacoes_ultima_execucao = n.lastRun ? new Date(n.lastRun).toISOString() : null;
console.log(JSON.stringify(out, null, 2));
