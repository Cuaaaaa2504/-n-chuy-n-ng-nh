import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenCriticalLifecycle1786431600000
  implements MigrationInterface
{
  name = 'HardenCriticalLifecycle1786431600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.booking_orders', 'idempotency_key') IS NULL
      BEGIN
        ALTER TABLE dbo.booking_orders
          ADD idempotency_key VARCHAR(100) NULL;
      END;
    `);

    await queryRunner.query(`
      ;WITH duplicate_keys AS (
        SELECT
          booking_id,
          ROW_NUMBER() OVER (
            PARTITION BY user_id, idempotency_key
            ORDER BY created_at ASC, booking_id ASC
          ) AS rn
        FROM dbo.booking_orders
        WHERE idempotency_key IS NOT NULL
      )
      UPDATE bo
      SET bo.idempotency_key = NULL
      FROM dbo.booking_orders AS bo
      INNER JOIN duplicate_keys AS d
        ON d.booking_id = bo.booking_id
      WHERE d.rn > 1;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.booking_orders')
          AND name = 'UX_booking_orders_user_idempotency'
      )
      BEGIN
        CREATE UNIQUE INDEX UX_booking_orders_user_idempotency
          ON dbo.booking_orders (user_id, idempotency_key)
          WHERE idempotency_key IS NOT NULL;
      END;
    `);

    await queryRunner.query(`
      ;WITH duplicate_pending AS (
        SELECT
          refund_id,
          ROW_NUMBER() OVER (
            PARTITION BY booking_id
            ORDER BY requested_at ASC, refund_id ASC
          ) AS rn
        FROM dbo.refunds
        WHERE refund_status = 'PENDING'
      )
      UPDATE r
      SET
        r.refund_status = 'FAILED',
        r.completed_at = COALESCE(r.completed_at, SYSDATETIME()),
        r.reason = COALESCE(
          NULLIF(r.reason, ''),
          N'Duplicate pending refund closed by concurrency migration'
        )
      FROM dbo.refunds AS r
      INNER JOIN duplicate_pending AS d
        ON d.refund_id = r.refund_id
      WHERE d.rn > 1;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.refunds')
          AND name = 'UX_refunds_one_pending_per_booking'
      )
      BEGIN
        CREATE UNIQUE INDEX UX_refunds_one_pending_per_booking
          ON dbo.refunds (booking_id)
          WHERE refund_status = 'PENDING';
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.refunds')
          AND name = 'UX_refunds_one_pending_per_booking'
      )
      BEGIN
        DROP INDEX UX_refunds_one_pending_per_booking ON dbo.refunds;
      END;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.booking_orders')
          AND name = 'UX_booking_orders_user_idempotency'
      )
      BEGIN
        DROP INDEX UX_booking_orders_user_idempotency
          ON dbo.booking_orders;
      END;
    `);
  }
}
