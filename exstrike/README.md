# Exstrike

Run this version from `exstrike/index.html`.

Recommended:

```powershell
cd c:\Users\shaun\Downloads\three-test\exstrike
python -m http.server 5510
```

Then open:

```text
http://127.0.0.1:5510/
```

This first refactor pass safely separates the browser shell, CSS, main game module, tests folder, and audio assets without changing gameplay. The module folders are present so the next pass can move systems out of `js/main.js` gradually without breaking the game.
