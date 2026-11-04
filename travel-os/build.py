"""Собирает офлайн-файл Travel OS: шаблон app.html + база поездок + оригиналы билетов.

python3 build.py --tickets <папка с билетами> --trips <trips.json> --ics <напоминания.ics> --out dist/TravelOS.html

Оригиналы встраиваются как есть (base64), ничего не перерисовывается.
Личные данные (билеты, брони) в репозиторий не коммитятся: см. .gitignore.
"""
import argparse, base64, json, os

MIME = {'.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.md': 'text/markdown;charset=utf-8', '.ics': 'text/calendar;charset=utf-8'}

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--tickets', required=True)
    p.add_argument('--trips', required=True)
    p.add_argument('--ics', required=True)
    p.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'dist', 'TravelOS.html'))
    a = p.parse_args()
    docs = {}
    for f in sorted(os.listdir(a.tickets)):
        ext = os.path.splitext(f)[1].lower()
        if ext in MIME:
            with open(os.path.join(a.tickets, f), 'rb') as fh:
                docs[f] = {'mime': MIME[ext], 'b64': base64.b64encode(fh.read()).decode()}
    with open(a.trips, encoding='utf-8') as fh:
        data = json.load(fh)
    with open(a.ics, encoding='utf-8') as fh:
        ics = fh.read()
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.html'), encoding='utf-8') as fh:
        html = fh.read()
    html = (html.replace('__DATA__', json.dumps(data, ensure_ascii=False))
                .replace('__DOCS__', json.dumps(docs))
                .replace('__ICS__', json.dumps(ics, ensure_ascii=False)))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as fh:
        fh.write(html)
    print(f'{a.out}: {len(html)//1024} KB, документов: {len(docs)}')

if __name__ == '__main__':
    main()
