import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenMaintenanceTimeouts1786435500000
  implements MigrationInterface
{
  name = 'HardenMaintenanceTimeouts1786435500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER PROCEDURE dbo.sp_release_expired_holds
      AS
      BEGIN
        SET NOCOUNT ON;
        SET XACT_ABORT ON;
        SET DEADLOCK_PRIORITY LOW;
        SET LOCK_TIMEOUT 2000;

        DECLARE @LockResult INT;
        DECLARE @ReleasedSeats INT = 0;
        DECLARE @ExpiredHolds INT = 0;

        BEGIN TRY
          BEGIN TRANSACTION;

          EXEC @LockResult = sys.sp_getapplock
            @Resource = N'CineHunt.LifecycleMaintenance',
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 0;

          IF @LockResult < 0
          BEGIN
            ROLLBACK TRANSACTION;
            SET LOCK_TIMEOUT -1;

            SELECT
              CAST(1 AS BIT) AS skipped,
              CAST(N'maintenance-busy' AS NVARCHAR(50)) AS reason,
              CAST(0 AS INT) AS releasedSeats,
              CAST(0 AS INT) AS expiredHolds;
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

          SET @ReleasedSeats = @@ROWCOUNT;

          UPDATE h WITH (UPDLOCK, ROWLOCK)
          SET
            h.status = 'EXPIRED',
            h.released_at = SYSDATETIME()
          FROM dbo.seat_holds AS h
          WHERE h.status = 'ACTIVE'
            AND h.expires_at <= SYSDATETIME();

          SET @ExpiredHolds = @@ROWCOUNT;

          COMMIT TRANSACTION;
          SET LOCK_TIMEOUT -1;

          SELECT
            CAST(0 AS BIT) AS skipped,
            CAST(NULL AS NVARCHAR(50)) AS reason,
            @ReleasedSeats AS releasedSeats,
            @ExpiredHolds AS expiredHolds;
        END TRY
        BEGIN CATCH
          DECLARE @ErrorNumber INT = ERROR_NUMBER();

          IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

          SET LOCK_TIMEOUT -1;

          IF @ErrorNumber = 1205 OR @ErrorNumber = 1222
          BEGIN
            SELECT
              CAST(1 AS BIT) AS skipped,
              CAST(
                CASE
                  WHEN @ErrorNumber = 1205 THEN N'deadlock'
                  ELSE N'lock-timeout'
                END
                AS NVARCHAR(50)
              ) AS reason,
              CAST(0 AS INT) AS releasedSeats,
              CAST(0 AS INT) AS expiredHolds;
            RETURN;
          END;

          THROW;
        END CATCH;
      END;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.booking_orders')
          AND name = 'IX_booking_orders_pending_expiry'
      )
      BEGIN
        CREATE INDEX IX_booking_orders_pending_expiry
          ON dbo.booking_orders (expires_at, showtime_id, booking_id)
          INCLUDE (user_id)
          WHERE status = 'PENDING_PAYMENT';
      END;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.payments')
          AND name = 'IX_payments_booking_latest'
      )
      BEGIN
        CREATE INDEX IX_payments_booking_latest
          ON dbo.payments (booking_id, created_at DESC, payment_id DESC)
          INCLUDE (payment_method, payment_status);
      END;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.seat_holds')
          AND name = 'IX_seat_holds_active_expiry'
      )
      BEGIN
        CREATE INDEX IX_seat_holds_active_expiry
          ON dbo.seat_holds (expires_at, showtime_seat_id)
          INCLUDE (user_id)
          WHERE status = 'ACTIVE';
      END;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.showtime_seats')
          AND name = 'IX_showtime_seats_held_expiry'
      )
      BEGIN
        CREATE INDEX IX_showtime_seats_held_expiry
          ON dbo.showtime_seats (hold_expires_at, showtime_seat_id)
          INCLUDE (held_by_user_id)
          WHERE status = 'HELD';
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.showtime_seats')
          AND name = 'IX_showtime_seats_held_expiry'
      )
      DROP INDEX IX_showtime_seats_held_expiry ON dbo.showtime_seats;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.seat_holds')
          AND name = 'IX_seat_holds_active_expiry'
      )
      DROP INDEX IX_seat_holds_active_expiry ON dbo.seat_holds;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.payments')
          AND name = 'IX_payments_booking_latest'
      )
      DROP INDEX IX_payments_booking_latest ON dbo.payments;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.booking_orders')
          AND name = 'IX_booking_orders_pending_expiry'
      )
      DROP INDEX IX_booking_orders_pending_expiry ON dbo.booking_orders;
    `);

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
  }
}
