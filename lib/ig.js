import { DateTime } from "luxon";

function toMinutes(hhmm){
  const [h,m] = String(hhmm).split(":").map(Number);
  return (h*60) + (m || 0);
}

export function isOpenNow(){
  const tz = process.env.TIMEZONE || "America/Argentina/Buenos_Aires";
  const openDays = (process.env.OPEN_DAYS || "2,3,4,5,6,7").split(",").map(n => Number(n.trim()));
  const startMin = toMinutes(process.env.OPEN_START || "20:00");
  const endMin = toMinutes(process.env.OPEN_END || "00:30");
  const overnight = endMin <= startMin;

  const now = DateTime.now().setZone(tz);
  const minutes = now.hour * 60 + now.minute;
  const wd = now.weekday; // 1..7 (lun..dom)
  const prevWd = now.minus({ days: 1 }).weekday;

  if (overnight){
    const blockA = openDays.includes(wd) && minutes >= startMin;
    const blockB = openDays.includes(prevWd) && minutes < endMin;
    return blockA || blockB;
  } else {
    return openDays.includes(wd) && minutes >= startMin && minutes < endMin;
  }
}

export function buildMessage(){
  const url = process.env.ORDER_URL || "https://example.com";
  if (isOpenNow()){
    return `¡Hola! Estamos abiertos ahora. Podés hacer tu pedido por la web: ${url}`;
  }
  return "¡Hola! No estamos abiertos en este momento. Nuestro horario es de 20:00 a 00:30 (mar a dom). Podés dejarnos tu mensaje y te respondemos ni bien abramos 🙌";
}

export async function sendIgText(igsid, text){
  const IG_ID = process.env.IG_ID;
  const PAGE_TOKEN = process.env.PAGE_TOKEN;
  if(!IG_ID || !PAGE_TOKEN) throw new Error("Faltan IG_ID o PAGE_TOKEN");
  const url = `https://graph.facebook.com/v20.0/${IG_ID}/messages?access_token=${encodeURIComponent(PAGE_TOKEN)}`;
  const body = {
    messaging_product: "instagram",
    recipient: { id: igsid },
    message: { text }
  };
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if(!res.ok){
    const t = await res.text();
    throw new Error(`IG send error ${res.status}: ${t}`);
  }
  return res.json();
}

export async function markSeen(igsid){
  const IG_ID = process.env.IG_ID;
  const PAGE_TOKEN = process.env.PAGE_TOKEN;
  const url = `https://graph.facebook.com/v20.0/${IG_ID}/messages?access_token=${encodeURIComponent(PAGE_TOKEN)}`;
  const body = {
    messaging_product: "instagram",
    recipient: { id: igsid },
    sender_action: "mark_seen"
  };
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}