// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://508e986949b86b997b46aaef401aafe2@o4512447963267072.ingest.us.sentry.io/4512448965115904",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Turns off collection of data that could identify users. Adjust per category:
  // https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection
  dataCollection: {
    userInfo: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    httpBodies: [],
    httpHeaders: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    cookies: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  },
});
