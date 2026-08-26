importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDdYGOfrun1cHe7a7T9K5yyNaYhui_Xwsk",
  authDomain: "atlasfit-5a39c.firebaseapp.com",
  projectId: "atlasfit-5a39c",
  storageBucket: "atlasfit-5a39c.firebasestorage.app",
  messagingSenderId: "562534718789",
  appId: "1:562534718789:web:6d789dbeeae6f684f1f22c"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || "AtlasFit";
  const notificationBody = payload.notification?.body || payload.data?.description || payload.data?.body || "";
  const imageUrl = payload.notification?.image || payload.notification?.imageUrl || payload.data?.image || payload.data?.imageUrl;
  const tag = payload.data?.tag || payload.data?.engagePushLogId || payload.data?.notificationId || "atlasfit-push";

  const notificationOptions = {
    body: notificationBody,
    icon: "/logos_atlasfit/atlasfit_black.png",
    badge: "/logos_atlasfit/atlasfit (4).png",
    image: imageUrl || undefined,
    tag: tag,
    renotify: false,
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || payload.data?.deepLink || "/",
      ...payload.data
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let origin = self.location.origin;
  if (origin.includes("vercel.app") || origin.includes("atlasfit-steel")) {
    origin = "https://app.atlasfit.site";
  }

  let urlToOpen = event.notification.data?.url || event.notification.data?.deepLink || "/";
  if (urlToOpen.startsWith("/")) {
    urlToOpen = origin + urlToOpen;
  } else if (!urlToOpen.startsWith("http")) {
    urlToOpen = `${origin}/${urlToOpen}`;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ("focus" in client) {
          if (client.url === urlToOpen || client.url.startsWith(origin)) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
