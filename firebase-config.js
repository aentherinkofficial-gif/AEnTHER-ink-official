// AetherInk Studio — Firebase web config (public by design).
// Fill these from Firebase Console → Project settings → Your apps.
// Also set ADMIN_EMAIL to the Gmail you will use for admin uploads.

export const ADMIN_EMAIL = "aentherinkofficial@gmail.com"; // ← change this

export const firebaseConfig = {
  apiKey: "\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDPbkMkoFctV5iJ\n8gefGktAUE5G/vuVzIdNPWTSajcViaQi0Bo+xhdlDvIj4cJ1PdV8Oe1jWo+8r2+P\nCDWNltzmfquV8ja0THs61o6kMnh4KwtNpxwjOlB63lI48pZJJ/sTj9IDXE0cruqe\nZYvr7s2Yhtt8caL8k0G2rJVcgaHH3DsQHV9fDsZi1saQ74h5dO3/pBmblQeh7hIl\n/z8tjex9ccjAUTxO2cc5uZpPBPocLiDNUUCQDJyvV46n04DZYDr0mM4LyF38N9KX\ndmo1i6KrrueMelJJsQUau/83/aJ6ZkkxMY4884Xfc+n5Kl/IDe3cdBw5x8KLsu0C\n3lzK+ZgZAgMBAAECggEAFaml/PH60LssbMGYPqssDzIjzqHL6+vBeJVQDXJ2wLrQ\nZ6tUhlhBMrZiHtGxsXVM8Y2KJ11alAG9VJJup1QJS1AQwtbaFC/FkdI88NRthN03\n77rjQyGQrJhBvX1GKSsx+yvCqsOtsPBqg7LGr1PP6F0zGFa0xwxo6TcyXQgTuW+s\nHBQhUbPRUzoDuFaKcOn/sz7bOMkKrSdKRMDjuAwV1gGdG6X6o1kC3qjjWNZ5zcJk\nDB3CPKzHYHrMyxG1GngpEiqCRB8d2AEYLsOq2C0Z7I3B8NNDyTvYRSOkD6TL6/rU\nBZpV3NhaLGNHj3/Rk7/oNelJyDiW2b6Bg+ZGs27xdQKBgQDszLPC6TMX3Z2QLX0G\n380Z2qBG3jmbJepM9KW1tf6ciw+X831SR4Y9a0yLR2Dkp6eVBcwDef3JrtUdyuWc\nDynLxkNaxbq+cGqBkeq/OnlzsxGorU2zcvph0faTX2Mqdi58QgRtOcd9l8Rfqx3K\n0j/A48gaUVGpW1BM4u/42tgzfQKBgQDgP/GYk6BW/B3030MpVq/Dan/dQ3VFaLTS\ny/YShDNBxHQop67FXsLaUhiQR3LpUcUx7RmFhVVM1bHGO367oUFO0u9ZpbLiHFnM\nMnt6NlRuU8A1eJPlrAWIBuW2Ozk1Hnmv38yjXeL0ScNsF0tx+dFIGuyiPQ30Xw+g\nXK68JY5hzQKBgA+xNQxqlcc0GXfve8ST2iynb02i9mBQr+kvoTeceuX21S61pQ1p\nzfyN+sGUFliwv4tBmhZ05BuUaW0TAApKevOVDOucBNcP7g7uE4deoaPILxhle6uz\np+IJnvR/Mrwinsv/N/nhBVZOU2YfmdbR/gWTUrRjxSya74RY2Zw9LGylAoGAV/4/\nWtNysy8ywgdpXys4xMFhcv0pYxb2/VAzOojNZB0mR12k4qWQaAKWyOaAXLVNX43d\n2dq74e5oV5S44f8glUGH0fGHA9qEEfAtK4NuFeyfG1w5DII3mWy7bopGpGVU8oIq\n1l/c0mavXBa37/1K9bQ67l5uv1kd1JsJpaJHAHECgYAZFze7JKAhjqx0xjdy53bt\novVoQpzU9hSpaoEPp+yCUNnW8iaZCsxa0OU43GROIIh7DOuKVpZ4apAwRflu3VYB\nW3DOsGZPQ555xXxq7VJ4/yoRmG/NCXfkVfGb6B+mpSKAxVMZsc2IxOqM+kRZ5+/e\ndUfGHPPxr+Lt83TsXqiUTg==\n-----END PRIVATE KEY-----\n",
  authDomain: "aetherink-website.firebaseapp.com",

  projectId: "aetherink-website",

  storageBucket: "aetherink-website.appspot.com",

  appId: "PASTE_APP_ID_HERE"
};

export function isFirebaseConfigReady() {
  const v = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.appId
  ];
  return v.every(
    x => typeof x === "string" && x.trim() && !/PASTE_|YOUR_PROJECT_ID/i.test(x)
  );
}
