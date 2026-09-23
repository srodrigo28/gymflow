import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { prisma } from './db.js';
import { env } from './env.js';

const server = serve({ fetch: createApp().fetch, hostname: env.HOST, port: env.PORT }, (info) => {
  console.log(`API do Gyn Flow em http://localhost:${info.port}`);
});

function shutdown() {
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
