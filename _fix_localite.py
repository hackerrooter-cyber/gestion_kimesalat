from pathlib import Path
path = Path('app.js')
lines = path.read_text().splitlines()
lines[1439] = "    addLog(\"Localite mise a jour.\");"
lines[1440] = "    alert(\"Localite enregistree.\");"
lines.insert(1441, "    if(localiteForm) localiteForm.reset();")
path.write_text("\n".join(lines) + "\n")
