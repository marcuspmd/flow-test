import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_USERNAME: Joi.string().allow('', null),
  REDIS_PASSWORD: Joi.string().allow('', null),
  FLOW_RUN_QUEUE: Joi.string().default('flow-run-queue'),
});
