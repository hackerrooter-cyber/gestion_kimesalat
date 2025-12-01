from pathlib import Path
lines=Path('app.js').read_text().splitlines()
for i in range(1419,1452):
    print(f"{i+1}: {lines[i]!r}")
