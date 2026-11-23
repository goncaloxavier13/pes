// Pês — envia um anúncio (notificação) a todos os membros dos grupos. Corre à mão no GitHub Actions (anuncio.yml).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import webpush from "web-push";
const { FIREBASE_SERVICE_ACCOUNT: SA, VAPID_PRIVATE_KEY: VP, VAPID_PUBLIC_KEY: VPUB, TITLE, BODY, QUERY = "" } = process.env;
if (!SA || !VP || !TITLE) { console.log("Faltam dados."); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(SA)) }); const db = getFirestore();
webpush.setVapidDetails("mailto:goncaloxavier13@gmail.com", VPUB, VP);
const groups = (await db.collection("groups").get()).docs.map(d => ({ id: d.id, ...d.data() }));
const reads = Object.fromEntries((await db.collection("reads").get()).docs.map(d => [d.id, d.data()]));
const done = new Set(); let sent = 0, people = 0;
for (const g of groups) for (const k of g.members || []) {
  if (done.has(k)) continue; done.add(k); const subs = reads[k]?.push?.subs || {}; if (Object.keys(subs).length) people++;
  for (const [h, sub] of Object.entries(subs)) {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ title: TITLE, body: BODY || "", tag: "anuncio", url: `./?g=${g.id}${QUERY}` }), { TTL: 86400 }); sent++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.doc("reads/" + k).update({ [`push.subs.${h}`]: FieldValue.delete() }).catch(() => {}); }
  }
}
console.log(`Anúncio enviado: ${sent} notificações para ${people} pessoas.`);
