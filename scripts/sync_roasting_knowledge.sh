#!/usr/bin/env bash
# Синхронизация базы знаний по обжарке из проекта «Vadim» в roasting-knowledge/.
# Запуск: scripts/sync_roasting_knowledge.sh [папка_проекта] [папка_памяти]
# Копирует только текстовые знания, таблицы и графики кривых.
# PDF, zip и загрузки (uploads/) в git не кладём: список PDF пишется в SOURCES_PDF.md.
set -euo pipefail
SRC="${1:-/mnt/project-files}"
MEM="${2:-/tmp/claude/memory/team/silo}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DST="$REPO/roasting-knowledge"

mkdir -p "$DST"
# Копия папки без PDF, zip, скрытых файлов и чужих персональных данных (резюме).
copy_tree() {
  local from="$1" to="$2"
  rm -rf "$to"; mkdir -p "$to"
  (cd "$from" && find . -type f ! -name '*.pdf' ! -name '*.zip' ! -name 'Rezyume_*' ! -path '*/.*' -print0) |
  while IFS= read -r -d '' f; do
    mkdir -p "$to/$(dirname "$f")"; cp "$from/$f" "$to/$f"
  done
}

for d in coffee-library coffee-db coffee-miners; do
  copy_tree "$SRC/$d" "$DST/$d"
done
cp "$SRC/Baza_znaniy.md" "$DST/Baza_znaniy.md"

# Память проекта (короткие правила и выводы ассистента)
rm -rf "$DST/memory"; mkdir -p "$DST/memory"; cp "$MEM"/*.md "$DST/memory/"

# Список PDF-источников, которые остались только в проекте
{
  echo "# PDF-источники (не лежат в git)"
  echo
  echo "Оригиналы PDF хранятся в проекте Claude «Vadim» (coffee-library/materials/)."
  echo "Рядом с каждым PDF в этой папке лежит конспект .md с тем же именем: ассистенту достаточно конспекта."
  echo
  echo "| PDF | Размер | Конспект |"
  echo "|---|---|---|"
  find "$SRC/coffee-library" "$SRC/coffee-db" "$SRC/coffee-miners" -name '*.pdf' -not -name 'Rezyume_*' | sort | while read -r f; do
    rel="${f#$SRC/}"
    size=$(du -h "$f" | cut -f1)
    md="${rel%.pdf}.md"
    if [ -f "$SRC/$md" ]; then link="[$(basename "$md")]($md)"; else link="нет"; fi
    echo "| $rel | $size | $link |"
  done
} > "$DST/SOURCES_PDF.md"

echo "Готово: $DST"
