import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenOtpCodes1785605000000 implements MigrationInterface {
  name = 'HardenOtpCodes1785605000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQL Server resolves column names per batch. End the schema-changing batch
    // before a later query references `used_at`.
    await queryRunner.query(`
      IF OBJECT_ID(N'dbo.otp_codes', N'U') IS NULL
      BEGIN
        THROW 52010, N'Bảng dbo.otp_codes chưa tồn tại.', 1;
      END;

      ALTER TABLE dbo.otp_codes ALTER COLUMN code VARCHAR(64) NOT NULL;

      IF COL_LENGTH(N'dbo.otp_codes', N'attempts') IS NULL
      BEGIN
        ALTER TABLE dbo.otp_codes
          ADD attempts INT NOT NULL
          CONSTRAINT DF_otp_codes_attempts DEFAULT 0;
      END;

      IF COL_LENGTH(N'dbo.otp_codes', N'used_at') IS NULL
      BEGIN
        ALTER TABLE dbo.otp_codes ADD used_at DATETIME2(0) NULL;
      END;
    `);

    await queryRunner.query(`
      UPDATE dbo.otp_codes
      SET is_used = 1,
          used_at = COALESCE(used_at, SYSDATETIME())
      WHERE is_used = 0;
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'HardenOtpCodes là migration bảo mật không thể tự động revert an toàn.',
    );
  }
}
