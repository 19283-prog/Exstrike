from pathlib import Path
from collections import Counter
from playwright.sync_api import sync_playwright

url = Path('Game.HTML').resolve().as_uri()
errs = Counter()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    def on_response(resp):
        try:
            s = resp.status
            if s >= 400:
                errs[f'{s} {resp.url[:200]}'] += 1
        except Exception:
            pass

    page.on('response', on_response)

    for _ in range(10):
        try:
            page.goto(url, wait_until='commit', timeout=2000)
            page.wait_for_timeout(40)
        except Exception:
            try:
                page.evaluate('window.stop()')
            except Exception:
                pass

    browser.close()

for k,v in errs.items():
    print(v, k)
