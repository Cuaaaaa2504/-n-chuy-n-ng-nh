from pathlib import Path

path = Path("San Ve Backend3/cinehunt-backend/src/app.module.ts")
text = path.read_text(encoding="utf-8")

if "migrationsTableName:" in text:
    print("Cấu hình migration đã tồn tại, không thêm lại.")
    raise SystemExit(0)

marker = "entities: [__dirname + '/**/*.entity{.ts,.js}'],"

replacement = """entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: false,"""

if marker not in text:
    raise SystemExit("Không tìm thấy cấu hình entities trong app.module.ts")

path.write_text(text.replace(marker, replacement, 1), encoding="utf-8")
print("Đã thêm cấu hình TypeORM migration.")
