/*
 * "השליח" — פונקציה שרצה בשרתי Netlify.
 * היא זו שדוחפת את ההתראה למכשיר, גם כשהאפליקציה סגורה.
 *
 * דורשת שלושה משתני סביבה שמוגדרים בממשק של Netlify:
 *   VAPID_PUBLIC   — המפתח הציבורי
 *   VAPID_PRIVATE  — המפתח הפרטי (סודי!)
 *   VAPID_SUBJECT  — mailto:הכתובת שלך
 */

const webpush = require("web-push");

exports.handler = async (event) => {
  // מאפשר קריאה מהדפדפן
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const { VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "חסרים מפתחות VAPID בהגדרות Netlify" }),
    };
  }

  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC, VAPID_PRIVATE);

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "גוף הבקשה אינו JSON תקין" }) };
  }

  const { subscriptions, title, body, url } = payload;
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "לא נשלחו נמענים" }) };
  }

  const message = JSON.stringify({
    title: title || "לוח מילואי מקום",
    body: body || "",
    url: url || "/",
    tag: "luach-" + Date.now(),
  });

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, message);
        return { ok: true };
      } catch (err) {
        // 404/410 = המנוי כבר לא תקף (המשתמש הסיר את האפליקציה)
        return { ok: false, gone: err.statusCode === 404 || err.statusCode === 410, code: err.statusCode };
      }
    })
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      gone: results.filter((r) => r.gone).length,
    }),
  };
};
