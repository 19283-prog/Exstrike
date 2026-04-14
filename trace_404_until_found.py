from pathlib import Path
from playwright.sync_api import sync_playwright

url = Path('Game.HTML').resolve().as_uri()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    bad = []
    def on_response(resp):
      try:
        if resp.status >= 400:
          bad.append((resp.status, resp.url))
      except Exception:
        pass

    page.on('response', on_response)

    found = False
    for i in range(1, 121):
      try:
        page.goto(url, wait_until='commit', timeout=1500)
        page.wait_for_timeout(50)
      except Exception:
        try:
          page.evaluate('window.stop()')
        except Exception:
          pass
      if bad:
        print('run', i)
        for s,u in bad[:10]:
          print(s, u)
        found = True
        break

    if not found:
      print('no 4xx/5xx captured in 120 runs')

    browser.close()
