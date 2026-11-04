#!/bin/sh
# Собирает chef-os/app.html из исходников в src/ (страница публикуется как Artifact на claude.ai).
cd "$(dirname "$0")"
{ cat src/01_head.html; echo '<script>'; cat src/02_data.js src/03_core.js src/04_views.js src/05_actions.js src/06_init.js; echo '</script>'; } > app.html
