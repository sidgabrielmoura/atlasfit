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
  const notificationTitle = payload.notification?.title || "AtlasFit";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/logos_atlasfit/atlasfit_black.png",
    badge: "/logos_atlasfit/atlasfit (4).png",
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  let origin = self.location.origin;
  if (origin.includes("vercel.app") || origin.includes("atlasfit-steel")) {
    origin = "https://atlasfit.site";
  }

  let urlToOpen = event.notification.data?.url || "/";
  if (urlToOpen.startsWith("/")) {
    urlToOpen = origin + urlToOpen;
  } else {
    urlToOpen = urlToOpen.replace(/https:\/\/atlasfit[a-zA-Z0-9-]*\.vercel\.app/g, "https://atlasfit.site");
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        const clientUrlNormalized = client.url.replace(/https:\/\/atlasfit[a-zA-Z0-9-]*\.vercel\.app/g, "https://atlasfit.site");
        const targetUrlNormalized = urlToOpen.replace(/https:\/\/atlasfit[a-zA-Z0-9-]*\.vercel\.app/g, "https://atlasfit.site");
        
        if (clientUrlNormalized === targetUrlNormalized && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
