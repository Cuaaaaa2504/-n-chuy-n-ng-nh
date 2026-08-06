import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixExpiredSeatHoldConsistency1786016820000
  implements MigrationInterface
{
  name = 'FixExpiredSeatHoldConsistency1786016820000';

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

  public async down(queryRunner: QueryRunner): Promise<void> {
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

        UPDATE bo WITH (UPDLOCK, READPAST, ROWLOCK)
        SET
          bo.status = 'EXPIRED',
          bo.updated_at = SYSDATETIME()
        FROM dbo.booking_orders AS bo
        WHERE bo.status = 'PENDING_PAYMENT'
          AND bo.expires_at IS NOT NULL
          AND bo.expires_at <= SYSDATETIME();

        UPDATE bd WITH (UPDLOCK, READPAST, ROWLOCK)
        SET bd.status = 'EXPIRED'
        FROM dbo.booking_details AS bd
        INNER JOIN dbo.booking_orders AS bo WITH (READPAST)
          ON bo.booking_id = bd.booking_id
        WHERE bo.status = 'EXPIRED'
          AND bd.status = 'ACTIVE';

        COMMIT TRANSACTION;
      END;
    `);
  }
}
