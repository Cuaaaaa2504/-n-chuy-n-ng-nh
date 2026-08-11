import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenBookingLifecycleConcurrency1786423740000
  implements MigrationInterface
{
  name = 'HardenBookingLifecycleConcurrency1786423740000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER PROCEDURE dbo.sp_release_expired_holds
      AS
      BEGIN
        SET NOCOUNT ON;
        SET XACT_ABORT ON;
        SET DEADLOCK_PRIORITY LOW;

        DECLARE @LockResult INT;
        BEGIN TRANSACTION;

        EXEC @LockResult = sys.sp_getapplock
          @Resource = N'CineHunt.ReleaseExpiredHolds',
          @LockMode = 'Exclusive',
          @LockOwner = 'Transaction',
          @LockTimeout = 0;

        IF @LockResult < 0
        BEGIN
          ROLLBACK TRANSACTION;
          RETURN;
        END;

        UPDATE ss
        SET
          ss.status = 'AVAILABLE',
          ss.held_by_user_id = NULL,
          ss.hold_expires_at = NULL
        FROM dbo.showtime_seats AS ss WITH (UPDLOCK, ROWLOCK)
        INNER JOIN dbo.seat_holds AS h WITH (UPDLOCK, ROWLOCK)
          ON h.showtime_seat_id = ss.showtime_seat_id
        WHERE ss.status = 'HELD'
          AND ss.hold_expires_at IS NOT NULL
          AND ss.hold_expires_at <= SYSDATETIME()
          AND h.status = 'ACTIVE'
          AND h.expires_at <= SYSDATETIME()
          AND ss.held_by_user_id = h.user_id;

        UPDATE h WITH (UPDLOCK, ROWLOCK)
        SET
          h.status = 'EXPIRED',
          h.released_at = SYSDATETIME()
        FROM dbo.seat_holds AS h
        WHERE h.status = 'ACTIVE'
          AND h.expires_at <= SYSDATETIME();

        COMMIT TRANSACTION;
      END;
    `);

    await queryRunner.query(`
      ;WITH ranked_pending AS (
        SELECT
          payment_id,
          ROW_NUMBER() OVER (
            PARTITION BY booking_id
            ORDER BY created_at DESC, payment_id DESC
          ) AS rn
        FROM dbo.payments
        WHERE payment_status = 'PENDING'
      )
      UPDATE p
      SET
        p.payment_status = 'FAILED',
        p.failed_reason = COALESCE(
          NULLIF(p.failed_reason, ''),
          'Superseded duplicate pending payment during concurrency migration'
        )
      FROM dbo.payments AS p
      INNER JOIN ranked_pending AS r
        ON r.payment_id = p.payment_id
      WHERE r.rn > 1;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.payments')
          AND name = 'UX_payments_one_pending_per_booking'
      )
      BEGIN
        CREATE UNIQUE INDEX UX_payments_one_pending_per_booking
          ON dbo.payments (booking_id)
          WHERE payment_status = 'PENDING';
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.payments')
          AND name = 'UX_payments_one_pending_per_booking'
      )
      BEGIN
        DROP INDEX UX_payments_one_pending_per_booking ON dbo.payments;
      END;
    `);

    // Khôi phục đúng định nghĩa procedure của migration liền trước.
    await queryRunner.query(`
      CREATE OR ALTER PROCEDURE dbo.sp_release_expired_holds
      AS
      BEGIN
        SET NOCOUNT ON;
        SET XACT_ABORT ON;
        SET DEADLOCK_PRIORITY LOW;

        DECLARE @LockResult INT;
        BEGIN TRANSACTION;

        EXEC @LockResult = sys.sp_getapplock
          @Resource = N'CineHunt.ReleaseExpiredHolds',
          @LockMode = 'Exclusive',
          @LockOwner = 'Transaction',
          @LockTimeout = 0;

        IF @LockResult < 0
        BEGIN
          ROLLBACK TRANSACTION;
          RETURN;
        END;

        UPDATE ss WITH (UPDLOCK, READPAST, ROWLOCK)
        SET
          ss.status = 'AVAILABLE',
          ss.held_by_user_id = NULL,
          ss.hold_expires_at = NULL
        FROM dbo.showtime_seats AS ss
        WHERE ss.status = 'HELD'
          AND ss.hold_expires_at IS NOT NULL
          AND ss.hold_expires_at <= SYSDATETIME();

        UPDATE h WITH (UPDLOCK, READPAST, ROWLOCK)
        SET
          h.status = 'EXPIRED',
          h.released_at = SYSDATETIME()
        FROM dbo.seat_holds AS h
        WHERE h.status = 'ACTIVE'
          AND h.expires_at <= SYSDATETIME();

        COMMIT TRANSACTION;
      END;
    `);
  }
}
