from pathlib import Path
from collections import Counter
from playwright.sync_api import sync_playwright

ITERATIONS = 20
url = Path('Game.HTML').resolve().as_uri()
stats = Counter()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    for i in range(ITERATIONS):
        page_errors=[]; console_errors=[]
        def pe(e): page_errors.append(str(e))
        def ce(m):
            if m.type=='error': console_errors.append(m.text)
        page.on('pageerror', pe)
        page.on('console', ce)
        try:
            page.goto(url, wait_until='commit', timeout=2000)
            page.wait_for_timeout(20)
            stats['ok'] += 1
        except Exception as e:
            stats['fail'] += 1
            stats[f'fail::{repr(e)[:100]}'] += 1
        finally:
            page.remove_listener('pageerror', pe)
            page.remove_listener('console', ce)
        for e in page_errors:
            stats[f'pageerror::{e[:100]}'] += 1
        for e in console_errors:
            stats[f'console::{e[:100]}'] += 1
    page.close(); browser.close()

for k,v in stats.items():
    print(f'{k}={v}')
