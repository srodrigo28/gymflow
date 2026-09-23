import type { User } from '../generated/prisma/client.js';
import type { RateLimiter } from './lib/rate-limit.js';

export type AppEnv = {
  Variables: {
    ip: string;
    limit: RateLimiter;
    sessionId: string;
    user: User;
  };
};
