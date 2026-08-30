/* Service Worker — מקבל התראות גם כשהאפליקציה סגורה לגמרי */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* הודעת פוש נכנסת */
self.addEventListener("push", (event) => {
  let data = { title: "לוח מילואי מקום", body: "יש עדכון חדש במערכת" };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    try { data.body = event.data.text(); } catch (e2) {}
  }

  const title = data.title || "לוח מילואי מקום";
  const options = {
    body: data.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    dir: "rtl",
    lang: "he",
    tag: data.tag || "luach-miluim",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* לחיצה על ההתראה פותחת את האפליקציה */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
