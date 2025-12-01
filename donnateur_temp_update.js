const fs = require('fs');
let s = fs.readFileSync('app.js','utf8');
const needle = "alert('Taux mis";
const pos = s.indexOf(needle);
if(pos === -1) throw new Error('marker not found');
const brace = s.indexOf('}', pos);
if(brace === -1) throw new Error('brace not found');
const insert = 
    async function fetchTauxWise(){
      var url = 'https://wise.com/fr/currency-converter/sar-to-xof-rate';
      try{
        var resp = await fetch(url, { mode: 'cors' });
        if(!resp.ok) throw new Error('HTTP ' + resp.status);
        var html = await resp.text();
        var rateStr = null;
        var m1 = html.match(/data-qa="exchange-rate"[^>]*>([0-9.,\s]+)</i);
        if(m1) rateStr = m1[1];
        if(!rateStr){
          var m2 = html.match(/"value"\s*:\s*"([0-9.,]+)"/);
          if(m2) rateStr = m2[1];
        }
        if(!rateStr) throw new Error('Taux introuvable sur la page Wise');
        var taux = Number(rateStr.replace(/\s+/g,'').replace(',','.'));
        if(!isFinite(taux) || taux <= 0) throw new Error('Taux invalide : ' + rateStr);
        setTauxSAR_XOF(taux);
        storage.set(STORAGE_TAUX_LAST, todayAsInput());
        if(typeof tauxSARInput !== 'undefined' && tauxSARInput) tauxSARInput.value = taux;
        renderTranches();
        updateDisplay();
        updateReste();
        alert('Taux SAR->XOF mis a jour (Wise) : ' + taux);
      }catch(err){
        console.error('Erreur mise a jour taux Wise', err);
        alert('Impossible de recuperer le taux (CORS/acces).');
      }
    }
;
s = s.slice(0, brace+1) + insert + s.slice(brace+1);
fs.writeFileSync('app.js', s);
