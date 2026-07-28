/* ============================================================================
   CINEHUNT DATABASE - PATCH V6.4 RECOMMENDATION
   Mục tiêu: tạo bảng cache gợi ý phim mà không sửa file database gốc V6.3.

   Thứ tự chạy:
   1. CineHunt_Database_V6_3_With_Sample_Data.sql
   2. CineHunt_Patch_V6_4_Recommendation.sql
   3. train.py / notebook để ghi dữ liệu gợi ý

   Script an toàn khi chạy lại nhiều lần (idempotent).
   ============================================================================ */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE CineHuntDB;
GO

/* Không tạo bảng nếu database gốc chưa được khởi tạo đúng. */
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
   OR OBJECT_ID(N'dbo.movies', N'U') IS NULL
BEGIN
    THROW 51000, N'Không tìm thấy dbo.users hoặc dbo.movies. Hãy chạy file V6.3 trước.', 1;
END;
GO

/* ============================================================================
   1. BẢNG CACHE GỢI Ý PHIM
   ============================================================================ */
IF OBJECT_ID(N'dbo.movie_recommendations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movie_recommendations (
        recommendation_id  BIGINT IDENTITY(1,1) NOT NULL,
        user_id             INT NOT NULL,
        movie_id            INT NOT NULL,
        score               FLOAT NOT NULL,
        rank_position       INT NOT NULL,
        model_version       VARCHAR(100) NULL,
        reason              NVARCHAR(500) NULL,
        created_at          DATETIME2(0) NOT NULL
            CONSTRAINT DF_movie_recommendations_created_at DEFAULT SYSDATETIME(),
        expires_at          DATETIME2(0) NOT NULL,

        CONSTRAINT PK_movie_recommendations
            PRIMARY KEY (recommendation_id),

        CONSTRAINT FK_movie_recommendations_user
            FOREIGN KEY (user_id)
            REFERENCES dbo.users(user_id)
            ON DELETE CASCADE,

        CONSTRAINT FK_movie_recommendations_movie
            FOREIGN KEY (movie_id)
            REFERENCES dbo.movies(movie_id)
            ON DELETE CASCADE,

        CONSTRAINT UQ_movie_recommendations_user_movie
            UNIQUE (user_id, movie_id),

        CONSTRAINT CK_movie_recommendations_score
            CHECK (score >= 0),

        CONSTRAINT CK_movie_recommendations_rank_position
            CHECK (rank_position > 0)
    );

    PRINT N'Đã tạo bảng dbo.movie_recommendations.';
END
ELSE
BEGIN
    PRINT N'Bảng dbo.movie_recommendations đã tồn tại, bỏ qua CREATE TABLE.';
END;
GO

/* ============================================================================
   2. INDEX ĐỌC CACHE THEO USER VÀ THỨ HẠNG
   Phục vụ truy vấn lọc user_id, sắp xếp rank_position và kiểm tra expires_at.
   ============================================================================ */
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.movie_recommendations')
      AND name = N'IX_movie_recommendations_user_rank'
)
BEGIN
    CREATE INDEX IX_movie_recommendations_user_rank
    ON dbo.movie_recommendations(user_id, rank_position)
    INCLUDE (movie_id, score, expires_at);

    PRINT N'Đã tạo index IX_movie_recommendations_user_rank.';
END
ELSE
BEGIN
    PRINT N'Index IX_movie_recommendations_user_rank đã tồn tại, bỏ qua.';
END;
GO

/* ============================================================================
   3. INDEX DỌN CACHE HẾT HẠN
   ============================================================================ */
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.movie_recommendations')
      AND name = N'IX_movie_recommendations_expires_at'
)
BEGIN
    CREATE INDEX IX_movie_recommendations_expires_at
    ON dbo.movie_recommendations(expires_at);

    PRINT N'Đã tạo index IX_movie_recommendations_expires_at.';
END
ELSE
BEGIN
    PRINT N'Index IX_movie_recommendations_expires_at đã tồn tại, bỏ qua.';
END;
GO

/* ============================================================================
   4. KIỂM TRA NHANH SAU KHI CHẠY PATCH
   Không chèn dữ liệu mẫu để tránh làm bẩn cache thật.
   ============================================================================ */
SELECT
    OBJECT_ID(N'dbo.movie_recommendations', N'U') AS movie_recommendations_object_id;

SELECT
    name,
    type_desc
FROM sys.objects
WHERE parent_object_id = OBJECT_ID(N'dbo.movie_recommendations')
  AND type IN ('F', 'C', 'UQ')
ORDER BY type_desc, name;

SELECT
    name,
    type_desc,
    is_unique
FROM sys.indexes
WHERE object_id = OBJECT_ID(N'dbo.movie_recommendations')
  AND name IS NOT NULL
ORDER BY index_id;
GO

PRINT N'CineHunt Patch V6.4 Recommendation đã chạy xong.';
GO

/* ============================================================================
   GỢI Ý GHI CACHE AN TOÀN THEO TỪNG USER

   BEGIN TRANSACTION;

   DELETE FROM dbo.movie_recommendations
   WHERE user_id = @user_id;

   -- INSERT danh sách gợi ý mới tại đây.

   COMMIT TRANSACTION;

   Không giữ transaction mở trong lúc model Python đang tính toán.
   ============================================================================ */
