
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

loadEnv();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[typeorm.config.ts] Thiếu biến môi trường "${key}" trong file .env.\n` +
        `Cần đủ 5 biến: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE.\n` +
        `Kiểm tra file .env có nằm đúng trong thư mục cinehunt-backend không.`,
    );
  }
  return value;
}

const port = parseInt(process.env.DB_PORT ?? '1433', 10);
if (Number.isNaN(port)) {
  throw new Error(
    `[typeorm.config.ts] DB_PORT="${process.env.DB_PORT}" không phải số hợp lệ.`,
  );
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'mssql',
  host: requireEnv('DB_HOST'),
  port,
  username: requireEnv('DB_USERNAME'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_DATABASE'),

  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],

  migrations: [__dirname + '/src/migrations/*{.ts,.js}'],

  migrationsTableName: 'typeorm_migrations',

  synchronize: false,

  logging: ['error', 'schema', 'migration'],

  options: {
    encrypt:
      (process.env.DB_ENCRYPT ?? 'false').toLowerCase() === 'true',

    trustServerCertificate:
      (process.env.DB_TRUST_SERVER_CERTIFICATE ?? 'true').toLowerCase() ===
      'true',

    ...(process.env.DB_INSTANCE
      ? { instanceName: process.env.DB_INSTANCE }
      : {}),
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
