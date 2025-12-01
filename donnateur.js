(function(){
  'use strict';

  var STORAGE_KEY = 'donorBudget_value';
  var STORAGE_CUR = 'donorBudget_currency';
  var STORAGE_SAR_XOF = 'taux_SAR_XOF';
  var STORAGE_USD_SAR = 'taux_USD_SAR';
  var STORAGE_TRANCHES = 'donorTranches';
  var STORAGE_DISPLAY_CUR = 'donorDisplay_currency';
  var STORAGE_BUDGETS = 'donorBudgets';
  var STORAGE_BUDGET_NAME = 'donorBudget_name';
  var STORAGE_NONUSABLE = 'donorBudget_nonusable';
  var STORAGE_NONUSABLE_CUR = 'donorBudget_nonusable_cur';
  var ALLOWED_DEVISES = ['SAR','XOF'];
  var SHARED_DONOR_KEY = 'shared_donor_budget_payload';

  var COUNTRY_CITIES = {
    "Benin": ["Cotonou","Porto-Novo","Parakou"],
    "Ghana": ["Accra","Kumasi","Tamale"],
    "Togo": ["Lome","Kpalime","Sokode","Bafilo","Ketao","Kara"]
  };

  var COUNTRIES = Object.keys(COUNTRY_CITIES).sort();

  var $ = function(selector){ return document.querySelector(selector); };
  function formatMoney(v){ return Number(v || 0).toLocaleString('fr-FR'); }

  var memoryStore = {};
  var storage = {
    get: function(key){
      try{ if(window.localStorage) return localStorage.getItem(key); }
      catch(err){}
      return memoryStore[key];
    },
    set: function(key,val){
      try{ if(window.localStorage) localStorage.setItem(key, val); }
      catch(err){}
      memoryStore[key] = String(val);
      scheduleSharedSync();
    },
    remove: function(key){
      try{ if(window.localStorage) localStorage.removeItem(key); }
      catch(err){}
      delete memoryStore[key];
      scheduleSharedSync();
    }
  };

  function getTauxSAR_XOF(){ return Number(storage.get(STORAGE_SAR_XOF) || 157.5); }
  function getTauxUSD_SAR(){ return Number(storage.get(STORAGE_USD_SAR) || 4); }
  function setTauxSAR_XOF(v){ storage.set(STORAGE_SAR_XOF, v); scheduleSharedSync(); }
  function setTauxUSD_SAR(v){ storage.set(STORAGE_USD_SAR, v); scheduleSharedSync(); }

  function convert(amount, from, to){
    amount = Number(amount);
    var sarXof = getTauxSAR_XOF();
    var usdSar = getTauxUSD_SAR();
    var inXof;
    if(from === 'XOF') inXof = amount;
    else if(from === 'SAR') inXof = amount * sarXof;
    else if(from === 'USD') inXof = amount * usdSar * sarXof;
    else return 0;

    if(to === 'XOF') return inXof;
    if(to === 'SAR') return inXof / sarXof;
    if(to === 'USD') return inXof / (sarXof * usdSar);
    return 0;
  }

  function normalizeDevise(v){
    var upper = (v || '').toUpperCase();
    for(var i=0;i<ALLOWED_DEVISES.length;i++){
      if(ALLOWED_DEVISES[i] === upper) return upper;
    }
    return 'SAR';
  }

  function isValidDateInput(value){
    if(!value) return false;
    var parts = value.split('-');
    if(parts.length !== 3) return false;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    var date = new Date(y, (m || 1) - 1, d || 1);
    if(date.getFullYear() !== y || date.getMonth() !== (m-1) || date.getDate() !== d) return false;
    var today = new Date();
    today.setHours(0,0,0,0);
    return date.getTime() <= today.getTime();
  }

  function todayAsInput(){ return new Date().toISOString().slice(0,10); }

  function applySharedPayload(payload){
    if(!payload || typeof payload !== 'object') return;
    if(typeof payload.amount !== 'undefined') storage.set(STORAGE_KEY, payload.amount);
    if(payload.currency) storage.set(STORAGE_CUR, payload.currency);
    if(payload.tauxSarXof) storage.set(STORAGE_SAR_XOF, payload.tauxSarXof);
    if(typeof payload.nonUsable !== 'undefined'){
      var nuCur = normalizeDevise(payload.currency || 'SAR');
      var nuSar = nuCur === 'SAR' ? payload.nonUsable : convert(payload.nonUsable, nuCur, 'SAR');
      storage.set(STORAGE_NONUSABLE, nuSar);
      storage.set(STORAGE_NONUSABLE_CUR, 'SAR');
    }
    if(Array.isArray(payload.budgets)) storage.set(STORAGE_BUDGETS, JSON.stringify(payload.budgets));
    if(Array.isArray(payload.tranches)) storage.set(STORAGE_TRANCHES, JSON.stringify(payload.tranches));
  }

  function loadTranches(){ try { return JSON.parse(storage.get(STORAGE_TRANCHES) || '[]'); } catch(e){ return []; } }
  function saveTranches(arr){
    storage.set(STORAGE_TRANCHES, JSON.stringify(arr));
    // Miroir dans le budget courant pour éviter toute perte lors des changements de budget
    try{
      var name = getBudgetName();
      if(name){
        var budgets = loadBudgets();
        var changed = false;
        for(var i=0;i<budgets.length;i++){
          if(budgets[i] && budgets[i].title === name){
            budgets[i].tranches = arr;
            changed = true;
          }
        }
        if(changed) saveBudgets(budgets);
      }
    }catch(e){}
    scheduleSharedSync();
  }
  function loadBudgets(){ try { return JSON.parse(storage.get(STORAGE_BUDGETS) || '[]'); } catch(e){ return []; } }
  function saveBudgets(arr){ storage.set(STORAGE_BUDGETS, JSON.stringify(arr)); scheduleSharedSync(); }
  function getBudgetName(){ return storage.get(STORAGE_BUDGET_NAME) || ''; }
  function getNonUsable(){ return Number(storage.get(STORAGE_NONUSABLE) || 0); }
  function getNonUsableInfo(){
    var val = Number(storage.get(STORAGE_NONUSABLE) || 0);
    var cur = normalizeDevise(storage.get(STORAGE_NONUSABLE_CUR) || 'SAR');
    return { value: val, currency: cur };
  }
  function setNonUsable(v, currency){
    var cur = normalizeDevise(currency || 'SAR');
    var val = Math.max(0, Number(v) || 0);
    // On stocke toujours en SAR
    var valSar = cur === 'SAR' ? val : convert(val, cur, 'SAR');
    storage.set(STORAGE_NONUSABLE, valSar);
    storage.set(STORAGE_NONUSABLE_CUR, 'SAR');
    scheduleSharedSync();
  }

  function persistNonUsableToCurrentBudget(valSar){
    var name = getBudgetName();
    if(!name) return;
    var budgets = loadBudgets();
    var updated = false;
    for(var i=0;i<budgets.length;i++){
      if(budgets[i] && budgets[i].title === name){
        budgets[i].nonUsable = valSar;
        updated = true;
      }
    }
    if(updated) saveBudgets(budgets);
  }

  function buildSharedPayload(){
    var amount = Number(storage.get(STORAGE_KEY) || 0);
    var currency = storage.get(STORAGE_CUR) || 'SAR';
    var payload = {
      amount: amount,
      currency: currency,
      tauxSarXof: getTauxSAR_XOF(),
      amountXof: convert(amount, currency, 'XOF'),
      nonUsable: getNonUsable(),
      budgets: loadBudgets(),
      tranches: loadTranches(),
      updatedAt: Date.now()
    };
    try{ localStorage.setItem(SHARED_DONOR_KEY, JSON.stringify(payload)); }catch(err){}
  }

  function scheduleSharedSync(){
    if(scheduleSharedSync._pending) return;
    scheduleSharedSync._pending = true;
    requestAnimationFrame(function(){
      scheduleSharedSync._pending = false;
      buildSharedPayload();
    });
  }

  function askBudget(){
    var deviseSelectEl = document.getElementById('deviseSelect');
    var baseCur = deviseSelectEl ? deviseSelectEl.value : 'SAR';
    var def = storage.get(STORAGE_KEY) || '';
    var saisie = prompt('Entrez votre budget en ' + baseCur + ' :', def);
    if(saisie === null) return null;
    saisie = saisie.replace(/\s+/g,'').replace(',','.');
    if(isNaN(Number(saisie))){
      alert('Valeur non valide');
      return askBudget();
    }
    storage.set(STORAGE_KEY, Number(saisie));
    storage.set(STORAGE_CUR, baseCur);

    var title = getBudgetName();
    if(title && title.trim()){
      var budgets = loadBudgets();
      budgets.push({
        title: title.trim(),
        montant: Number(saisie),
        devise: baseCur,
        date: todayAsInput(),
        tranches: loadTranches(),
        nonUsable: getNonUsable()
      });
      saveBudgets(budgets.slice(-10));
    }
    return Number(saisie);
  }

  function updateDisplay(){
    var badgeEl = document.getElementById('displayBadge');
    var deviseSelectEl = document.getElementById('deviseSelect');
    var v = storage.get(STORAGE_KEY);
    var c = storage.get(STORAGE_CUR);
    var displayCur = deviseSelectEl ? deviseSelectEl.value : 'SAR';

    if(!v || !c){
      var r = askBudget();
      if(r !== null) updateDisplay();
      return;
    }

    var converted = convert(Number(v), c, displayCur);
    if(badgeEl){
      badgeEl.textContent = formatMoney(converted) + ' ' + displayCur;
      badgeEl.style.display = 'inline-flex';
    }
  }

  function init(){
    try{
      var btn = $('#btnBudget');
      var badge = $('#displayBadge');
      var deviseSelect = $('#deviseSelect');
      var changer = $('#changer');
      var reinit = $('#reinitialiser');
      var tauxSARInput = $('#tauxXOF_SAR');
      var saveTauxBtn = $('#saveTaux');
      var btnNewBudget = $('#btnNewBudget');
      var budgetSelect = $('#budgetSelect');
      var budgetAction = $('#budgetAction');
      var addTrancheBtn = $('#addTranche');
      var nonUsableInput = $('#nonUsableInput');
      var saveNonUsableBtn = $('#saveNonUsable');
      var availableBadge = $('#availableBadge');
      var tranchesTable = $('#tranchesTable');
      var totalTranchesStat = $('#totalTranchesStat');
      var totalTranchesFoot = $('#totalTranchesFoot');
      var dialog = $('#trancheDialog');
      var closeDialogBtn = $('#closeDialog');
      var cancelDialogBtn = $('#cancelDialog');
      var trancheForm = $('#trancheForm');
      var dateInput = $('#dateInput');
      var montantInput = $('#montantInput');
      var deviseInput = $('#deviseInput');
      var projetInput = $('#projetInput');
      var paysInput = $('#paysInput');
      var villeInput = $('#villeInput');
      var localisationInput = $('#localisationInput');
      var paysOptions = document.getElementById('paysOptions');
      var villeOptions = document.getElementById('villeOptions');
      window.addEventListener('storage', function(e){
        if(e.key !== SHARED_DONOR_KEY || !e.newValue) return;
        try{
          var payload = JSON.parse(e.newValue);
          applySharedPayload(payload);
          updateDisplay();
          refreshBudgetOptions();
          renderTranches();
          updateReste();
        }catch(err){}
      });

      if(!btn || !badge || !deviseSelect){
        console.warn('Elements essentiels manquants - verifie le HTML.');
        return;
      }

      var savedDisplayCur = normalizeDevise(storage.get(STORAGE_DISPLAY_CUR) || 'SAR');
      deviseSelect.value = savedDisplayCur;
      if(tauxSARInput) tauxSARInput.value = getTauxSAR_XOF();
      if(nonUsableInput) nonUsableInput.value = getNonUsable();

      var editingIndex = null;

      function applyDateGuard(){
        if(dateInput) dateInput.max = todayAsInput();
      }

      function populateCountryOptions(selected){
        if(!paysOptions) return;
        paysOptions.innerHTML = '';
        var seen = {};
        for(var i=0;i<COUNTRIES.length;i++){
          var c = COUNTRIES[i];
          seen[c] = true;
          var opt = document.createElement('option');
          opt.value = c;
          paysOptions.appendChild(opt);
        }
        if(selected && !seen[selected]){
          var custom = document.createElement('option');
          custom.value = selected;
          paysOptions.appendChild(custom);
        }
      }

      function populateCityOptions(country, selected){
        if(!villeOptions) return;
        villeOptions.innerHTML = '';
        var cities = COUNTRY_CITIES[country] || [];
        var seen = {};
        for(var i=0;i<cities.length;i++){
          var city = cities[i];
          seen[city] = true;
          var opt = document.createElement('option');
          opt.value = city;
          villeOptions.appendChild(opt);
        }
        if(selected && !seen[selected]){
          var custom = document.createElement('option');
          custom.value = selected;
          villeOptions.appendChild(custom);
        }
      }

      if(paysInput){
        paysInput.addEventListener('input', function(){
          var country = (paysInput.value || '').trim();
          populateCityOptions(country, '');
          if(villeInput) villeInput.value = '';
        });
      }

      function renderTranches(){
        if(!tranchesTable) return;
        var data = loadTranches();
        tranchesTable.innerHTML = '';
        var total = 0;
        var displayCur = deviseSelect.value;
        for(var i=0;i<data.length;i++){
          var t = data[i];
          var rowDevise = normalizeDevise(t.devise || (storage.get(STORAGE_CUR) || displayCur));
          total += convert(t.montant, rowDevise, displayCur);
          var tr = document.createElement('tr');
          var row = '';
          row += '<td>'+(i+1)+'</td>';
          row += '<td>'+(t.pays || 'Pays non precise')+'</td>';
          row += '<td>'+(t.ville || 'Ville non precisee')+'</td>';
          row += '<td>'+(t.projet || 'Projet non precise')+'</td>';
          row += '<td>'+(t.date || '')+'</td>';
          row += '<td>'+formatMoney(t.montant)+' '+rowDevise+'</td>';
          row += '<td>'+formatMoney(convert(t.montant, rowDevise, 'XOF'))+' XOF</td>';
          row += '<td>'+(t.localisation || '-')+'</td>';
          row += '<td>1 SAR='+(t.tauxSAR_XOF || getTauxSAR_XOF())+' XOF</td>';
          row += '<td class="table-actions">';
          row += '<button onclick="editTranche('+i+')" aria-label="Modifier la tranche '+(i+1)+'">Modifier</button>';
          row += '<button class="delete" onclick="deleteTranche('+i+')" aria-label="Supprimer la tranche '+(i+1)+'">Supprimer</button>';
          row += '</td>';
          tr.innerHTML = row;
          tranchesTable.appendChild(tr);
        }
        if(totalTranchesStat) totalTranchesStat.textContent = formatMoney(total) + ' ' + displayCur;
        if(totalTranchesFoot) totalTranchesFoot.textContent = formatMoney(total) + ' ' + displayCur;
      }

      function openDialog(tranche, index){
        if(!dialog) return;
        dialog.hidden = false;
        dialog.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        editingIndex = (typeof index === 'number') ? index : null;
        $('#dialogTitle').textContent = editingIndex === null ? 'Ajouter une tranche' : 'Modifier la tranche';
        dateInput.value = tranche && tranche.date ? tranche.date : todayAsInput();
        montantInput.value = (tranche && typeof tranche.montant !== 'undefined') ? tranche.montant : '';
        deviseInput.value = normalizeDevise(tranche && tranche.devise ? tranche.devise : deviseSelect.value);
        projetInput.value = tranche && tranche.projet ? tranche.projet : '';
        var paysVal = tranche && tranche.pays ? tranche.pays : '';
        populateCountryOptions(paysVal);
        populateCityOptions(paysVal || '', tranche && tranche.ville ? tranche.ville : '');
        if(paysInput) paysInput.value = paysVal || '';
        if(villeInput) villeInput.value = tranche && tranche.ville ? tranche.ville : '';
        localisationInput.value = tranche && tranche.localisation ? tranche.localisation : '';
        applyDateGuard();
      }

      function closeDialog(){
        if(!dialog) return;
        dialog.hidden = true;
        dialog.classList.remove('is-open');
        document.body.style.overflow = '';
        trancheForm.reset();
        editingIndex = null;
        if(addTrancheBtn) addTrancheBtn.focus();
      }

      function addTrancheFlow(){
        var current = loadTranches();
        if(current.length >= 5){
          alert('Maximum 5 tranches !');
          return;
        }
        openDialog();
      }

      function refreshBudgetOptions(){
        if(!budgetSelect) return;
        var budgets = loadBudgets().filter(function(b){ return b && b.title && b.title.trim(); });
        var currentName = getBudgetName();
        budgetSelect.innerHTML = '<option value="">Budgets enregistres</option>';
        budgets.forEach(function(b, idx){
          var opt = document.createElement('option');
          opt.value = idx;
          opt.textContent = b.title.trim();
          if(currentName && b.title && b.title.trim() === currentName) opt.selected = true;
          budgetSelect.appendChild(opt);
        });
      }

      function updateReste(){
        var budget = Number(storage.get(STORAGE_KEY));
        var budgetCur = normalizeDevise(storage.get(STORAGE_CUR) || 'SAR'); // devise de saisie du budget
        var nonInfo = getNonUsableInfo();
        var nonUsableSar = isFinite(nonInfo.value) ? nonInfo.value : 0;
        var nonCur = nonInfo.currency;
        if(!isFinite(budget)) budget = 0;

        // Migration : on force la part non utilisable à rester en SAR
        if(nonCur !== 'SAR'){
          nonUsableSar = nonCur && nonCur !== 'SAR' ? convert(nonUsableSar, nonCur, 'SAR') : nonUsableSar;
          setNonUsable(nonUsableSar, 'SAR');
          if(nonUsableInput) nonUsableInput.value = nonUsableSar;
        }

        // Montants en devise de saisie : on convertit la part non utilisable (SAR) vers la devise du budget
        var nonUsableBudgetCur = convert(nonUsableSar, 'SAR', budgetCur);
        var budgetNet = Math.max(0, budget - nonUsableBudgetCur); // attendu par l'utilisateur

        // Total des tranches rebasculé dans la devise du budget
        var data = loadTranches();
        var totalBudgetCur = 0;
        for(var i=0;i<data.length;i++){
          var t = data[i];
          var trancheDevise = normalizeDevise(t.devise || budgetCur);
          totalBudgetCur += convert(t.montant, trancheDevise, budgetCur);
        }

        var resteBudgetCur = budgetNet - totalBudgetCur;
        var displayCur = normalizeDevise(deviseSelect.value || budgetCur);
        var resteAffiche = convert(resteBudgetCur, budgetCur, displayCur);
        var dispoAffiche = convert(budgetNet, budgetCur, displayCur); // budget déclaré - part non utilisable

        var el = document.getElementById('resteBudget');
        if(el) el.textContent = formatMoney(resteAffiche) + ' ' + displayCur;
        // Disponible = budget déclaré - part non utilisable (sans déduire les tranches)
        if(availableBadge) availableBadge.textContent = formatMoney(dispoAffiche) + ' ' + displayCur;
      }

      refreshBudgetOptions();

      if(budgetSelect){
        budgetSelect.addEventListener('change', function(){
          var idx = parseInt(budgetSelect.value, 10);
          if(isNaN(idx)) return;
          var budgets = loadBudgets().filter(function(b){ return b && b.title && b.title.trim(); });
          var selected = budgets[idx];
          if(!selected) return;
          storage.set(STORAGE_BUDGET_NAME, selected.title || '');
          storage.set(STORAGE_KEY, selected.montant);
          storage.set(STORAGE_CUR, selected.devise || 'SAR');
          setNonUsable(selected.nonUsable || 0, 'SAR');
          if(nonUsableInput) nonUsableInput.value = getNonUsable();
          saveTranches(selected.tranches || []);
          updateDisplay();
          renderTranches();
          updateReste();
        });
      }

      if(budgetAction){
        budgetAction.addEventListener('change', function(){
          var action = budgetAction.value;
          budgetAction.value = '';
          if(!action) return;

          var idx = budgetSelect ? parseInt(budgetSelect.value, 10) : NaN;
          var budgets = loadBudgets().filter(function(b){ return b && b.title && b.title.trim(); });
          var selected = (!isNaN(idx) && budgets[idx]) ? budgets[idx] : null;

          if(action === 'modifier'){
            var newName = prompt('Nom du budget :', getBudgetName() || (selected ? selected.title : ''));
            if(newName && newName.trim()) storage.set(STORAGE_BUDGET_NAME, newName.trim());
            var r = askBudget();
            if(r !== null) updateDisplay();
            var updated = loadBudgets().filter(function(b){ return b && b.title && b.title.trim(); });
            updated.push({
              title: getBudgetName() || '',
              montant: Number(storage.get(STORAGE_KEY) || 0),
              devise: storage.get(STORAGE_CUR) || 'SAR',
              date: todayAsInput(),
              tranches: loadTranches(),
              nonUsable: getNonUsable()
            });
            saveBudgets(updated.slice(-10));
            refreshBudgetOptions();
          } else if(action === 'supprimer'){
            if(confirm('Supprimer le budget et toutes les tranches ?')){
              if(selected){
                budgets.splice(idx,1);
                saveBudgets(budgets);
              }
              storage.remove(STORAGE_KEY);
              storage.remove(STORAGE_CUR);
              storage.remove(STORAGE_TRANCHES);
              storage.remove(STORAGE_BUDGET_NAME);
              storage.remove(STORAGE_NONUSABLE);
              if(badge) badge.style.display = 'none';
              renderTranches();
              updateReste();
              refreshBudgetOptions();
              alert('Budget et tranches supprimes.');
            }
          }
        });
      }

      if(addTrancheBtn) addTrancheBtn.addEventListener('click', addTrancheFlow);
      if(closeDialogBtn) closeDialogBtn.addEventListener('click', function(e){ e.preventDefault(); closeDialog(); });
      if(cancelDialogBtn) cancelDialogBtn.addEventListener('click', function(e){ e.preventDefault(); closeDialog(); });

      if(btn){
        btn.addEventListener('click', function(){
          try{
            var v = storage.get(STORAGE_KEY);
            if(!v){
              var r = askBudget();
              if(r !== null) updateDisplay();
            } else {
              updateDisplay();
            }
          }catch(e){
            alert('Erreur lors du clic Afficher : ' + (e && e.message ? e.message : e));
            console.error(e);
          }
        });
      }

      if(btnNewBudget){
        btnNewBudget.addEventListener('click', function(){
          var name = prompt('Nom du nouveau budget : ', getBudgetName() || '');
          if(name === null || !name.trim()){
            alert('Nom du budget requis.');
            return;
          }
          var baseCur = deviseSelect.value;
          var amount = prompt('Montant du budget en '+baseCur+' : ','');
          if(amount === null) return;
          amount = amount.replace(/\s+/g,'').replace(',','.');
          if(isNaN(Number(amount)) || Number(amount) <= 0){
            alert('Montant invalide.');
            return;
          }
          storage.remove(STORAGE_KEY);
          storage.remove(STORAGE_CUR);
          storage.remove(STORAGE_TRANCHES);
          storage.set(STORAGE_BUDGET_NAME, name.trim());
          setNonUsable(0, 'SAR');
          if(nonUsableInput) nonUsableInput.value = '0';
          if(badge) badge.style.display = 'none';
          renderTranches();
          updateReste();
          var budgets = loadBudgets();
          budgets.push({
            title: name.trim(),
            montant: Number(amount),
            devise: baseCur,
            date: todayAsInput(),
            tranches: [],
            nonUsable: 0
          });
          saveBudgets(budgets.slice(-10));
          refreshBudgetOptions();
          storage.set(STORAGE_KEY, Number(amount));
          storage.set(STORAGE_CUR, baseCur);
          updateDisplay();
          updateReste();
        });
      }

      if(changer) changer.addEventListener('click', function(e){ e.preventDefault(); var r = askBudget(); if(r !== null) updateDisplay(); });
      if(reinit) reinit.addEventListener('click', function(e){ e.preventDefault(); if(confirm('Supprimer le budget ?')){ storage.remove(STORAGE_KEY); storage.remove(STORAGE_CUR); if(badge) badge.style.display='none'; } });
      deviseSelect.addEventListener('change', function(){
        storage.set(STORAGE_DISPLAY_CUR, deviseSelect.value);
        updateDisplay();
        renderTranches();
        updateReste();
      });

      if(saveTauxBtn){
        saveTauxBtn.addEventListener('click', function(){
          var vSAR = Number(tauxSARInput.value);
          if(vSAR > 0) setTauxSAR_XOF(vSAR);
          renderTranches();
          updateDisplay();
          alert('Taux enregistres !');
        });
      }

      if(saveNonUsableBtn){
        saveNonUsableBtn.addEventListener('click', function(){
          var v = Number((nonUsableInput && nonUsableInput.value || '').toString().replace(/\\s+/g,'').replace(',','.'));
          if(!isFinite(v) || v < 0){ alert('Montant non utilisable invalide'); return; }
          setNonUsable(v, 'SAR');
          persistNonUsableToCurrentBudget(getNonUsable());
          updateReste();
        });
      }

      if(dialog){
        dialog.addEventListener('click', function(e){ if(e.target === dialog) closeDialog(); });
        document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !dialog.hidden) closeDialog(); });
      }

      if(trancheForm){
        trancheForm.addEventListener('submit', function(e){
          e.preventDefault();
          var dateVal = (dateInput.value || '').trim();
          var montantVal = Number((montantInput.value || '').toString().replace(/\s+/g,'').replace(',','.'));
          var deviseVal = normalizeDevise(deviseInput.value);
          var projetVal = (projetInput.value || '').trim();
          var paysVal = paysInput ? (paysInput.value || '') : '';
          var villeVal = (villeInput.value || '').trim();
          var localisationVal = (localisationInput.value || '').trim();

          if(!isValidDateInput(dateVal)){
            alert('Merci de saisir une date valide qui ne depasse pas la date du jour.');
            return;
          }
          if(!projetVal || !paysVal || !villeVal){
            alert('Le nom du projet, le pays et la ville sont obligatoires.');
            return;
          }
          if(!isFinite(montantVal) || montantVal <= 0){
            alert('Le montant doit etre positif.');
            return;
          }

          var arr = loadTranches();
          var payload = {
            date: dateVal,
            montant: montantVal,
            devise: deviseVal,
            projet: projetVal,
            pays: paysVal,
            ville: villeVal,
            localisation: localisationVal,
            tauxSAR_XOF: getTauxSAR_XOF(),
            tauxUSD_SAR: getTauxUSD_SAR()
          };

          if(typeof editingIndex === 'number') arr[editingIndex] = payload;
          else arr.push(payload);

          saveTranches(arr);
          renderTranches();
          updateReste();
          closeDialog();
        });
      }

      var exportBtn = document.getElementById('exportCSV');
      if(exportBtn){
        exportBtn.addEventListener('click', function(){
          var data = loadTranches();
          var csv = 'N°,Pays,Ville,Projet,Date,Montant,Devise,Localisation\n';
          for(var i=0;i<data.length;i++){
            var t = data[i];
            csv += (i+1)+','+(t.pays || '')+','+(t.ville || '')+','+(t.projet || '')+','+(t.date || '')+','+(t.montant || 0)+','+normalizeDevise(t.devise || deviseSelect.value)+','+(t.localisation || '')+'\n';
          }
          var blob = new Blob([csv], {type:'text/csv'});
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'tranches.csv';
          a.click();
          URL.revokeObjectURL(url);
        });
      }

      var exportPdfBtn = document.getElementById('exportPDF');
      if(exportPdfBtn){
        exportPdfBtn.addEventListener('click', function(){
          var data = loadTranches();
          var displayCur = deviseSelect.value;
          var totalDisplay = 0;
          for(var i=0;i<data.length;i++){
            var t = data[i];
            var rowDevise = normalizeDevise(t.devise || displayCur);
            totalDisplay += convert(t.montant, rowDevise, displayCur);
          }
          var rows = '';
          for(var j=0;j<data.length;j++){
            var rt = data[j];
            var rd = normalizeDevise(rt.devise || displayCur);
            rows += '<tr><td>'+(j+1)+'</td><td>'+(rt.pays || 'Pays non precise')+'</td><td>'+(rt.ville || 'Ville non precisee')+'</td><td>'+(rt.projet || 'Projet non precise')+'</td><td>'+(rt.date || '')+'</td><td>'+formatMoney(convert(rt.montant, rd, displayCur))+' '+displayCur+'</td><td>'+formatMoney(convert(rt.montant, rd, 'XOF'))+' XOF</td><td>'+(rt.localisation || '-')+'</td><td>1 SAR='+(rt.tauxSAR_XOF || getTauxSAR_XOF())+' XOF</td></tr>';
          }
          var content = "<!doctype html>"+
            "<html><head><meta charset=\"utf-8\"><title>Historique des tranches</title>"+
            "<style>body{font-family:Arial,sans-serif;padding:20px;color:#0b1220;}h1{margin-top:0;}table{border-collapse:collapse;width:100%;margin-top:16px;}th,td{border:1px solid #ccc;padding:8px;text-align:center;}th{background:#f5f5f5;}tfoot td{font-weight:bold;background:#eef3f8;}</style></head><body>"+
            "<h1>Historique des tranches</h1>"+
            "<p>Devise d&#39;affichage : "+displayCur+"</p>"+
            "<table><thead><tr><th>N°</th><th>Pays</th><th>Ville</th><th>Projet</th><th>Date</th><th>Montant</th><th>Montant XOF</th><th>Localisation</th><th>Taux utilises</th></tr></thead><tbody>"+
            rows+
            "</tbody><tfoot><tr><td colspan=\"6\">Total</td><td colspan=\"3\">"+formatMoney(totalDisplay)+" "+displayCur+"</td></tr></tfoot></table>"+
            "</body></html>";

          var w = window.open('', '_blank');
          if(!w) return;
          w.document.write(content);
          w.document.close();
          w.focus();
          w.print();
        });
      }

      window.deleteTranche = function(i){
        var arr = loadTranches();
        arr.splice(i, 1);
        saveTranches(arr);
        renderTranches();
        updateReste();
      };

      window.editTranche = function(i){
        var arr = loadTranches();
        var t = arr[i];
        if(!t) return;
        openDialog(t, i);
      };

      renderTranches();
      updateDisplay();
      updateReste();
      scheduleSharedSync();
    }catch(err){
      console.error('Erreur init', err);
      alert('Erreur initialisation : ' + (err && err.message ? err.message : err));
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
