from pathlib import Path
import json

path = Path("San Ve Backend3/cinehunt-backend/tsconfig.json")
data = json.loads(path.read_text(encoding="utf-8"))

data["include"] = ["src/**/*"]
data["exclude"] = [
    "node_modules",
    "dist",
    "uploads",
    "typeorm.config.ts",
]

path.write_text(
    json.dumps(data, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)

print("Đã giới hạn TypeScript build trong thư mục src.")
