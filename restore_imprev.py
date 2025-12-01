import re
from pathlib import Path
text = Path('index.html').read_text(encoding='utf-8')
imprev = '''              <div class="imprevus-toolbar">
                <button type="button" class="btn btn-ghost" id="btn-toggle-imprevus">
                  Dépenses imprévues
                </button>
                <div class="chip chip-accent" id="imprevus-total-pill">Total imprévus : 0 FCFA</div>
              </div>

              <div id="imprevus-panel" class="imprevus-panel hidden">
                <div class="imprevus-list" id="imprevus-list"></div>
              </div>
'''
text = re.sub(r'(<div class="hint">.*?</div>)', r'\1\n\n'+imprev, text, count=1, flags=re.S)
text = re.sub(r'(<option value="remboursement_credit">.*?</option>\s*)(<option value="depense_autre">)', r'\1<option value="depense_imprevue">Dépense imprévue</option>\n\n\n\n\n\n\n\n\n\n\2', text, count=1, flags=re.S)
text = re.sub(r'(<option value="paiement_materiau_comptant">.*?</option>\s*)(<option value="dpense_autre">)', r'\1<option value="dpense_imprevue">Dépense imprévue</option>\n\n\n\n\n\n\n\n\n\n\2', text, count=1, flags=re.S)
Path('index.html').write_text(text, encoding='utf-8')
