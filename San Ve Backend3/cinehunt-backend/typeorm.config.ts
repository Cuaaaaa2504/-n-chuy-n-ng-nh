// typeorm.config.ts — đặt ở ROOT của cinehunt-backend (cùng cấp package.json)
//
// TypeORM CLI không bootstrap được NestJS app nên không đọc được config trong
// TypeOrmModule.forRootAsync. File này export default một DataSource độc lập,
// đọc thẳng process.env sau khi dotenv.config().

import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

loadEnv();

/**
 * FIX — lỗi "Bảng typeorm_migrations không được tạo".
 *
 * Nguyên nhân thật sự thường KHÔNG phải TypeORM không tạo bảng, mà là CLI
 * không kết nối được DB do thiếu biến trong .env — nhưng thông báo lỗi của
 * driver mssql rất khó đọc ("Failed to connect to undefined:1433").
 * Hàm này fail sớm với thông báo rõ ràng bằng tiếng Việt.
 */
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
  // parseInt bắt buộc: process.env luôn trả về string, driver mssql cần number.
  port,
  username: requireEnv('DB_USERNAME'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_DATABASE'),

  // Entities chỉ cần cho `migration:generate` (so sánh entity với schema DB).
  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],

  // Nơi CLI tìm file migration.
  migrations: [__dirname + '/src/migrations/*{.ts,.js}'],

  /**
   * FIX QUAN TRỌNG — hướng dẫn nói phải kiểm tra bảng `dbo.typeorm_migrations`,
   * nhưng mặc định TypeORM tạo bảng tên `migrations`. Không khai báo dòng này
   * thì bước kiểm tra trong SSMS luôn "không thấy bảng" dù migration đã chạy
   * thành công. Giá trị này PHẢI giống hệt bên app.module.ts.
   */
  migrationsTableName: 'typeorm_migrations',

  // CLI không bao giờ được tự sửa schema.
  synchronize: false,

  logging: ['error', 'schema', 'migration'],

  options: {
    encrypt: false,
    /**
     * FIX — lỗi SSL / certificate khi chạy CLI trên SQL Server local (Windows).
     * mssql v11 mặc định vẫn validate certificate; SQL Server local dùng
     * self-signed cert nên bắt buộc phải có dòng này.
     */
    trustServerCertificate: true,
    // Chỉ dùng khi SQL Server cài dạng named instance (VD: SQLEXPRESS).
    // Lúc đó đặt DB_INSTANCE=SQLEXPRESS trong .env.
    ...(process.env.DB_INSTANCE
      ? { instanceName: process.env.DB_INSTANCE }
      : {}),
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
