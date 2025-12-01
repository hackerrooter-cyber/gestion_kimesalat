from pathlib import Path
path=Path('app.js')
block = '''if(localiteForm){
  localiteForm.addEventListener("submit",(e)=>{
    e.preventDefault();
    if(!currentUser || !currentUserData || !currentData) return;
    if(!requireAdmin("La mise � jour de la localitAc")) return;
    ensureLocalite(currentData);
    const prevLocalite = { ...currentData.localite };
    currentData.localite.terrain = localiteTerrainInput.value.trim();
    currentData.localite.etendue = localiteEtendueSelect.value.trim();
    const sup = parseFloat(localiteSuperficieInput.value);
    currentData.localite.superficie = Number.isFinite(sup) ? sup : null;
    const prix = parseFloat(localitePrixInput.value);
    currentData.localite.prix = Number.isFinite(prix) ? prix : null;
    currentData.localite.modePaiement = localiteModeSelect ? localiteModeSelect.value : "";
    const montantPayeForm = parseFloat(localiteMontantPayeInput ? localiteMontantPayeInput.value : "");
    if(currentData.localite.modePaiement !== "credit"){
      currentData.localite.montantPaye = currentData.localite.prix || 0;
    }else{
      currentData.localite.montantPaye = Number.isFinite(montantPayeForm) ? montantPayeForm : (currentData.localite.montantPaye || 0);
    }
    const prevRestant = prevLocalite.modePaiement === "credit" ? Math.max(0, (prevLocalite.prix || 0) - (prevLocalite.montantPaye || 0)) : 0;
    const newRestant = currentData.localite.modePaiement === "credit" ? Math.max(0, (currentData.localite.prix || 0) - (currentData.localite.montantPaye || 0)) : 0;
    const remboursementLocalite = Math.max(0, prevRestant - newRestant);
    if(remboursementLocalite > 0){
      currentData.transactions.push({ id: generateId(), type: "remboursement_localite", date: todayISO(), montant: remboursementLocalite, impactBudget: true, cibleType: "localite", cibleId: null, description: "Remboursement de la dette localit�" });
    }
    saveUserData(currentUser,currentUserData);
    addLog("LocalitAc mise � jour.");
    alert("LocalitAc enregistrAce.");
    if(localiteForm) localiteForm.reset();
    renderLocalite();
    renderBudgetStats();
    renderInventory();
  });
}


'''
if block not in path.read_text('utf-8'):
    raise SystemExit('block not found')
add = '''if(btnDeleteLocalite){
  btnDeleteLocalite.addEventListener("click",()=>{
    if(!currentUser || !currentUserData || !currentData) return;
    if(!requireAdmin("La suppression de la localit�")) return;
    if(!confirm("Supprimer toutes les informations de la localit� pour ce chantier ?")) return;
    currentData.localite = { terrain:"", etendue:"", superficie:null, prix:null, modePaiement:"", montantPaye:0 };
    saveUserData(currentUser,currentUserData);
    if(localiteForm) localiteForm.reset();
    renderLocalite();
    renderBudgetStats();
    renderInventory();
    addLog("Localit� supprim�e pour ce chantier.");
    alert("Localit� supprim�e.");
  });
}

'''
path.write_text(path.read_text('utf-8').replace(block, block + add, 1), 'utf-8')
print('delete handler added')
