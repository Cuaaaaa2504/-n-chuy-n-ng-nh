# Tách code P3, P6, P12, P13, P18, P25

- `P3/`: user stories, không có source code.
- `P6/`: API `.http` và JSON mẫu.
- `P12/`: Auth/User bản P12.
- `P13/`: Movie API bản P13.
- `P18/`: Auth/User bản P18.
- `P25/`: Movie API bản P25.
- `P12_P13_APP_COMMON/`: app module/main/env chung.

Đã tách riêng từng P để tránh trùng file `src/...`.

## Run (monorepo)

Start all apps together from the repo root:

```bash
npm run start:all
```

Default ports used by each app (unless `PORT` is provided):

- `P12`: 3000
- `P13`: 3001
- `P18`: 3002
- `P25`: 3003

Environment hints:

- To force SQLite fallback set `DB_TYPE=sqlite` (default).
- To enable DB-specific connections set `DB_TYPE=mysql|mssql` and provide `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` as needed.

Notes:

- For local quick runs the apps now use `better-sqlite3` and `synchronize: true` so schema will be created automatically. Remove/disable `synchronize` in production.

