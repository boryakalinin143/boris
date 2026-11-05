#!/usr/bin/env python3
"""Собирает agents/index.html: вставляет тексты agents/<id>/PROMPT.md в hub.template.html."""
import json, pathlib
root = pathlib.Path(__file__).parent
ids = ["mentor","journal","lawyer","chef","chashechki","doctor","lyudmila","travel","suroast","vadim","translator"]
prompts = {i: (root / i / "PROMPT.md").read_text(encoding="utf-8") for i in ids}
tpl = (root / "hub.template.html").read_text(encoding="utf-8")
data = json.dumps(prompts, ensure_ascii=False).replace("</", "<\\/")
out = tpl.replace("/*__PROMPTS__*/{}", data, 1)
(root / "index.html").write_text(out, encoding="utf-8")
print("agents/index.html", len(out), "bytes")
