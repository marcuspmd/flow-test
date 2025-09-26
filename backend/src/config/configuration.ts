export default () => ({
  environment: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://flowtest:flowtest@localhost:5433/flowtest?schema=public',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  },
  queue: {
    flowRun: process.env.FLOW_RUN_QUEUE ?? 'flow-run-queue',
  },
});
