"use strict";

/**********************
 * Listes de base
 **********************/
const BASE_MATERIAL_NAMES = [
  "Ciment",
  "Sable",
  "Gravier",
  "Eau",
  "Fer à béton",
  "Parpaing",
  "Brique",
  "Bois",
  "Tôle / Zinc",
  "Fil électrique",
  "Tuyaux PVC",
  "Peinture",
  "Enduit",
  "Carrelage",
  "Colle carrelage",
  "Chevrons",
  "Plâtre",
  "Clous / Vis",
  "Treillis soudé",
  "Tasseaux",
  "Béton prêt à l'emploi",
  "Agrégats",
  "Gravillons",
  "Bâches"
];

const BASE_MATERIAL_CATEGORIES = [
  "Maçonnerie",
  "Électricité",
  "Électricité / Plomberie",
  "Plomberie",
  "Menuiserie",
  "Ferraillage",
  "Badigeonnage",
  "Carrelage",
  "Terrassement",
  "Fondations",
  "Finitions"
];

const BASE_METIERS = [
  "Maçon",
  "Électricien",
  "Plombier",
  "Électricien / Plombier",
  "Peintre",
  "Carreleur",
  "Menuisier",
  "Ferrailleur",
  "Ouvrier",
  "Terrassier",
  "Chef de chantier"
];
const BASE_LOCALITE_ETENDUE = [
  "Parcelle",
  "Lotissement",
  "Quartier",
  "Commune",
  "Zone urbaine",
  "Zone rurale"
];


/**********************
 * Autocorrection simple
 **********************/
const CORRECTIONS_MATERIAUX = {
  "sand": "Sable",
  "sable ": "Sable",
  "gravir": "Gravier",
  "gravier ": "Gravier",
  "gravillon": "Gravillons",
  "ciment ": "Ciment",
  "eua": "Eau",
  "fer a beton": "Fer à béton",
  "fer a béton": "Fer à béton",
  "tole": "Tôle / Zinc",
  "tôle": "Tôle / Zinc",
  "zinc": "Tôle / Zinc"
};

const CORRECTIONS_CATEGORIES = {
  "maconnerie": "Maçonnerie",
  "maçonerie": "Maçonnerie",
  "electricite": "Électricité",
  "électricité/plomberie": "Électricité / Plomberie",
  "plomberie ": "Plomberie",
  "menuiserie ": "Menuiserie",
  "ferraillage ": "Ferraillage",
  "badigeonage": "Badigeonnage",
  "carelage": "Carrelage"
};

const CORRECTIONS_METIERS = {
  "macon": "Maçon",
  "mason": "Maçon",
  "electricien": "Électricien",
  "elecricien": "Électricien",
  "plombier ": "Plombier",
  "electricien/plombier": "Électricien / Plombier",
  "peinte": "Peintre",
  "carreleur ": "Carreleur",
  "menuiser": "Menuisier",
  "ferraileur": "Ferrailleur",
  "ferralieur": "Ferrailleur",
  "ouvriers": "Ouvrier"
};

function autoCorrectInput(input, map){
  if(!input) return;
  input.addEventListener("blur", ()=>{
    const raw = input.value.trim();
    if(!raw) return;
    const key = raw.toLowerCase();
    if(map[key]){
      input.value = map[key];
    }
  });
}

/**********************
 * Utilitaires
 **********************/
function formatAmount(v){
  if(!Number.isFinite(v)) return "0 FCFA";
  return v.toLocaleString("fr-FR",{maximumFractionDigits:0}) + " FCFA";
}
function clampNumber(value, min, max){
  return Math.min(Math.max(value, min), max);
}
function normalizeListInput(value){
  if(!value) return [];
  return Array.from(new Set(
    value
      .split(/[,\n;]/)
      .map(v=>v.trim())
      .filter(Boolean)
  ));
}
function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return y + "-" + m + "-" + day;
}
function generateId(){
  return "id-" + Math.random().toString(36).slice(2,9) + "-" + Date.now().toString(36);
}
function getSarRate(){
  if(!currentUserData) return null;
  const rate = currentUserData.sarRate;
  if(!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}
function formatSarAmountFromXof(xofAmount){
  const rate = getSarRate();
  if(!rate) return "Taux SAR a definir";
  const sarValue = (xofAmount || 0) / rate;
  return sarValue.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " SAR";
}
function formatSarRateDescription(){
  const rate = getSarRate();
  if(!rate) return "Taux SAR non defini";
  return "1 SAR = " + rate.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " FCFA";
}
function saveWithBackup(key,value){
  safeSetItem(key, value);
  try{
    const backupKey = key.startsWith(LS_DATA_PREFIX)
      ? LS_DATA_BACKUP_PREFIX + key.slice(LS_DATA_PREFIX.length)
      : key + "_backup";
    safeSetItem(backupKey, value);
  }catch(e){
    console.warn("Backup localStorage non disponible", e);
  }
}
function isValidPastOrToday(dateStr){
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  if(year < 1900) return false;
  const today = new Date();
  d.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  return d <= today;
}
async function hashPassword(password){
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function verifyPassword(userRecord, candidate){
  if(!userRecord) return false;
  if(userRecord.passwordHash){
    const candidateHash = await hashPassword(candidate);
    return candidateHash === userRecord.passwordHash;
  }
  return userRecord.password === candidate;
}
function validatePasswordComplexity(pwd){
  if(!pwd || pwd.length < 8) return false;
  const hasLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  return hasLetter && hasNumber;
}

/**********************
 * Stockage local
 **********************/
const LS_USERS_KEY = "chantierApp_users";
const LS_USERS_BACKUP_KEY = "chantierApp_users_backup";
const LS_CURRENT_USER_KEY = "chantierApp_currentUser";
const LS_CURRENT_USER_BACKUP_KEY = "chantierApp_currentUser_backup";
const LS_DATA_PREFIX = "chantierApp_data_";
const LS_DATA_BACKUP_PREFIX = "chantierApp_backup_";
const LS_REGISTER_GUARD_KEY = "chantierApp_registerGuard";
const LS_SNAPSHOT_KEY = "chantierApp_snapshot";
const LS_DATA_INDEX_KEY = "chantierApp_data_index";
const DONOR_SHARED_KEY = "shared_donor_budget_payload";
const IDB_NAME = "chantierApp_persist";
const IDB_STORE = "kv";
const inMemoryStore = {};
let idbPromise = null;
let donorBudgetsCache = [];
const ROLE_ADMIN = "admin";
const ROLE_VISITOR = "visitor";

async function getPersistenceDb(){
  if(typeof indexedDB === "undefined"){
    idbPromise = Promise.resolve(null);
    return null;
  }
  if(idbPromise) return idbPromise;
  try{
    const request = indexedDB.open(IDB_NAME, 1);
    idbPromise = new Promise(resolve=>{
      request.onupgradeneeded = ()=> request.result.createObjectStore(IDB_STORE);
      request.onsuccess = ()=> resolve(request.result);
      request.onerror = ()=> resolve(null);
    });
    return await idbPromise;
  }catch(e){
    console.warn("IndexedDB indisponible", e);
    idbPromise = Promise.resolve(null);
    return null;
  }
}
async function idbSet(key, value){
  const db = await getPersistenceDb();
  if(!db) return;
  return new Promise(resolve=>{
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    if(value === null || typeof value === "undefined"){
      store.delete(key);
    }else{
      store.put(value, key);
    }
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> {
      console.warn("Echec de la sauvegarde IndexedDB pour", key, tx.error);
      resolve();
    };
  });
}
async function idbGet(key){
  const db = await getPersistenceDb();
  if(!db) return null;
  return new Promise(resolve=>{
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = ()=> resolve(typeof req.result === "undefined" ? null : req.result);
    req.onerror = ()=> resolve(null);
  });
}
function cacheInMemory(key, value){
  if(value === null || typeof value === "undefined"){
    delete inMemoryStore[key];
  }else{
    inMemoryStore[key] = value;
  }
}
function safeGetItem(key){
  try{
    const val = localStorage.getItem(key);
    if(val !== null) return val;
  }catch(e){
    console.warn("Lecture localStorage impossible pour", key, e);
  }
  return Object.prototype.hasOwnProperty.call(inMemoryStore, key) ? inMemoryStore[key] : null;
}
function safeSetItem(key, value){
  cacheInMemory(key, value);
  try{
    localStorage.setItem(key, value);
  }catch(e){
    console.warn("Sauvegarde localStorage impossible pour", key, e);
  }
  idbSet(key, value);
}
function safeRemoveItem(key){
  cacheInMemory(key, null);
  try{
    localStorage.removeItem(key);
  }catch(e){
    console.warn("Suppression localStorage impossible pour", key, e);
  }
  idbSet(key, null);
}
async function restoreFromIndexedDB(){
  const baseKeys = [
    LS_USERS_KEY,
    LS_USERS_BACKUP_KEY,
    LS_REGISTER_GUARD_KEY,
    LS_CURRENT_USER_KEY,
    LS_CURRENT_USER_BACKUP_KEY,
    LS_SNAPSHOT_KEY,
    LS_DATA_INDEX_KEY
  ];
  let indexedUsers = [];
  try{
    const rawIndex = await idbGet(LS_DATA_INDEX_KEY);
    if(rawIndex){
      cacheInMemory(LS_DATA_INDEX_KEY, rawIndex);
      const parsed = JSON.parse(rawIndex);
      if(Array.isArray(parsed)) indexedUsers = parsed;
    }
  }catch(e){
    indexedUsers = [];
  }
  indexedUsers.forEach(user=>{
    baseKeys.push(LS_DATA_PREFIX + user);
    baseKeys.push(LS_DATA_BACKUP_PREFIX + user);
  });
  const uniqueKeys = Array.from(new Set(baseKeys));
  for(const key of uniqueKeys){
    try{
      const val = await idbGet(key);
      if(val === null || typeof val === "undefined") continue;
      cacheInMemory(key, val);
      try{
        if(!localStorage.getItem(key)){
          localStorage.setItem(key, val);
        }
      }catch(e){
        console.warn("Impossible de r�injecter la sauvegarde pour", key, e);
      }
    }catch(err){
      console.warn("Erreur restauration IndexedDB pour", key, err);
    }
  }
}

function ensureCustomLists(target){
  if(!target.customLists) target.customLists = { materiaux:[], metiers:[], categories:[] };
  ["materiaux","metiers","categories"].forEach(key=>{
    if(!Array.isArray(target.customLists[key])) target.customLists[key] = [];
    target.customLists[key] = target.customLists[key]
      .map(v => typeof v === "string" ? v.trim() : "")
      .filter(Boolean);
  });
}
function getCustomList(key){
  if(!currentUserData || !currentUserData.customLists) return [];
  const arr = currentUserData.customLists[key];
  return Array.isArray(arr) ? arr : [];
}
function updateDataIndex(username){
  if(!username) return;
  let list = [];
  try{
    const raw = safeGetItem(LS_DATA_INDEX_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed)) list = parsed;
    }
  }catch(e){
    list = [];
  }
  if(!list.includes(username)) list.push(username);
  try{
    safeSetItem(LS_DATA_INDEX_KEY, JSON.stringify(list));
  }catch(err){
    console.warn("Impossible de mettre � jour l'index des sauvegardes", err);
  }
}

function loadUsers(){
  try{
    const raw = safeGetItem(LS_USERS_KEY);
    if(raw) return JSON.parse(raw);
    const backup = safeGetItem(LS_USERS_BACKUP_KEY);
    return backup ? JSON.parse(backup) : [];
  }catch(e){
    console.error("Erreur lecture utilisateurs:", e);
    try{
      const backup = safeGetItem(LS_USERS_BACKUP_KEY);
      return backup ? JSON.parse(backup) : [];
    }catch(err){
      console.error("Erreur lecture sauvegarde utilisateurs:", err);
      return [];
    }
  }
}
function saveUsers(list){
  const payload = JSON.stringify(list);
  saveWithBackup(LS_USERS_KEY, payload);
  saveSnapshot();
}
function hasAdminAccount(users){
  const list = Array.isArray(users) ? users : loadUsers();
  return list.some(u => (u.role || ROLE_ADMIN) === ROLE_ADMIN);
}
function loadRegisterGuardHash(){
  try{
    return safeGetItem(LS_REGISTER_GUARD_KEY);
  }catch(e){
    console.error("Erreur lecture mot de passe de création", e);
    return null;
  }
}
function saveRegisterGuardHash(hash){
  safeSetItem(LS_REGISTER_GUARD_KEY, hash);
}
function clearRegisterGuardHash(){
  safeRemoveItem(LS_REGISTER_GUARD_KEY);
}
function getCurrentUsername(){
  const val = safeGetItem(LS_CURRENT_USER_KEY);
  if(val) return val;
  const backup = safeGetItem(LS_CURRENT_USER_BACKUP_KEY);
  return backup || null;
}
function setCurrentUsername(name){
  if(name){
    safeSetItem(LS_CURRENT_USER_KEY, name);
    safeSetItem(LS_CURRENT_USER_BACKUP_KEY, name);
  }else{
    safeRemoveItem(LS_CURRENT_USER_KEY);
    safeRemoveItem(LS_CURRENT_USER_BACKUP_KEY);
  }
}

function getCurrentUserRecord(){
  const username = getCurrentUsername();
  if(!username) return null;
  const users = loadUsers();
  return users.find(u => u.username === username) || null;
}

function loadUserData(username){
  const key = LS_DATA_PREFIX + username;
  try{
    const raw = safeGetItem(key);
    const backupKey = LS_DATA_BACKUP_PREFIX + username;
    if(!raw){
      const backup = safeGetItem(backupKey);
      if(backup){
        return JSON.parse(backup);
      }
      return { chantiers:{}, chantierActif:null, theme:"dark", logs:[], customLists:{ materiaux:[], metiers:[], categories:[] }, sarRate:null, sarRateUpdatedAt:null };
    }
    const parsed = JSON.parse(raw);

    ensureCustomLists(parsed);

    // Migration ancien format éventuel
    if(parsed && !parsed.chantiers){
      const id = generateId();
      const chantier = Object.assign(
        {
          id,
          nom: "Chantier 1",
          budgetInitial: 0,
          budgetNote: "",
          budgetInitialLocked: false,
          localite:{ terrain:'', etendue:'', superficie:null, prix:null, modePaiement:"", montantPaye:0, dateAchat:"" },
          materiaux: [],
          ouvriers: [],
          transactions: [],
          archive:false,
          verrouille:false,
          defaut:true
        },
        parsed
      );
      (chantier.materiaux || []).forEach(m=>{
        if(typeof m.quantite === "undefined") m.quantite = 1;
        if(typeof m.categorie === "undefined") m.categorie = "";
      });
      return {
        chantiers: { [id]: chantier },
        chantierActif: id,
        theme: parsed.theme || "dark",
        logs: parsed.logs || [],
        customLists: parsed.customLists || { materiaux:[], metiers:[], categories:[] },
        sarRate: typeof parsed.sarRate === "number" ? parsed.sarRate : null,
        sarRateUpdatedAt: parsed.sarRateUpdatedAt || null
      };
    }

    if(!parsed.chantiers) parsed.chantiers = {};
    if(typeof parsed.chantierActif === "undefined") parsed.chantierActif = null;
    if(!parsed.theme) parsed.theme = "dark";
    if(!Array.isArray(parsed.logs)) parsed.logs = [];
    if(typeof parsed.sarRate !== "number") parsed.sarRate = null;
    if(!parsed.sarRateUpdatedAt) parsed.sarRateUpdatedAt = null;
    ensureCustomLists(parsed);

    Object.values(parsed.chantiers).forEach(c=>{
      if(typeof c.archive === "undefined") c.archive = false;
      if(typeof c.verrouille === "undefined") c.verrouille = false;
      if(typeof c.defaut === "undefined") c.defaut = false;
      if(!c.localite){ c.localite = { terrain:'', etendue:'', superficie:null, prix:null, modePaiement:"", montantPaye:0, dateAchat:"" }; }
      if(typeof c.budgetInitialLocked === "undefined"){
        c.budgetInitialLocked = Number.isFinite(c.budgetInitial) && c.budgetInitial > 0;
      }
      (c.materiaux || []).forEach(m=>{
        if(typeof m.quantite === "undefined") m.quantite = 1;
        if(typeof m.categorie === "undefined") m.categorie = "";
      });
      if(c.localite){
        if(typeof c.localite.modePaiement === "undefined") c.localite.modePaiement = "";
        if(typeof c.localite.montantPaye === "undefined") c.localite.montantPaye = 0;
        if(typeof c.localite.dateAchat === "undefined") c.localite.dateAchat = "";
      }
    });
    return parsed;
  }catch(e){
    console.error("Erreur lecture données:", e);
    try{
      const backup = safeGetItem(LS_DATA_BACKUP_PREFIX + username);
      if(backup){
        return JSON.parse(backup);
      }
    }catch(err){
      console.error("Erreur lecture sauvegarde données:", err);
    }
    return { chantiers:{}, chantierActif:null, theme:"dark", logs:[], customLists:{ materiaux:[], metiers:[], categories:[] }, sarRate:null, sarRateUpdatedAt:null };
  }
}
function saveUserData(username,data){
  const key = LS_DATA_PREFIX + username;
  const payload = JSON.stringify(data);
  updateDataIndex(username);
  saveWithBackup(key, payload);
  saveSnapshot();
}

/**********************
 * Journal interne
 **********************/
let currentUser = null;
let currentUserData = null;
let currentData = null;
let currentMainView = "dashboard";
let currentUserRole = ROLE_ADMIN;
let transactionEditingId = null;
function saveSnapshot(){
  if(!currentUser || !currentUserData) return;
  try{
    const snapshot = {
      user: currentUser,
      role: currentUserRole,
      data: currentUserData
    };
    safeSetItem(LS_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }catch(e){
    console.warn("Impossible de sauvegarder le snapshot local", e);
  }
}

/**********************
 * Synchronisation budget donateur
 **********************/
function readDonorSharedPayload(){
  try{
    const raw = safeGetItem(DONOR_SHARED_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(err){
    console.warn("Erreur lecture budget donateur", err);
    return null;
  }
}
function slugifyBudgetTitle(title){
  return (title || "budget")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)+/g,"") || "budget";
}
function computeBudgetXofFromDonor(budget, rate){
  const devise = (budget.devise || "SAR").toUpperCase();
  const montant = Number(budget.montant) || 0;
  const nonUsableSar = Number(budget.nonUsable || 0);
  const rateValid = Number.isFinite(rate) && rate > 0;
  const baseXof = devise === "XOF" ? montant : (rateValid ? montant * rate : 0);
  const nonUsableXof = rateValid ? nonUsableSar * rate : 0;
  return Math.max(0, baseXof - nonUsableXof);
}
function syncBudgetFromDonor(payload, options={}){
  if(!currentUserData) return;
  const opts = Object.assign({silent:false,forceReset:false}, options);
  const donorPayload = payload || readDonorSharedPayload();
  if(!donorPayload){
    if(opts.forceReset){
      ensureAtLeastOneChantier({placeholder:true});
      currentData = currentUserData.chantiers[currentUserData.chantierActif];
      renderChantiersUI();
      renderBudgetStats();
    }
    return;
  }

  donorBudgetsCache = Array.isArray(donorPayload.budgets) ? donorPayload.budgets : [];
  const rate = Number(donorPayload.tauxSarXof);
  const rateValid = Number.isFinite(rate) && rate > 0;
  if(rateValid){
    currentUserData.sarRate = rate;
    currentUserData.sarRateUpdatedAt = donorPayload.updatedAt || new Date().toISOString();
  }

  const chantiersFromBudgets = {};
  donorBudgetsCache.forEach((b, idx)=>{
    const id = "donor_" + slugifyBudgetTitle(b.title || "") + "_" + idx;
    const budgetInitial = computeBudgetXofFromDonor(b, rate);
    chantiersFromBudgets[id] = {
      id,
      nom: b.title || `Budget ${idx+1}`,
      budgetInitial,
      budgetNote: "Budget issu de donateur.html",
      budgetInitialLocked: true,
      localite:{ terrain:'', etendue:'', superficie:null, prix:null, modePaiement:"", montantPaye:0, dateAchat:"" },
      materiaux: [],
      ouvriers: [],
      transactions: [],
      archive:false,
      verrouille:false,
      defaut: idx === 0
    };
  });

  if(Object.keys(chantiersFromBudgets).length === 0){
    ensureAtLeastOneChantier({placeholder:true});
    renderChantiersUI();
    renderBudgetStats();
    return;
  }

  const previousActive = currentUserData.chantierActif;
  currentUserData.chantiers = chantiersFromBudgets;
  const ids = Object.keys(chantiersFromBudgets);
  currentUserData.chantierActif = previousActive && chantiersFromBudgets[previousActive] ? previousActive : ids[0];
  currentData = currentUserData.chantiers[currentUserData.chantierActif];

  saveUserData(currentUser,currentUserData);
  renderChantiersUI();
  renderBudgetStats();
  renderInventory();
  if(!opts.silent){
    addLog("Budgets synchronisés depuis donateur.html.");
  }
}
function addLog(message){
  if(!currentUserData) return;
  currentUserData.logs = currentUserData.logs || [];
  currentUserData.logs.unshift({
    id: generateId(),
    date: new Date().toISOString(),
    message
  });
  if(currentUserData.logs.length > 200){
    currentUserData.logs.length = 200;
  }
  saveUserData(currentUser,currentUserData);
  renderLogs();
}
function renderLogs(){
  if(!logsList) return;
  const logs = (currentUserData && Array.isArray(currentUserData.logs)) ? currentUserData.logs : [];
  logsList.innerHTML = "";
  if(!logs.length){
    logsList.innerHTML = '<div class="hint">Aucune entrée dans le journal pour le moment.</div>';
    return;
  }
  const escapeHtml = (str="")=> String(str).replace(/[&<>"']/g, ch=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[ch]));
  logs.slice(0,200).forEach(log=>{
    const row = document.createElement("div");
    row.className = "log-row";
    const dateLabel = log.date ? new Date(log.date).toLocaleString() : "";
    row.innerHTML = `
      <div class="log-message">${escapeHtml(log.message || "")}</div>
      <div class="log-meta">${escapeHtml(dateLabel)}</div>
    `;
    logsList.appendChild(row);
  });
}

/**********************
 * Références DOM
 **********************/
const authView = document.getElementById("auth-view");
const appView  = document.getElementById("app-view");

const authForm = document.getElementById("auth-form");
const authUsernameInput = document.getElementById("auth-username");
const authPasswordInput = document.getElementById("auth-password");
const authPasswordConfirmInput = document.getElementById("auth-password-confirm");
const authPasswordConfirmField = document.getElementById("auth-password-confirm-field");
const authRoleSelect = document.getElementById("auth-role");
const authRoleField = document.getElementById("auth-role-field");
const authRegisterGuardField = document.getElementById("auth-register-guard-field");
const authRegisterGuardInput = document.getElementById("auth-register-guard");
const authRegisterGuardHint = document.getElementById("auth-register-guard-hint");
const togglePasswordBtn = document.getElementById("toggle-password-visibility");
const togglePasswordConfirmBtn = document.getElementById("toggle-password-confirm-visibility");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleText = document.getElementById("auth-toggle-text");

const currentUsernameSpan = document.getElementById("current-username");
const currentRoleSpan = document.getElementById("current-role");
const logoutBtn = document.getElementById("logout-btn");

const chantierSelect = document.getElementById("chantier-select");
const btnNewChantier = document.getElementById("btn-new-chantier");
const btnDeleteChantier = document.getElementById("btn-delete-chantier");
const chantierLockChip = document.getElementById("chantier-lock-chip");

const dashboardView = document.getElementById("dashboard-view");
const settingsView = document.getElementById("settings-view");
const inventoryView = document.getElementById("inventory-view");
const btnSettings = document.getElementById("btn-settings");
const btnInventory = document.getElementById("btn-inventory");

const budgetForm = document.getElementById("budget-form");
const budgetInitialInput = document.getElementById("budget-initial");
const budgetNoteInput = document.getElementById("budget-note");
const budgetPasswordField = document.getElementById("budget-password-field");
const budgetPasswordInput = document.getElementById("budget-password");
const budgetPasswordHint = document.getElementById("budget-password-hint");
const budgetPasswordNote = document.getElementById("budget-password-note");
const statBudgetInitial = document.getElementById("stat-budget-initial");
const statDepenses = document.getElementById("stat-depenses");
const statSolde = document.getElementById("stat-solde");
const statDettes = document.getElementById("stat-dettes");
const statBudgetInitialSar = document.getElementById("stat-budget-initial-sar");
const statSarRateNote = document.getElementById("stat-sar-rate-note");
const kpiBudgetInitial = document.getElementById("kpi-budget-initial");
const kpiBudgetInitialSar = document.getElementById("kpi-budget-initial-sar");
const sarRateChip = document.getElementById("sar-rate-chip");
const kpiDepenses = document.getElementById("kpi-depenses");
const kpiSolde = document.getElementById("kpi-solde");
const kpiDettes = document.getElementById("kpi-dettes");

const tabButtons = document.querySelectorAll(".tab");
const tabMateriauxPanel = document.getElementById("tab-materiaux");
const tabOuvriersPanel = document.getElementById("tab-ouvriers");
const tabLocalitePanel = document.getElementById("tab-localite");

function isBudgetManagedByDonor(){ return true; }
function lockBudgetFormToDonor(){
  if(budgetInitialInput) budgetInitialInput.disabled = true;
  if(budgetNoteInput) budgetNoteInput.disabled = true;
  if(budgetPasswordInput) budgetPasswordInput.disabled = true;
  if(budgetPasswordField) budgetPasswordField.classList.add("hidden");
  const submitBtn = budgetForm ? budgetForm.querySelector("button[type=\"submit\"]") : null;
  if(submitBtn){
    submitBtn.disabled = true;
    submitBtn.textContent = "Budget piloté depuis donateur.html";
  }
}

const materiauForm = document.getElementById("materiau-form");
const materiauNomInput = document.getElementById("materiau-nom");
const materiauMontantInput = document.getElementById("materiau-montant");
const materiauCreditSelect = document.getElementById("materiau-credit");
const materiauDateInput = document.getElementById("materiau-date");
const materiauQuantiteInput = document.getElementById("materiau-quantite");
const materiauCategorieInput = document.getElementById("materiau-categorie");
const materiauNomDatalist = document.getElementById("materiau-nom-options");
const materiauCategorieDatalist = document.getElementById("materiau-categorie-options");
const materiauxList = document.getElementById("materiaux-list");

const ouvrierForm = document.getElementById("ouvrier-form");
const ouvrierNomInput = document.getElementById("ouvrier-nom");
const ouvrierMetierInput = document.getElementById("ouvrier-metier");
const ouvrierMetierDatalist = document.getElementById("ouvrier-metier-options");
const ouvrierMontantInput = document.getElementById("ouvrier-montant");
const ouvrierDateInput = document.getElementById("ouvrier-date");
const ouvriersList = document.getElementById("ouvriers-list");
const filterMetierSelect = document.getElementById("filter-metier");

const localiteForm = document.getElementById("localite-form");
const localiteTerrainInput = document.getElementById("localite-terrain");
const localiteEtendueSelect = document.getElementById("localite-etendue");
const localiteSuperficieInput = document.getElementById("localite-superficie");
const localitePrixInput = document.getElementById("localite-prix");
const localiteMontantPayeInput = document.getElementById("localite-montant-paye");
const localiteMontantField = document.getElementById("localite-montant-field");
const localiteModeSelect = document.getElementById("localite-mode");
const localiteDateInput = document.getElementById("localite-date");
const editLocaliteBtn = document.getElementById("btn-edit-localite");
const btnDeleteLocalite = document.getElementById("btn-delete-localite");

const transactionForm = document.getElementById("transaction-form");
const transactionEditSelect = document.getElementById("transaction-edit-select");
const btnEditTransaction = document.getElementById("btn-edit-transaction");
const transactionTypeSelect = document.getElementById("transaction-type");
const transactionMontantInput = document.getElementById("transaction-montant");
const transactionDateInput = document.getElementById("transaction-date");
const transactionNoteInput = document.getElementById("transaction-note");
const transactionOuvrierField = document.getElementById("transaction-ouvrier-field");
const transactionMateriauField = document.getElementById("transaction-materiau-field");
const transactionLocaliteField = document.getElementById("transaction-localite-field");
const transactionOuvrierSelect = document.getElementById("transaction-ouvrier");
const transactionMateriauSelect = document.getElementById("transaction-materiau");
const transactionLocaliteSelect = document.getElementById("transaction-localite");
const btnToggleImprevus = document.getElementById("btn-toggle-imprevus");
const imprevusPanel = document.getElementById("imprevus-panel");
const imprevusList = document.getElementById("imprevus-list");
const imprevusTotalPill = document.getElementById("imprevus-total-pill");

const transactionsTbody = document.getElementById("transactions-tbody");
const transactionsCountChip = document.getElementById("transactions-count-chip");

const filterTypeSelect = document.getElementById("filter-type");
const filterOuvrierSelect = document.getElementById("filter-ouvrier");
const filterMateriauTransacSelect = document.getElementById("filter-materiau-transac");
const filterDateMinInput = document.getElementById("filter-date-min");
const filterDateMaxInput = document.getElementById("filter-date-max");
const btnClearFilters = document.getElementById("btn-clear-filters");

const btnExportPDF = document.getElementById("btn-export-pdf");
const btnExportExcel = document.getElementById("btn-export-excel");

const settingsUsernameDisplay = document.getElementById("settings-username-display");
const avatarInput = document.getElementById("avatar-input");
const avatarPreview = document.getElementById("avatar-preview");
const formChangeUsername = document.getElementById("form-change-username");
const newUsernameInput = document.getElementById("new-username");
const passwordForUsernameInput = document.getElementById("password-for-username");
const formChangePassword = document.getElementById("form-change-password");
const oldPasswordInput = document.getElementById("old-password");
const newPasswordInput = document.getElementById("new-password");
const newPasswordConfirmInput = document.getElementById("new-password-confirm");
const registerGuardSection = document.getElementById("register-guard-section");
const formRegisterGuard = document.getElementById("form-register-guard");
const registerGuardPasswordInput = document.getElementById("register-guard-password");
const registerGuardPasswordConfirmInput = document.getElementById("register-guard-password-confirm");
const registerGuardStatus = document.getElementById("register-guard-status");
const btnClearRegisterGuard = document.getElementById("btn-clear-register-guard");
const sarRateForm = document.getElementById("sar-rate-form");
const sarRateInput = document.getElementById("sar-rate");
const sarRatePasswordInput = document.getElementById("sar-rate-password");
const sarRateHint = document.getElementById("sar-rate-hint");
const btnThemeDark = document.getElementById("btn-theme-dark");
const btnThemeLight = document.getElementById("btn-theme-light");

const settingsChantiersList = document.getElementById("settings-chantiers-list");

const btnExportAllPDF = document.getElementById("btn-export-all-pdf");
const btnExportAllZIP = document.getElementById("btn-export-all-zip");
const btnExportBackupJSON = document.getElementById("btn-export-backup-json");
const btnImportBackupJSON = document.getElementById("btn-import-backup-json");
const logsList = document.getElementById("logs-list");
const customListsForm = document.getElementById("custom-lists-form");
const customMaterialsTextarea = document.getElementById("custom-materials");
const customMetiersTextarea = document.getElementById("custom-metiers");
const customCategoriesTextarea = document.getElementById("custom-categories");

const invTotalMatSpan = document.getElementById("inv-total-mat");
const invTotalOuvSpan = document.getElementById("inv-total-ouv");
const invTotalGlobalSpan = document.getElementById("inv-total-global");
const invMatTbody = document.getElementById("inv-mat-tbody");
const invOuvTbody = document.getElementById("inv-ouv-tbody");
const btnExportInventoryPDF = document.getElementById("btn-export-inventory-pdf");
const btnExportInventoryExcel = document.getElementById("btn-export-inventory-excel");

let invMatChart = null;
let invOuvChart = null;

let authMode = "login";

function getCurrentPermissions(){
  return currentUserRole === ROLE_VISITOR
    ? { canEdit:false, canManageChantier:false }
    : { canEdit:true, canManageChantier:true };
}
function requireAdmin(actionLabel){
  if(currentUserRole !== ROLE_ADMIN){
    const message = actionLabel ? `${actionLabel} est réservée à un administrateur.` : "Action réservée à un administrateur.";
    alert(message);
    return false;
  }
  return true;
}
function applyRoleContext(){
  const roleLabel = currentUserRole === ROLE_VISITOR ? "Visiteur" : "Administrateur";
  if(currentRoleSpan){
    currentRoleSpan.textContent = roleLabel;
  }
  document.body.classList.toggle("role-visitor", currentUserRole === ROLE_VISITOR);
  if(registerGuardSection){
    registerGuardSection.classList.toggle("hidden", currentUserRole !== ROLE_ADMIN);
  }
  applyPermissionLocks();
}
function applyPermissionLocks(){
  const perms = getCurrentPermissions();
  document.querySelectorAll("[data-requires-admin]").forEach(el=>{
    el.disabled = !perms.canEdit;
  });
}
function renderSettingsView(){
  if(settingsUsernameDisplay) settingsUsernameDisplay.textContent = currentUser || "";

  if(settingsChantiersList){
    settingsChantiersList.innerHTML = "";
    const list = currentUserData && currentUserData.chantiers ? Object.values(currentUserData.chantiers) : [];
    if(list.length === 0){
      settingsChantiersList.innerHTML = '<div class="hint">Aucun chantier pour le moment.</div>';
    }else{
      list.forEach(ch=>{
        const row = document.createElement("div");
        row.className = "settings-chantier-row";
        const nom = ch.nom || "Chantier";
        const budget = formatAmount(ch.budgetInitial || 0);
        row.textContent = `${nom} · Budget ${budget} FCFA`;
        settingsChantiersList.appendChild(row);
      });
    }
  }

  if(sarRateInput){
    const rate = getSarRate();
    sarRateInput.value = rate || "";
  }
  if(sarRateHint){
    sarRateHint.textContent = formatSarRateDescription();
  }

  if(customMaterialsTextarea) customMaterialsTextarea.value = getCustomList("materiaux").join("\n");
  if(customMetiersTextarea) customMetiersTextarea.value = getCustomList("metiers").join("\n");
  if(customCategoriesTextarea) customCategoriesTextarea.value = getCustomList("categories").join("\n");

  renderLogs();
}

/**********************
 * Multi-chantiers
 **********************/
function ensureAtLeastOneChantier(opts={}){
  if(!currentUserData.chantiers) currentUserData.chantiers = {};
  if(typeof currentUserData.sarRate !== "number") currentUserData.sarRate = null;
  if(!currentUserData.sarRateUpdatedAt) currentUserData.sarRateUpdatedAt = null;
  if(Object.keys(currentUserData.chantiers).length === 0){
    const id = "chantier_placeholder";
    currentUserData.chantiers[id] = {
      id,
      nom: opts.placeholder ? "Aucun budget donateur" : "Chantier",
      budgetInitial: 0,
      budgetNote: "",
      budgetInitialLocked: false,
      localite:{ terrain:'', etendue:'', superficie:null, prix:null, modePaiement:"", montantPaye:0, dateAchat:"" },
      materiaux: [],
      ouvriers: [],
      transactions: [],
      archive:false,
      verrouille:false,
      defaut:true
    };
    currentUserData.chantierActif = id;
  }else if(!currentUserData.chantierActif || !currentUserData.chantiers[currentUserData.chantierActif]){
    currentUserData.chantierActif = Object.keys(currentUserData.chantiers)[0];
  }
}

function renderChantiersUI(){
  if(!currentUserData || !currentUserData.chantiers) return;
  chantierSelect.innerHTML = "";
  Object.values(currentUserData.chantiers).forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nom || "Chantier";
    if(c.id === currentUserData.chantierActif) opt.selected = true;
    chantierSelect.appendChild(opt);
  });
  chantierSelect.disabled = false;

  if(currentData && currentData.verrouille){
    chantierLockChip.classList.remove("hidden");
  }else{
    chantierLockChip.classList.add("hidden");
  }
}

function setActiveChantier(id){
  if(!currentUserData || !currentUserData.chantiers[id]) return;
  currentUserData.chantierActif = id;
  currentData = currentUserData.chantiers[id];
  saveUserData(currentUser,currentUserData);
  renderChantiersUI();
  syncBudgetFromDonor(null,{silent:true,forceReset:true});
  renderAll();
  addLog(`Changement de chantier actif : « ${currentData.nom || "Sans nom"} ».`);
}

/**********************
 * Authentification
 **********************/
function updateRegisterGuardFieldState(){
  if(!authRegisterGuardField) return;
  const users = loadUsers();
  const guardHash = loadRegisterGuardHash();
  const adminExists = hasAdminAccount(users);
  const shouldShow = authMode === "register";

  if(shouldShow){
    authRegisterGuardField.classList.remove("hidden");
    const requiresGuard = adminExists && !!guardHash;
    authRegisterGuardInput.required = requiresGuard;
    authRegisterGuardInput.disabled = adminExists && !guardHash;

    if(adminExists && !guardHash){
      authRegisterGuardHint.textContent =
        "Un administrateur doit définir le mot de passe d’activation dans les paramètres avant toute nouvelle création.";
    }else if(adminExists && guardHash){
      authRegisterGuardHint.textContent =
        "Saisissez le mot de passe d’activation fourni par un administrateur pour valider la création.";
    }else{
      authRegisterGuardHint.textContent =
        "Création initiale : définissez d’abord un compte administrateur avant de sécuriser l’activation.";
    }
  }else{
    authRegisterGuardField.classList.add("hidden");
    authRegisterGuardInput.required = false;
    authRegisterGuardInput.disabled = false;
  }
}
function setAuthMode(mode){
  authMode = mode;
  if(mode === "login"){
    authTitle.textContent = "Connexion à l’espace chantier";
    authSubtitle.textContent = "Saisissez vos identifiants pour accéder à votre tableau de bord.";
    authSubmitBtn.textContent = "Se connecter";
    authToggleText.innerHTML = 'Pas encore de compte ? <button type="button" id="toggle-auth-mode">Créer un compte</button>';
    authPasswordConfirmField.classList.add("hidden");
    authRoleField.classList.add("hidden");
  }else{
    authTitle.textContent = "Création d’un compte chantier";
    authSubtitle.textContent = "Définissez un identifiant et un mot de passe pour cet espace.";
    authSubmitBtn.textContent = "Créer le compte";
    authToggleText.innerHTML = 'Déjà un compte ? <button type="button" id="toggle-auth-mode">Se connecter</button>';
    authPasswordConfirmField.classList.remove("hidden");
    authRoleField.classList.remove("hidden");
  }
  updateRegisterGuardFieldState();
  const toggleBtn = document.getElementById("toggle-auth-mode");
  toggleBtn.addEventListener("click", ()=> setAuthMode(authMode==="login" ? "register" : "login"));
}

function showAuth(){
  appView.classList.remove("active");
  authView.classList.add("active");
}
function showApp(){
  authView.classList.remove("active");
  appView.classList.add("active");
  currentUsernameSpan.textContent = currentUser || "";
  applyRoleContext();
  applyTheme();
  renderChantiersUI();
  renderSettingsView();
  syncBudgetFromDonor(null,{silent:true,forceReset:true});
  renderAll();
  updateMainView();
}

window.addEventListener("storage",(e)=>{
  if(e.key !== DONOR_SHARED_KEY || !e.newValue) return;
  try{
    const payload = JSON.parse(e.newValue);
    syncBudgetFromDonor(payload);
  }catch(err){
    console.error("Erreur synchronisation budget donateur", err);
  }
});

function setupPasswordToggle(input, btn){
  if(!input || !btn) return;
  btn.addEventListener("click", ()=>{
    const currentlyHidden = input.type === "password";
    input.type = currentlyHidden ? "text" : "password";
    btn.textContent = currentlyHidden ? "Masquer" : "Afficher";
    if(currentlyHidden){
      setTimeout(()=>{
        input.type = "password";
        btn.textContent = "Afficher";
      }, 5000);
    }
  });
}

authForm.addEventListener("submit",async (e)=>{
  e.preventDefault();
  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value;
  if(!username || !password){
    alert("Veuillez renseigner l’identifiant et le mot de passe.");
    return;
  }
  let users = loadUsers();

  if(authMode === "register"){
    const confirm = authPasswordConfirmInput.value;
    if(password !== confirm){
      alert("La confirmation du mot de passe ne correspond pas.");
      return;
    }
    if(!validatePasswordComplexity(password)){
      alert("Mot de passe trop simple. Merci d’utiliser au moins 8 caractères incluant lettres et chiffres.");
      return;
    }
    if(users.some(u=>u.username === username)){
      alert("Cet identifiant est déjà utilisé.");
      return;
    }
    const adminExists = hasAdminAccount(users);
    const guardHash = loadRegisterGuardHash();
    if(adminExists){
      if(!guardHash){
        alert("La création de nouveaux comptes est désactivée tant qu’un administrateur n’a pas défini le mot de passe d’activation dans les paramètres.");
        return;
      }
      const activationPassword = authRegisterGuardInput ? authRegisterGuardInput.value : "";
      if(!activationPassword){
        alert("Veuillez saisir le mot de passe d’activation défini par un administrateur.");
        return;
      }
      const activationHash = await hashPassword(activationPassword);
      if(activationHash !== guardHash){
        alert("Mot de passe d’activation incorrect.");
        return;
      }
    }
    const passwordHash = await hashPassword(password);
    const role = (authRoleSelect && authRoleSelect.value === ROLE_VISITOR) ? ROLE_VISITOR : ROLE_ADMIN;
    users.push({username,passwordHash,role,avatarDataUrl:null});
    saveUsers(users);
    setCurrentUsername(username);
    currentUser = username;
    currentUserRole = role;
    currentUserData = loadUserData(username);
    currentUserData.role = role;
    ensureAtLeastOneChantier();
    currentData = currentUserData.chantiers[currentUserData.chantierActif];
    saveUserData(currentUser,currentUserData);
    addLog("Création du compte chantier.");
    applyRoleContext();
    showApp();
  }else{
    const found = users.find(u=>u.username===username);
    if(!found || !(await verifyPassword(found,password))){
      alert("Identifiant ou mot de passe incorrect.");
      return;
    }
    setCurrentUsername(username);
    currentUser = username;
    currentUserRole = found.role || ROLE_ADMIN;
    currentUserData = loadUserData(username);
    currentUserData.role = currentUserRole;
    ensureAtLeastOneChantier();
    currentData = currentUserData.chantiers[currentUserData.chantierActif];
    saveUserData(currentUser,currentUserData);
    addLog("Connexion au compte chantier.");
    applyRoleContext();
    showApp();
  }
  authPasswordInput.value = "";
  if(authPasswordConfirmInput) authPasswordConfirmInput.value = "";
  if(authRegisterGuardInput) authRegisterGuardInput.value = "";
});

logoutBtn.addEventListener("click", ()=>{
  if(confirm("Voulez-vous vraiment vous déconnecter ?")){
    addLog("Déconnexion de la session.");
    setCurrentUsername(null);
    currentUser = null;
    currentUserData = null;
    currentData = null;
    showAuth();
  }
});

/**********************
 * Thème
 **********************/
function applyTheme(){
  if(!currentUserData){
    document.body.classList.remove("theme-light");
    return;
  }
  const theme = currentUserData.theme || "dark";
  if(theme === "light"){
    document.body.classList.add("theme-light");
  }else{
    document.body.classList.remove("theme-light");
  }
}
btnThemeDark.addEventListener("click", ()=>{
  if(!currentUserData) return;
  currentUserData.theme = "dark";
  saveUserData(currentUser,currentUserData);
  applyTheme();
  addLog("Passage au thème sombre.");
});
btnThemeLight.addEventListener("click", ()=>{
  if(!currentUserData) return;
  currentUserData.theme = "light";
  saveUserData(currentUser,currentUserData);
  applyTheme();
  addLog("Passage au thème clair.");
});

/**********************
 * Navigation principale
 **********************/
function updateMainView(){
  dashboardView.classList.add("hidden");
  settingsView.classList.add("hidden");
  inventoryView.classList.add("hidden");

  if(currentMainView === "dashboard"){
    dashboardView.classList.remove("hidden");
  }else if(currentMainView === "settings"){
    settingsView.classList.remove("hidden");
  }else{
    inventoryView.classList.remove("hidden");
  }

  btnSettings.textContent = currentMainView === "settings" ? "⬅ Tableau de bord" : "⚙ Paramètres";
  btnInventory.textContent = currentMainView === "inventory" ? "⬅ Tableau de bord" : "Inventaire";
}
btnSettings.addEventListener("click", ()=>{
  currentMainView = currentMainView === "settings" ? "dashboard" : "settings";
  updateMainView();
});
btnInventory.addEventListener("click", ()=>{
  currentMainView = currentMainView === "inventory" ? "dashboard" : "inventory";
  if(currentMainView === "inventory") renderInventory();
  updateMainView();
});

/**********************
 * Budget
 **********************/
function computeTotals(){
  if(!currentData) return {depenses:0,dettes:0,solde:0};
  let depenses = 0;
  let dettes = 0;

  // Localité : dépenses directes ou dettes si achat à crédit
  ensureLocalite(currentData);
  if(currentData.localite && Number.isFinite(currentData.localite.prix)){
    const prixLocalite = currentData.localite.prix || 0;
    const montantPayeLocalite = Math.min(prixLocalite, Math.max(0, currentData.localite.montantPaye || 0));
    const restantLocalite = Math.max(0, prixLocalite - montantPayeLocalite);
    depenses += montantPayeLocalite;
    if(currentData.localite.modePaiement === "credit" && restantLocalite > 0){
      dettes += restantLocalite;
    }
  }

  (currentData.transactions||[]).forEach(t=>{
    if(t.impactBudget && t.montant>0 && t.type !== "paiement_localite" && t.type !== "remboursement_localite"){
      depenses += t.montant;
    }
  });

  (currentData.materiaux||[]).forEach(m=>{
    if(m.payeACredit){
      const restant = Math.max(0,(m.montantTotal||0)-(m.montantPaye||0));
      dettes += restant;
    }
  });

  const solde = Math.max(0,(currentData.budgetInitial||0)-depenses);
  return {depenses,dettes,solde};
}
function renderBudgetPasswordGuard(){
  if(!budgetPasswordField || !budgetPasswordInput || !budgetPasswordHint || !budgetPasswordNote) return;
  const requiresPassword = currentData && currentData.budgetInitialLocked;

  budgetPasswordField.classList.toggle("hidden", !requiresPassword);
  if(!requiresPassword){
    budgetPasswordInput.value = "";
  }
  budgetPasswordInput.placeholder = requiresPassword
    ? "Mot de passe administrateur requis"
    : "Non requis tant que le budget initial n’est pas enregistré";

  budgetPasswordHint.textContent = requiresPassword
    ? "Saisissez le mot de passe d’autorisation pour modifier le budget initial."
    : "Vous pourrez définir le budget initial sans mot de passe, puis toute modification exigera une autorisation.";

  budgetPasswordNote.textContent = requiresPassword
    ? "La modification du budget initial est protégée : confirmation par mot de passe obligatoire."
    : "Après l’enregistrement du budget initial, toute modification sera protégée par un mot de passe.";
}
function renderBudgetStats(){
  if(!currentData) return;
  if(isBudgetManagedByDonor()) lockBudgetFormToDonor();
  const totals = computeTotals();
  const budgetInitialFormatted = formatAmount(currentData.budgetInitial || 0);
  const depensesFormatted = formatAmount(totals.depenses);
  const soldeFormatted = formatAmount(totals.solde);
  const dettesFormatted = formatAmount(totals.dettes);
  const sarRate = getSarRate();

  statBudgetInitial.textContent = budgetInitialFormatted;
  statDepenses.textContent = depensesFormatted;
  statSolde.textContent = soldeFormatted;
  statDettes.textContent = dettesFormatted;
  if(statBudgetInitialSar){
    statBudgetInitialSar.textContent = sarRate
      ? formatSarAmountFromXof(currentData.budgetInitial || 0)
      : "Définir un taux SAR";
  }
  if(statSarRateNote){
    const updatedDate = currentUserData && currentUserData.sarRateUpdatedAt ? new Date(currentUserData.sarRateUpdatedAt) : null;
    const dateText = updatedDate && !isNaN(updatedDate.getTime()) ? updatedDate.toLocaleDateString("fr-FR") : null;
    statSarRateNote.textContent = dateText
      ? `${formatSarRateDescription()} · Mis à jour le ${dateText}`
      : formatSarRateDescription();
  }

  if(kpiBudgetInitial) kpiBudgetInitial.textContent = budgetInitialFormatted;
  if(kpiBudgetInitialSar) kpiBudgetInitialSar.textContent = sarRate
    ? formatSarAmountFromXof(currentData.budgetInitial || 0)
    : "Taux SAR à définir";
  if(sarRateChip){
    sarRateChip.textContent = formatSarRateDescription();
    sarRateChip.classList.toggle("pill-warning", !sarRate);
  }
  if(kpiDepenses) kpiDepenses.textContent = depensesFormatted;
  if(kpiSolde) kpiSolde.textContent = soldeFormatted;
  if(kpiDettes) kpiDettes.textContent = dettesFormatted;
  budgetInitialInput.value = currentData.budgetInitial || "";
  budgetNoteInput.value = currentData.budgetNote || "";
  renderBudgetPasswordGuard();
}
budgetForm.addEventListener("submit",async (e)=>{
  e.preventDefault();
  alert("Le budget est géré exclusivement depuis donateur.html. Modification directe désactivée.");
});

/**********************
 * Matériaux
 **********************/
function supprimerMateriau(id){
  if(!currentUser || !currentUserData || !currentData) return;
  if(!requireAdmin("La suppression de matériau")) return;
  if(currentData.verrouille){
    alert("Ce chantier est verrouillé. Impossible de modifier les matériaux.");
    return;
  }
  const idx = currentData.materiaux.findIndex(m=>m.id===id);
  if(idx===-1) return;
  const mat = currentData.materiaux[idx];
  if(!confirm(`Supprimer le matériau « ${mat.nom} » ?\nLes transactions déjà enregistrées ne seront pas supprimées.`)){
    return;
  }
  currentData.materiaux.splice(idx,1);
  saveUserData(currentUser,currentUserData);
  renderMateriaux();
  renderTransactions();
  renderBudgetStats();
  renderInventory();
  addLog(`Suppression du matériau « ${mat.nom} ».`);
}

function renderMateriaux(){
  materiauxList.innerHTML = "";
  if(materiauCategorieDatalist) materiauCategorieDatalist.innerHTML = "";
  if(materiauNomDatalist) materiauNomDatalist.innerHTML = "";

  const categoriesSet = new Set([...(BASE_MATERIAL_CATEGORIES || []), ...getCustomList("categories")]);
  const nomsSet = new Set([...(BASE_MATERIAL_NAMES || []), ...getCustomList("materiaux")]);

  if(!currentData || !currentData.materiaux.length){
    materiauxList.innerHTML = '<div class="hint">Aucun matériau enregistré pour le moment.</div>';
  }else{
    currentData.materiaux.forEach(m=>{
      if(m.categorie && m.categorie.trim()) categoriesSet.add(m.categorie.trim());
      if(m.nom && m.nom.trim()) nomsSet.add(m.nom.trim());

      const restant = m.payeACredit ? Math.max(0,(m.montantTotal||0)-(m.montantPaye||0)) : 0;
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <div class="item-main">
          <div class="item-title">${m.nom}</div>
          <div class="item-meta">
            Montant total : ${formatAmount(m.montantTotal||0)}
            ${
              m.payeACredit
                ? ` · <span class="chip chip-danger">À crédit – reste ${formatAmount(restant)}</span>`
                : ` · <span class="chip chip-accent">Payé comptant</span>`
            }
            <br>Quantité : ${m.quantite != null ? m.quantite : 1}
            · Catégorie / métier : ${m.categorie && m.categorie.trim() ? m.categorie.trim() : "Non renseigné"}
            <br>Date d’enregistrement : ${m.date || "—"}
          </div>
        </div>
        <div class="item-actions">
          ${m.payeACredit ? `<div class="chip chip-danger">Déjà payé : ${formatAmount(m.montantPaye||0)}</div>` : ""}
          <button type="button" class="btn btn-danger" data-id="${m.id}">Supprimer</button>
        </div>
      `;
      materiauxList.appendChild(row);
    });
  }

  if(materiauNomDatalist){
    const fragmentNames = document.createDocumentFragment();
    nomsSet.forEach(n=>{
      const opt = document.createElement("option");
      opt.value = n;
      fragmentNames.appendChild(opt);
    });
    materiauNomDatalist.appendChild(fragmentNames);
  }
  if(materiauCategorieDatalist){
    const fragmentCats = document.createDocumentFragment();
    categoriesSet.forEach(cat=>{
      const opt = document.createElement("option");
      opt.value = cat;
      fragmentCats.appendChild(opt);
    });
    materiauCategorieDatalist.appendChild(fragmentCats);
  }

  transactionMateriauSelect.innerHTML = '<option value="">Sélectionner un matériau à crédit…</option>';
  if(currentData){
    currentData.materiaux
      .filter(m=>m.payeACredit && Math.max(0,(m.montantTotal||0)-(m.montantPaye||0))>0)
      .forEach(m=>{
        const restant = Math.max(0,(m.montantTotal||0)-(m.montantPaye||0));
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.nom} – reste ${formatAmount(restant)}`;
        transactionMateriauSelect.appendChild(opt);
      });

    filterMateriauTransacSelect.innerHTML = '<option value="">Tous</option>';
    currentData.materiaux.forEach(m=>{
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.nom;
      filterMateriauTransacSelect.appendChild(opt);
    });
  }

  const delBtns = materiauxList.querySelectorAll(".btn-danger");
  delBtns.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id = btn.getAttribute("data-id");
      supprimerMateriau(id);
    });
  });
}

materiauForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  if(!currentUser || !currentUserData || !currentData) return;
  if(!requireAdmin("La création de matériaux")) return;
  if(currentData.verrouille){
    alert("Ce chantier est verrouillé. Impossible d’ajouter ou de modifier les matériaux.");
    return;
  }

  const nom = materiauNomInput.value.trim();
  const montant = parseFloat(materiauMontantInput.value);
  const mode = materiauCreditSelect.value;
  const date = materiauDateInput.value;
  let quantite = parseFloat(materiauQuantiteInput.value);
  const categorie = (materiauCategorieInput.value || "").trim();

  if(!nom || !Number.isFinite(montant) || montant<=0 || !mode || !date || !categorie){
    alert("Tous les champs du formulaire « Matériaux » sont obligatoires. Veuillez les renseigner.");
    return;
  }
  if(!Number.isFinite(quantite) || quantite<=0){
    alert("Veuillez saisir une quantité strictement positive.");
    return;
  }
  if(!isValidPastOrToday(date)){
    alert("La date de l’opération doit être valide et ne peut pas être dans le futur.");
    return;
  }

  const id = generateId();
  const payeACredit = (mode === "credit");
  const mat = {
    id,
    nom,
    montantTotal: montant,
    payeACredit,
    montantPaye: payeACredit ? 0 : montant,
    date,
    quantite,
    categorie
  };
  currentData.materiaux.push(mat);

  if(!payeACredit){
    currentData.transactions.push({
      id: generateId(),
      type: "paiement_materiau_comptant",
      cibleType: "materiau",
      cibleId: id,
      date,
      description: `Paiement comptant : ${nom}`,
      montant,
      impactBudget: true
    });
  }

  saveUserData(currentUser,currentUserData);
  materiauForm.reset();
  materiauDateInput.value = "";
  renderMateriaux();
  renderTransactions();
  renderBudgetStats();
  renderInventory();
  addLog(`Enregistrement du matériau « ${nom} ».`);
  alert("Matériau enregistré avec succès.");
});

/**********************
 * Ouvriers
 **********************/
function supprimerOuvrier(id){
  if(!currentUser || !currentUserData || !currentData) return;
  if(!requireAdmin("La suppression d’un ouvrier")) return;
  if(currentData.verrouille){
    alert("Ce chantier est verrouillé. Impossible de modifier les ouvriers.");
    return;
  }
  const idx = currentData.ouvriers.findIndex(o=>o.id===id);
  if(idx===-1) return;
  const o = currentData.ouvriers[idx];
  if(!confirm(`Supprimer l’ouvrier « ${o.nom} » ?\nLes transactions déjà enregistrées ne seront pas supprimées.`)){
    return;
  }
  currentData.ouvriers.splice(idx,1);
  saveUserData(currentUser,currentUserData);
  renderOuvriers();
  renderTransactions();
  renderBudgetStats();
  renderInventory();
  addLog(`Suppression de l’ouvrier « ${o.nom} ».`);
}

function renderOuvriers(){
  ouvriersList.innerHTML = "";
  filterMetierSelect.innerHTML = '<option value="">Tous les métiers</option>';
  if(ouvrierMetierDatalist) ouvrierMetierDatalist.innerHTML = "";

  const metiersSet = new Set([...(BASE_METIERS || []), ...getCustomList("metiers")]);

  if(!currentData){
    ouvriersList.innerHTML = '<div class="hint">Aucun ouvrier enregistré pour le moment.</div>';
  }else if(!currentData.ouvriers.length){
    ouvriersList.innerHTML = '<div class="hint">Aucun ouvrier enregistré pour le moment.</div>';
  }else{
    const filtreMetier = filterMetierSelect.value || "";
    currentData.ouvriers.forEach(o=>{
      if(o.metier && o.metier.trim()) metiersSet.add(o.metier.trim());
    });

    metiersSet.forEach(m=>{
      if(!m) return;
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      filterMetierSelect.appendChild(opt);
    });

    currentData.ouvriers
      .filter(o=>!filtreMetier || o.metier===filtreMetier)
      .forEach(o=>{
        const restant = Math.max(0,(o.montantConvenu||0)-(o.montantVerse||0));
        const row = document.createElement("div");
        row.className = "item-row";
        row.innerHTML = `
          <div class="item-main">
            <div class="item-title">${o.nom}${o.metier ? " – "+o.metier : ""}</div>
            <div class="item-meta">
              Montant convenu : ${formatAmount(o.montantConvenu||0)}
              · Versé : ${formatAmount(o.montantVerse||0)}
              · Reste : ${formatAmount(restant)}
              <br>Date de début : ${o.dateDebut || "—"}
            </div>
          </div>
          <div class="item-actions">
            <button type="button" class="btn btn-danger" data-id="${o.id}">Supprimer</button>
          </div>
        `;
        ouvriersList.appendChild(row);
      });
  }

  if(ouvrierMetierDatalist){
    const fragment = document.createDocumentFragment();
    metiersSet.forEach(m=>{
      const opt = document.createElement("option");
      opt.value = m;
      fragment.appendChild(opt);
    });
    ouvrierMetierDatalist.appendChild(fragment);
  }

  if(transactionOuvrierSelect){
    transactionOuvrierSelect.innerHTML = '<option value="">Sélectionner un ouvrier…</option>';
    currentData.ouvriers.forEach(o=>{
      const restant = Math.max(0,(o.montantConvenu||0)-(o.montantVerse||0));
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = `${o.nom}${o.metier ? " – " + o.metier : ""} (reste ${formatAmount(restant)})`;
      transactionOuvrierSelect.appendChild(opt);
    });
  }

  renderLocaliteTransactionSelect();

  filterOuvrierSelect.innerHTML = '<option value="">Tous</option>';
  currentData.ouvriers.forEach(o=>{
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = `${o.nom}${o.metier?" – "+o.metier:""}`;
    filterOuvrierSelect.appendChild(opt);
  });

  const delBtns = ouvriersList.querySelectorAll(".btn-danger");
  delBtns.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id = btn.getAttribute("data-id");
      supprimerOuvrier(id);
    });
  });
}

ouvrierForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  if(!currentUser || !currentUserData || !currentData) return;
  if(!requireAdmin("L’enregistrement d’un ouvrier")) return;
  if(currentData.verrouille){
    alert("Ce chantier est verrouillé. Impossible d’ajouter ou de modifier les ouvriers.");
    return;
  }

  const nom = ouvrierNomInput.value.trim();
  const metier = ouvrierMetierInput.value.trim();
  const montant = parseFloat(ouvrierMontantInput.value);
  const date = ouvrierDateInput.value;

  if(!nom || !metier || !Number.isFinite(montant) || montant<=0 || !date){
    alert("Tous les champs du formulaire « Ouvriers / manœuvres » sont obligatoires. Veuillez les renseigner.");
    return;
  }
  if(!isValidPastOrToday(date)){
    alert("La date de début doit être valide et ne peut pas être dans le futur.");
    return;
  }

  const id = generateId();
  const o = {
    id,
    nom,
    metier,
    montantConvenu: montant,
    montantVerse: 0,
    dateDebut: date
  };
  currentData.ouvriers.push(o);
  saveUserData(currentUser,currentUserData);
  ouvrierForm.reset();
  ouvrierDateInput.value = "";
  renderOuvriers();
  renderBudgetStats();
  renderInventory();
  addLog(`Ajout de l’ouvrier « ${nom} ».`);
  alert("Ouvrier ajouté avec succès.");
});

if(localiteForm){
  localiteForm.addEventListener("submit",(e)=>{
    e.preventDefault();
    if(!currentUser || !currentUserData || !currentData) return;
    if(!requireAdmin("La mise à jour de la localitAc")) return;
    ensureLocalite(currentData);
    const prevLocalite = { ...currentData.localite };
    currentData.localite.terrain = localiteTerrainInput.value.trim();
    currentData.localite.etendue = localiteEtendueSelect.value.trim();
    const sup = parseFloat(localiteSuperficieInput.value);
    currentData.localite.superficie = Number.isFinite(sup) ? sup : null;
    const prix = parseFloat(localitePrixInput.value);
    currentData.localite.prix = Number.isFinite(prix) ? prix : null;
    currentData.localite.modePaiement = localiteModeSelect ? localiteModeSelect.value : "";
    const dateAchat = localiteDateInput ? localiteDateInput.value : "";
    if(dateAchat && !isValidPastOrToday(dateAchat)){
      alert("La date de la localité doit être valide et ne pas être dans le futur.");
      return;
    }
    currentData.localite.dateAchat = dateAchat || currentData.localite.dateAchat || todayISO();
    const montantPayeForm = parseFloat(localiteMontantPayeInput ? localiteMontantPayeInput.value : "");
    if(currentData.localite.modePaiement !== "credit"){
      currentData.localite.montantPaye = currentData.localite.prix || 0;
    }else{
      const paye = Number.isFinite(montantPayeForm) ? montantPayeForm : (currentData.localite.montantPaye || 0);
      currentData.localite.montantPaye = Math.min(Math.max(0, paye), currentData.localite.prix || 0);
    }
    const prixActuel = currentData.localite.prix || 0;
    const prevPaye = Math.max(0, Math.min(prevLocalite.prix || 0, prevLocalite.montantPaye || 0));
    const nouveauPaye = Math.max(0, Math.min(prixActuel, currentData.localite.montantPaye || 0));
    const paiementAjoute = Math.max(0, nouveauPaye - prevPaye);
    if(paiementAjoute > 0){
      currentData.transactions.push({
        id: generateId(),
        type: "paiement_localite",
        date: todayISO(),
        montant: paiementAjoute,
        impactBudget: false,
        cibleType: "localite",
        cibleId: null,
        description: currentData.localite.modePaiement === "credit" ? "Versement pour la localité (crédit)" : "Paiement de la localité"
      });
    }
    saveUserData(currentUser,currentUserData);
    addLog("Localite mise a jour.");
    alert("Localite enregistree.");
    renderLocaliteTransactionSelect();
    renderLocalite();
    renderTransactions();
    renderBudgetStats();
    renderInventory();
  });
}

if(localiteModeSelect){
  localiteModeSelect.addEventListener("change", ()=>{
    toggleLocaliteMontantField();
  });
}

if(btnDeleteLocalite){
  btnDeleteLocalite.addEventListener("click",()=>{
    if(!currentUser || !currentUserData || !currentData) return;
    if(!requireAdmin("La suppression de la localité")) return;
    if(!confirm("Supprimer toutes les informations de la localité pour ce chantier ?")) return;
    currentData.localite = { terrain:"", etendue:"", superficie:null, prix:null, modePaiement:"", montantPaye:0, dateAchat:"" };
    saveUserData(currentUser,currentUserData);
    if(localiteForm) localiteForm.reset();
    clearLocaliteInputs();
    renderLocaliteTransactionSelect();
    renderLocalite();
    renderBudgetStats();
    renderInventory();
    addLog("Localit� supprim�e pour ce chantier.");
    alert("Localit� supprim�e.");
  });
}

if(editLocaliteBtn){
  editLocaliteBtn.addEventListener("click",()=>{
    if(!currentUser || !currentUserData || !currentData) return;
    // Basculer sur l'onglet localit� si besoin
    const tabBtn = Array.from(tabButtons || []).find(b=>b.getAttribute("data-tab")==="localite");
    if(tabBtn) tabBtn.click();
    renderLocalite();
    addLog("Préparation modification localité.");
  });
}

filterMetierSelect.addEventListener("change",()=>{ renderOuvriers(); });

/**********************
 * Transactions
 **********************/
if(btnEditTransaction){
  btnEditTransaction.addEventListener("click",()=>{
    if(!currentData || !currentData.transactions.length){
      alert("Aucune transaction à modifier.");
      return;
    }
    const id = transactionEditSelect ? transactionEditSelect.value : "";
    if(!id){
      alert("Sélectionnez la transaction à modifier.");
      return;
    }
    const t = currentData.transactions.find(x=>x.id===id);
    if(!t){
      alert("Transaction introuvable.");
      return;
    }
    transactionEditingId = id;
    transactionTypeSelect.value = t.type;
    transactionTypeSelect.dispatchEvent(new Event("change"));
    transactionMontantInput.value = t.montant || "";
    transactionDateInput.value = t.date || "";
    transactionNoteInput.value = t.description || "";
    if(t.type === "tranche_ouvrier" && transactionOuvrierSelect){
      transactionOuvrierSelect.value = t.cibleId || "";
    }else if(t.type === "remboursement_credit" && transactionMateriauSelect){
      transactionMateriauSelect.value = t.cibleId || "";
    }else if(t.type === "remboursement_localite" && transactionLocaliteSelect){
      transactionLocaliteSelect.value = t.cibleId || "";
    }
  });
}

transactionTypeSelect.addEventListener("change",()=>{
  const type = transactionTypeSelect.value;
  if(type === "tranche_ouvrier"){
    transactionOuvrierField.classList.remove("hidden");
    transactionMateriauField.classList.add("hidden");
    if(transactionLocaliteField) transactionLocaliteField.classList.add("hidden");
  }else if(type === "remboursement_credit"){
    transactionOuvrierField.classList.add("hidden");
    transactionMateriauField.classList.remove("hidden");
    if(transactionLocaliteField) transactionLocaliteField.classList.add("hidden");
  }else if(type === "remboursement_localite"){
    transactionOuvrierField.classList.add("hidden");
    transactionMateriauField.classList.add("hidden");
    if(transactionLocaliteField) transactionLocaliteField.classList.remove("hidden");
  }else{
    transactionOuvrierField.classList.add("hidden");
    transactionMateriauField.classList.add("hidden");
    if(transactionLocaliteField) transactionLocaliteField.classList.add("hidden");
  }
});

transactionForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  if(!currentUser || !currentUserData || !currentData) return;
  if(!requireAdmin("L’enregistrement d’une transaction")) return;
  if(currentData.verrouille){
    alert("Ce chantier est verrouillé. Impossible d’enregistrer des transactions.");
    return;
  }

  const isEditing = !!transactionEditingId;
  let originalTransaction = null;
  let revertedOriginal = false;

  function restoreOriginal(){
    if(revertedOriginal && originalTransaction){
      applyTransactionEffects(originalTransaction, 1);
      revertedOriginal = false;
    }
  }

  if(isEditing){
    const idx = currentData.transactions.findIndex(x=>x.id===transactionEditingId);
    if(idx === -1){
      alert("La transaction à modifier est introuvable.");
      transactionEditingId = null;
      return;
    }
    originalTransaction = currentData.transactions[idx];
    applyTransactionEffects(originalTransaction, -1);
    revertedOriginal = true;
  }

  const type = transactionTypeSelect.value;
  const montant = parseFloat(transactionMontantInput.value);
  const date = transactionDateInput.value;
  const note = transactionNoteInput.value.trim();

  if(!Number.isFinite(montant) || montant<=0 || !date){
    restoreOriginal();
    alert("Veuillez saisir un montant et une date de transaction valides.");
    return;
  }
  if(!isValidPastOrToday(date)){
    restoreOriginal();
    alert("La date de la transaction doit être valide et ne peut pas être dans le futur.");
    return;
  }

  const t = {
    id: generateId(),
    type,
    date,
    montant,
    impactBudget: true,
    cibleType: null,
    cibleId: null,
    description: ""
  };

  if(type === "tranche_ouvrier"){
    const ouvId = transactionOuvrierSelect.value;
    if(!ouvId){
      restoreOriginal();
      alert("Veuillez sélectionner un ouvrier.");
      return;
    }
    const o = currentData.ouvriers.find(x=>x.id===ouvId);
    if(!o){
      restoreOriginal();
      alert("Ouvrier introuvable.");
      return;
    }
    const restant = Math.max(0,(o.montantConvenu||0)-(o.montantVerse||0));
    if(montant > restant+0.0001){
      restoreOriginal();
      alert("Le montant dépasse le reste à payer pour cet ouvrier.");
      return;
    }
    t.cibleType = "ouvrier";
    t.cibleId = ouvId;
        t.description = note || ("Tranche versee a " + o.nom + (o.metier ? " ("+o.metier+")" : ""));
  }else if(type === "remboursement_credit"){
    const matId = transactionMateriauSelect.value;
    if(!matId){
      restoreOriginal();
      alert("Veuillez sélectionner un matériau à crédit.");
      return;
    }
    const m = currentData.materiaux.find(x=>x.id===matId && x.payeACredit);
    if(!m){
      restoreOriginal();
      alert("Matériau à crédit introuvable.");
      return;
    }
    const restant = Math.max(0,(m.montantTotal||0)-(m.montantPaye||0));
    if(montant > restant+0.0001){
      restoreOriginal();
      alert("Le montant dépasse la dette restante pour ce matériau.");
      return;
    }
    t.cibleType = "materiau_credit";
    t.cibleId = matId;
        t.description = note || ("Remboursement du materiau a credit : " + m.nom);
  }else if(type === "remboursement_localite"){
    ensureLocalite(currentData);
    if(!currentData.localite || currentData.localite.modePaiement !== "credit"){
      restoreOriginal();
      alert("Aucune localité achetée à crédit à rembourser.");
      return;
    }
    const locId = transactionLocaliteSelect ? transactionLocaliteSelect.value : "localite_unique";
    if(transactionLocaliteSelect && !locId){
      restoreOriginal();
      alert("Veuillez sélectionner la localité à rembourser.");
      return;
    }
    const restantLoc = Math.max(0, (currentData.localite.prix || 0) - (currentData.localite.montantPaye || 0));
    if(restantLoc <= 0){
      restoreOriginal();
      alert("Aucune dette restante pour la localité.");
      return;
    }
    if(montant > restantLoc+0.0001){
      restoreOriginal();
      alert("Le montant dépasse la dette restante pour la localité.");
      return;
    }
    t.cibleType = "localite_credit";
    t.cibleId = locId;
    const labelLoc = currentData.localite.terrain || currentData.localite.etendue || "Localité";
        t.description = note || ("Remboursement de la localité à crédit : " + labelLoc);
    t.impactBudget = false;
  }else if(type === "depense_imprevue"){
    t.cibleType = "imprevu";
    t.description = note || "Dépense imprévue";
  }else{
    t.cibleType = "autre";
    t.description = note || "Dépense diverse";
  }

  applyTransactionEffects(t, 1);

  if(isEditing){
    const idx = currentData.transactions.findIndex(x=>x.id===transactionEditingId);
    if(idx !== -1){
      currentData.transactions[idx] = Object.assign({}, t, { id: transactionEditingId });
    }else{
      currentData.transactions.push(Object.assign({}, t, { id: transactionEditingId }));
    }
  }else{
    currentData.transactions.push(t);
  }
  saveUserData(currentUser,currentUserData);
  transactionForm.reset();
  transactionDateInput.value = "";
  transactionTypeSelect.value = "tranche_ouvrier";
  transactionTypeSelect.dispatchEvent(new Event("change"));
  transactionEditingId = null;
  if(transactionEditSelect) transactionEditSelect.value = "";

  renderOuvriers();
  renderMateriaux();
  renderTransactions();
  renderImprevus();
  renderBudgetStats();
  renderInventory();
  addLog("Enregistrement d'une transaction de type " + t.type + ".");
  alert("Transaction enregistree avec succes.");
});

function renderImprevus(){
  if(!imprevusList || !imprevusTotalPill) return;
  const items = (!currentData ? [] : (currentData.transactions||[]).filter(t=>t.type === "depense_imprevue"));
  const total = items.reduce((sum,t)=> sum + (t.montant||0), 0);
  imprevusTotalPill.textContent = "Total imprevus : " + formatAmount(total);

  imprevusList.innerHTML = "";
  if(!items.length){
    imprevusList.innerHTML = '<div class="imprevu-empty">Aucune dépense imprévue enregistrée.</div>';
    return;
  }

  const sorted = items.slice().sort((a,b)=>{
    if(a.date === b.date) return 0;
    return a.date > b.date ? -1 : 1;
  });

  sorted.forEach(t=>{
    const div = document.createElement("div");
    div.className = "imprevu-item";
        div.innerHTML = "<div><div>" + (t.description || "Depense imprevue") + "</div><div class=\"imprevu-meta\">" + (t.date || "Date inconnue") + "</div></div><div class=\"imprevu-amount\">" + formatAmount(t.montant||0) + "</div>";
    imprevusList.appendChild(div);
  });
}
if(btnToggleImprevus){
  btnToggleImprevus.addEventListener("click", ()=>{
    if(!imprevusPanel) return;
    imprevusPanel.classList.toggle("hidden");
    const isHidden = imprevusPanel.classList.contains("hidden");
    btnToggleImprevus.textContent = isHidden ? "Dépenses imprévues" : "Masquer les imprévus";
    if(!isHidden) renderImprevus();
  });
}

/**********************
 * Historique + filtres
 **********************/
function applyTransactionFilters(list){
  const typeFilter = filterTypeSelect.value || "";
  const ouvFilter = filterOuvrierSelect.value || "";
  const matFilter = filterMateriauTransacSelect.value || "";
  const dateMin = filterDateMinInput.value || "";
  const dateMax = filterDateMaxInput.value || "";

  return list.filter(t=>{
    if(typeFilter && t.type !== typeFilter) return false;
    if(ouvFilter){
      if(t.cibleType !== "ouvrier" || t.cibleId !== ouvFilter) return false;
    }
    if(matFilter){
      if(!((t.cibleType==="materiau_credit" && t.cibleId===matFilter) ||
            (t.type==="paiement_materiau_comptant" && t.cibleId===matFilter))){
        return false;
      }
    }
    if(dateMin && t.date && t.date < dateMin) return false;
    if(dateMax && t.date && t.date > dateMax) return false;
    return true;
  });
}
function renderTransactions(){
  renderImprevus();
  transactionsTbody.innerHTML = "";
  if(!currentData || !currentData.transactions.length){
    transactionsTbody.innerHTML =
      '<tr><td colspan="4" style="font-size:11px;color:#9ca3af;padding:6px 4px;">Aucune transaction enregistrée pour le moment.</td></tr>';
    transactionsCountChip.textContent = "0 opération enregistrée";
    if(transactionEditSelect) transactionEditSelect.innerHTML = '<option value="">Sélectionner une transaction</option>';
    return;
  }

  const sorted = currentData.transactions.slice().sort((a,b)=>{
    if(a.date===b.date) return 0;
    return a.date > b.date ? -1 : 1;
  });
  const filtered = applyTransactionFilters(sorted);

  filtered.forEach(t=>{
    let label;
    switch(t.type){
      case "tranche_ouvrier": label="Tranche ouvrier"; break;
      case "remboursement_credit": label="Remboursement crédit"; break;
      case "paiement_materiau_comptant": label="Matériau comptant"; break;
      case "paiement_localite": label="Paiement localité"; break;
      case "remboursement_localite": label="Remboursement localité"; break;
      case "depense_imprevue": label="Dépense imprévue"; break;
      default: label="Dépense diverse";
    }
    const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (t.date || "-") + "</td><td>" + label + "</td><td>" + (t.description || "-") + "</td><td class=\"amount\">" + formatAmount(t.montant||0) + "</td>";
    transactionsTbody.appendChild(tr);
  });

  transactionsCountChip.textContent = filtered.length + " operation" + (filtered.length>1?"s":"") + " affichee" + (filtered.length>1?"s":"");

  if(transactionEditSelect){
    transactionEditSelect.innerHTML = '<option value="">Sélectionner une transaction</option>';
    sorted.forEach(t=>{
      const label = (t.date || "-") + " · " + (t.description || t.type);
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = label;
      transactionEditSelect.appendChild(opt);
    });
  }
}
btnClearFilters.addEventListener("click",()=>{
  filterTypeSelect.value = "";
  filterOuvrierSelect.value = "";
  filterMateriauTransacSelect.value = "";
  filterDateMinInput.value = "";
  filterDateMaxInput.value = "";
  renderTransactions();
});
[filterTypeSelect,filterOuvrierSelect,filterMateriauTransacSelect,
 filterDateMinInput,filterDateMaxInput]
  .forEach(el => el.addEventListener("change", renderTransactions));

/**********************
 * Inventaire
 **********************/
function renderInventory(){
  if(!invTotalMatSpan || !invTotalOuvSpan || !invTotalGlobalSpan || !invMatTbody || !invOuvTbody) return;

  if(!currentData){
    invTotalMatSpan.textContent = "0 FCFA";
    invTotalOuvSpan.textContent = "0 FCFA";
    invTotalGlobalSpan.textContent = "0 FCFA";
    invMatTbody.innerHTML = "";
    invOuvTbody.innerHTML = "";
    return;
  }

  const materiaux = Array.isArray(currentData.materiaux) ? currentData.materiaux : [];
  const ouvriers = Array.isArray(currentData.ouvriers) ? currentData.ouvriers : [];

  const totalMat = materiaux.reduce((sum,m)=> sum + (m.montantTotal || 0), 0);
  const totalOuv = ouvriers.reduce((sum,o)=> sum + (o.montantVerse || 0), 0);
  const totalGlobal = totalMat + totalOuv;

  invTotalMatSpan.textContent = formatAmount(totalMat) + " FCFA";
  invTotalOuvSpan.textContent = formatAmount(totalOuv) + " FCFA";
  invTotalGlobalSpan.textContent = formatAmount(totalGlobal) + " FCFA";

  invMatTbody.innerHTML = "";
  if(!materiaux.length){
    invMatTbody.innerHTML = '<tr><td colspan="4">Aucun mat&eacute;riel enregistr&eacute;.</td></tr>';
  }else{
    materiaux.forEach(m=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.categorie || "Divers"}</td>
        <td>${m.nom || "Sans nom"}</td>
        <td>${Number.isFinite(m.quantite) ? m.quantite : "-"}</td>
        <td class="amount">${formatAmount(m.montantTotal || 0)}</td>
      `;
      invMatTbody.appendChild(tr);
    });
  }

  invOuvTbody.innerHTML = "";
  if(!ouvriers.length){
    invOuvTbody.innerHTML = '<tr><td colspan="4">Aucun ouvrier enregistr&eacute;.</td></tr>';
  }else{
    ouvriers.forEach(o=>{
      const restant = Math.max(0, (o.montantConvenu || 0) - (o.montantVerse || 0));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${o.metier || "M&eacute;tier non pr&eacute;cis&eacute;"}</td>
        <td>${o.nom || "Ouvrier"}</td>
        <td>${formatAmount(o.montantVerse || 0)}</td>
        <td class="amount">${formatAmount(restant)}</td>
      `;
      invOuvTbody.appendChild(tr);
    });
  }
}

/**********************
 * Onglets
 **********************/
tabButtons.forEach(btn=>{
  btn.addEventListener("click",()=>{
    const target = btn.getAttribute("data-tab");
    tabButtons.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    if(target==="materiaux"){
      tabMateriauxPanel.classList.remove("hidden");
      tabOuvriersPanel.classList.add("hidden");
      tabLocalitePanel.classList.add("hidden");
    }else if(target==="ouvriers"){
      tabMateriauxPanel.classList.add("hidden");
      tabOuvriersPanel.classList.remove("hidden");
      tabLocalitePanel.classList.add("hidden");
    }else if(target==="localite"){
      tabMateriauxPanel.classList.add("hidden");
      tabOuvriersPanel.classList.add("hidden");
      tabLocalitePanel.classList.remove("hidden");
    }
  });
});

/**********************
 * Export PDF chantier actif
 **********************/
btnExportPDF.addEventListener("click", ()=>{
  if(!currentData){
    alert("Aucune donnee a exporter pour ce chantier.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const totals = computeTotals();
  let y = 10;
  doc.setFont("helvetica","bold");
  doc.setFontSize(14);
  doc.text("Rapport de chantier", 10, y); y+=8;
  doc.setFontSize(11);
  doc.setFont("helvetica","normal");
  doc.text("Utilisateur : " + (currentUser || "-"), 10, y); y+=6;
  doc.text("Chantier : " + (currentData.nom || "-"), 10, y); y+=6;
  doc.text("Budget initial : " + formatAmount(currentData.budgetInitial||0), 10, y); y+=6;
  doc.text("Depenses : " + formatAmount(totals.depenses), 10, y); y+=6;
  doc.text("Solde disponible : " + formatAmount(totals.solde), 10, y); y+=6;
  doc.text("Dettes fournisseurs : " + formatAmount(totals.dettes), 10, y); y+=10;
  doc.setFont("helvetica","bold");
  doc.text("Transactions (resume)", 10, y); y+=6;
  doc.setFont("helvetica","normal");
  doc.save("chantier.pdf");
  addLog("Export PDF du chantier actif.");
});

function exportCurrentChantierAsCSV(){
  if(!currentData) return;
  const lines = [];
  lines.push("Section;Champ;Valeur");
  lines.push(`Chantier;Nom;${(currentData.nom||"").replace(/;/g,",")}`);
  lines.push(`Chantier;Budget initial;${currentData.budgetInitial||0}`);
  const totals = computeTotals();
  lines.push(`Chantier;Solde;${totals.solde}`);
  lines.push(";;");
  lines.push("Matériaux;Nom;Montant;Quantité;Date;Catégorie;Payé à crédit;Payé");
  (currentData.materiaux||[]).forEach(m=>{
    lines.push([
      "Matériaux",
      (m.nom||"").replace(/;/g,","),
      m.montantTotal||0,
      m.quantite||0,
      m.date||"",
      (m.categorie||"").replace(/;/g,","),
      m.payeACredit ? "oui" : "non",
      m.montantPaye||0
    ].join(";"));
  });
  lines.push(";;");
  lines.push("Ouvriers;Nom;Métier;Montant convenu;Versé;Reste;Date début");
  (currentData.ouvriers||[]).forEach(o=>{
    const restant = Math.max(0,(o.montantConvenu||0)-(o.montantVerse||0));
    lines.push([
      "Ouvriers",
      (o.nom||"").replace(/;/g,","),
      (o.metier||"").replace(/;/g,","),
      o.montantConvenu||0,
      o.montantVerse||0,
      restant,
      o.dateDebut||""
    ].join(";"));
  });
  lines.push(";;");
  lines.push("Transactions;Date;Type;Description;Montant");
  (currentData.transactions||[]).forEach(t=>{
    lines.push([
      "Transactions",
      t.date||"",
      t.type||"",
      (t.description||"").replace(/;/g,","),
      t.montant||0
    ].join(";"));
  });
  const csv = lines.join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (currentData.nom || "chantier") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function findOuvrierById(id){
  if(!currentData || !Array.isArray(currentData.ouvriers)) return null;
  return currentData.ouvriers.find(o=>o.id===id) || null;
}

function findMateriauById(id){
  if(!currentData || !Array.isArray(currentData.materiaux)) return null;
  return currentData.materiaux.find(m=>m.id===id) || null;
}

function findLocaliteById(id){
  if(!currentData) return null;
  if(id === "localite_unique"){ ensureLocalite(currentData); return currentData.localite; }
  if(currentData.localites && Array.isArray(currentData.localites)){
    return currentData.localites.find(l=>l.id===id) || null;
  }
  return null;
}

function exportCurrentChantierAsExcel(){
  if(!currentData){
    alert("Aucune donnée à exporter.");
    return;
  }
  if(!window.XLSX){
    alert("La bibliothèque Excel n'est pas disponible.");
    return;
  }

  const wb = XLSX.utils.book_new();
  const totals = computeTotals();
  const rateDescription = formatSarRateDescription();
  const sarLastUpdate = currentUserData && currentUserData.sarRateUpdatedAt
    ? new Date(currentUserData.sarRateUpdatedAt).toLocaleString("fr-FR")
    : "";

  const overview = [
    ["Utilisateur", currentUser || ""],
    ["Chantier", currentData.nom || "Chantier"],
    ["Budget initial (FCFA)", currentData.budgetInitial || 0],
    ["Budget initial (SAR)", formatSarAmountFromXof(currentData.budgetInitial || 0)],
    ["Note budget", currentData.budgetNote || ""],
    ["Dépenses payées", totals.depenses],
    ["Solde disponible", totals.solde],
    ["Dettes fournisseurs", totals.dettes],
    ["Taux SAR", rateDescription],
    ["Dernière mise à jour du taux", sarLastUpdate]
  ];

  if(currentData.localite){
    overview.push(["Localité - terrain", currentData.localite.terrain || ""]);
    overview.push(["Localité - étendue", currentData.localite.etendue || ""]);
    overview.push(["Localité - superficie", currentData.localite.superficie || ""]);
    overview.push(["Localité - prix", currentData.localite.prix || ""]);
    overview.push(["Localité - mode paiement", currentData.localite.modePaiement || ""]);
    overview.push(["Localité - montant payé", currentData.localite.montantPaye || ""]);
    overview.push(["Localité - date achat", currentData.localite.dateAchat || ""]);
  }

  const overviewSheet = XLSX.utils.aoa_to_sheet(overview);
  XLSX.utils.book_append_sheet(wb, overviewSheet, "Synthèse");

  const materiauxAoA = [
    ["Nom", "Montant total (FCFA)", "Quantité", "Catégorie", "Date", "Paiement", "Montant payé"]
  ];
  (currentData.materiaux || []).forEach(m=>{
    materiauxAoA.push([
      m.nom || "",
      m.montantTotal || 0,
      m.quantite || 0,
      m.categorie || "",
      m.date || "",
      m.payeACredit ? "Crédit" : "Comptant",
      m.montantPaye || 0
    ]);
  });
  const materiauxSheet = XLSX.utils.aoa_to_sheet(materiauxAoA);
  XLSX.utils.book_append_sheet(wb, materiauxSheet, "Matériaux");

  const ouvriersAoA = [["Nom", "Métier", "Montant convenu", "Montant versé", "Reste à payer", "Date début"]];
  (currentData.ouvriers || []).forEach(o=>{
    const restant = Math.max(0, (o.montantConvenu || 0) - (o.montantVerse || 0));
    ouvriersAoA.push([
      o.nom || "",
      o.metier || "",
      o.montantConvenu || 0,
      o.montantVerse || 0,
      restant,
      o.dateDebut || ""
    ]);
  });
  const ouvriersSheet = XLSX.utils.aoa_to_sheet(ouvriersAoA);
  XLSX.utils.book_append_sheet(wb, ouvriersSheet, "Ouvriers");

  const transactionsAoA = [["Date", "Type", "Description", "Montant", "Ouvrier", "Matériau", "Localité"]];
  (currentData.transactions || []).forEach(t=>{
    transactionsAoA.push([
      t.date || "",
      t.type || "",
      t.description || "",
      t.montant || 0,
      t.ouvrierId ? findOuvrierById(t.ouvrierId)?.nom || "" : "",
      t.materiauId ? findMateriauById(t.materiauId)?.nom || "" : "",
      t.localiteId ? findLocaliteById(t.localiteId)?.terrain || "" : ""
    ]);
  });
  const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsAoA);
  XLSX.utils.book_append_sheet(wb, transactionsSheet, "Transactions");

  const fileName = (currentData.nom || "chantier") + "_export.xlsx";
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

if(btnExportExcel){
  btnExportExcel.addEventListener("click", ()=>{
    exportCurrentChantierAsExcel();
    addLog("Export Excel structuré du chantier actif.");
  });
}

if(btnExportAllPDF){
  btnExportAllPDF.addEventListener("click",()=> alert("Export PDF global indisponible dans cette version."));
}
if(btnExportAllZIP){
  btnExportAllZIP.addEventListener("click",()=> alert("Export ZIP global indisponible dans cette version."));
}
function getAllKnownUsernames(){
  const names = new Set();
  try{
    loadUsers().forEach(u=>{ if(u && u.username) names.add(u.username); });
  }catch(e){}
  try{
    const idxRaw = safeGetItem(LS_DATA_INDEX_KEY);
    if(idxRaw){
      const parsed = JSON.parse(idxRaw);
      if(Array.isArray(parsed)) parsed.forEach(n=>{ if(n) names.add(n); });
    }
  }catch(e){}
  return Array.from(names);
}
function buildFullBackupPayload(){
  const usernames = getAllKnownUsernames();
  const dataByUser = {};
  usernames.forEach(name=>{
    const primary = safeGetItem(LS_DATA_PREFIX + name);
    const backup = safeGetItem(LS_DATA_BACKUP_PREFIX + name);
    if(primary || backup){
      dataByUser[name] = { primary, backup };
    }
  });
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    usersRaw: safeGetItem(LS_USERS_KEY),
    usersBackupRaw: safeGetItem(LS_USERS_BACKUP_KEY),
    registerGuardHash: safeGetItem(LS_REGISTER_GUARD_KEY),
    currentUser: getCurrentUsername(),
    snapshotRaw: safeGetItem(LS_SNAPSHOT_KEY),
    dataByUser
  };
}
function triggerDownload(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
async function exportBackupToFile(){
  try{
    const payload = buildFullBackupPayload();
    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type:"application/json" });
    const defaultName = "chantier-backup-" + todayISO() + ".json";
    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types:[{ description:"Sauvegarde chantier", accept:{"application/json":[".json"]}}]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        alert("Sauvegarde enregistrée. Placez le fichier dans un dossier OneDrive pour synchroniser.");
        return;
      }catch(err){
        console.warn("Enregistrement via File System Access annulé ou impossible", err);
      }
    }
    triggerDownload(blob, defaultName);
    alert("Sauvegarde téléchargée. Déplacez le fichier dans OneDrive pour le synchroniser.");
  }catch(err){
    console.error("Erreur export backup", err);
    alert("Impossible de créer la sauvegarde : " + err.message);
  }
}
function pickFileFallback(){
  return new Promise((resolve, reject)=>{
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.style.display = "none";
    input.addEventListener("change", ()=>{
      const file = input.files && input.files[0];
      if(!file){
        reject(new Error("Aucun fichier sélectionné"));
        return;
      }
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = ()=> reject(new Error("Lecture du fichier impossible"));
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
  });
}
async function pickBackupFileText(){
  if(window.showOpenFilePicker){
    const [handle] = await window.showOpenFilePicker({
      types:[{description:"Sauvegarde chantier", accept:{"application/json":[".json"]}}]
    });
    const file = await handle.getFile();
    return await file.text();
  }
  return pickFileFallback();
}
async function importBackupFromFile(){
  try{
    const text = await pickBackupFileText();
    if(!text) return;
    const payload = JSON.parse(text);
    if(!payload || typeof payload !== "object" || payload.version !== "1.0"){
      alert("Fichier de sauvegarde invalide ou version non reconnue.");
      return;
    }
    if(payload.usersRaw) safeSetItem(LS_USERS_KEY, payload.usersRaw);
    if(payload.usersBackupRaw) safeSetItem(LS_USERS_BACKUP_KEY, payload.usersBackupRaw);
    if(payload.registerGuardHash) safeSetItem(LS_REGISTER_GUARD_KEY, payload.registerGuardHash);
    const usernames = Object.keys(payload.dataByUser || {});
    if(usernames.length){
      usernames.forEach(name=>{
        const rec = payload.dataByUser[name];
        if(rec && rec.primary) safeSetItem(LS_DATA_PREFIX + name, rec.primary);
        if(rec && rec.backup) safeSetItem(LS_DATA_BACKUP_PREFIX + name, rec.backup);
      });
      safeSetItem(LS_DATA_INDEX_KEY, JSON.stringify(usernames));
    }
    if(payload.snapshotRaw) safeSetItem(LS_SNAPSHOT_KEY, payload.snapshotRaw);
    if(payload.currentUser){
      setCurrentUsername(payload.currentUser);
    }
    alert("Sauvegarde importée. L'application va se recharger pour appliquer les données.");
    window.location.reload();
  }catch(err){
    console.error("Erreur import backup", err);
    alert("Impossible d'importer la sauvegarde : " + err.message);
  }
}
if(btnExportBackupJSON){
  btnExportBackupJSON.addEventListener("click", exportBackupToFile);
}
if(btnImportBackupJSON){
  btnImportBackupJSON.addEventListener("click", importBackupFromFile);
}

/**********************
 * Rendu global
 **********************/
function ensureLocalite(data){
  if(!data.localite){
    data.localite = { terrain:"", etendue:"", superficie:null, prix:null, modePaiement:"", montantPaye:0, dateAchat:"" };
  }else{
    if(typeof data.localite.terrain === "undefined") data.localite.terrain = "";
    if(typeof data.localite.etendue === "undefined") data.localite.etendue = "";
    if(typeof data.localite.superficie === "undefined") data.localite.superficie = null;
    if(typeof data.localite.prix === "undefined") data.localite.prix = null;
    if(typeof data.localite.modePaiement === "undefined") data.localite.modePaiement = "";
    if(typeof data.localite.montantPaye === "undefined") data.localite.montantPaye = 0;
    if(typeof data.localite.dateAchat === "undefined") data.localite.dateAchat = "";
  }
}

function renderLocaliteTransactionSelect(){
  if(!transactionLocaliteSelect) return;
  if(!currentData){
    transactionLocaliteSelect.innerHTML = '<option value="">Sélectionner une localité à crédit</option>';
    return;
  }
  ensureLocalite(currentData);
  transactionLocaliteSelect.innerHTML = '<option value="">Sélectionner une localité à crédit</option>';
  if(currentData.localite && currentData.localite.modePaiement === "credit" && Number.isFinite(currentData.localite.prix)){
    const restantLoc = Math.max(0,(currentData.localite.prix||0)-(currentData.localite.montantPaye||0));
    const opt = document.createElement("option");
    opt.value = "localite_unique";
    const label = (currentData.localite.terrain || currentData.localite.etendue || "Localité") + " (reste " + formatAmount(restantLoc) + ")";
    opt.textContent = label;
    transactionLocaliteSelect.appendChild(opt);
  }
}

function toggleLocaliteMontantField(){
  const isCredit = localiteModeSelect && localiteModeSelect.value === "credit";
  if(localiteMontantField){
    localiteMontantField.classList.toggle("hidden", !isCredit);
  }
  if(localiteMontantPayeInput){
    localiteMontantPayeInput.disabled = !isCredit;
    if(!isCredit){
      localiteMontantPayeInput.value = "";
    }
  }
}

function applyTransactionEffects(t, direction){
  if(!currentData || !t) return;
  const dir = direction >= 0 ? 1 : -1;
  const amount = t.montant || 0;
  switch(t.type){
    case "tranche_ouvrier":{
      const o = currentData.ouvriers.find(x=>x.id===t.cibleId);
      if(o){
        o.montantVerse = clampNumber((o.montantVerse||0) + dir*amount, 0, o.montantConvenu || 0);
      }
      break;
    }
    case "remboursement_credit":{
      const m = currentData.materiaux.find(x=>x.id===t.cibleId);
      if(m){
        m.montantPaye = clampNumber((m.montantPaye||0) + dir*amount, 0, m.montantTotal || 0);
      }
      break;
    }
    case "remboursement_localite":
    case "paiement_localite":{
      ensureLocalite(currentData);
      const prix = currentData.localite.prix || 0;
      currentData.localite.montantPaye = clampNumber((currentData.localite.montantPaye||0) + dir*amount, 0, prix);
      break;
    }
    default:
      break;
  }
}

function clearLocaliteInputs(){
  if(localiteTerrainInput) localiteTerrainInput.value = "";
  if(localiteEtendueSelect) localiteEtendueSelect.value = "";
  if(localiteSuperficieInput) localiteSuperficieInput.value = "";
  if(localitePrixInput) localitePrixInput.value = "";
  if(localiteMontantPayeInput) localiteMontantPayeInput.value = "";
  if(localiteModeSelect) localiteModeSelect.value = "";
  if(localiteDateInput) localiteDateInput.value = "";
}

function fillLocaliteFormFromData(){
  if(!currentData) return;
  ensureLocalite(currentData);
  if(localiteTerrainInput) localiteTerrainInput.value = currentData.localite.terrain || "";
  if(localiteSuperficieInput) localiteSuperficieInput.value = currentData.localite.superficie ?? "";
  if(localitePrixInput) localitePrixInput.value = currentData.localite.prix ?? "";
  if(localiteMontantPayeInput) localiteMontantPayeInput.value = currentData.localite.montantPaye ?? "";
  if(localiteModeSelect) localiteModeSelect.value = currentData.localite.modePaiement || "";
  if(localiteDateInput) localiteDateInput.value = currentData.localite.dateAchat || "";
  if(localiteEtendueSelect){
    localiteEtendueSelect.value = currentData.localite.etendue || "";
  }
  toggleLocaliteMontantField();
}

function renderLocalite(){
  if(!currentData) return;
  ensureLocalite(currentData);
  if(localiteEtendueSelect){
    localiteEtendueSelect.innerHTML = "";
    let matchedEtendue = false;
    BASE_LOCALITE_ETENDUE.forEach(opt=>{
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if(currentData.localite.etendue === opt) o.selected = true;
      if(currentData.localite.etendue === opt) matchedEtendue = true;
      localiteEtendueSelect.appendChild(o);
    });
    // If a custom value was previously stored, keep it selectable
    if(currentData.localite.etendue && !matchedEtendue){
      const o = document.createElement("option");
      o.value = currentData.localite.etendue;
      o.textContent = currentData.localite.etendue;
      o.selected = true;
      localiteEtendueSelect.appendChild(o);
    }
  }
  fillLocaliteFormFromData();
  renderLocaliteTransactionSelect();
}

function renderAll(){
  if(!currentData) return;
  renderBudgetStats();
  renderMateriaux();
  renderOuvriers();
  renderLocalite();
  renderTransactions();
  transactionTypeSelect.dispatchEvent(new Event("change"));
  renderChantiersUI();
  renderInventory();
  renderLogs();
}

/**********************
 * Initialisation
 **********************/
(async function init(){
  await restoreFromIndexedDB();
  materiauDateInput.value = "";
  ouvrierDateInput.value = "";
  transactionDateInput.value = "";

  autoCorrectInput(materiauNomInput, CORRECTIONS_MATERIAUX);
  autoCorrectInput(materiauCategorieInput, CORRECTIONS_CATEGORIES);
  autoCorrectInput(ouvrierMetierInput, CORRECTIONS_METIERS);

  const username = getCurrentUsername();
  if(username){
    currentUser = username;
    currentUserData = loadUserData(username);
    const record = getCurrentUserRecord();
    currentUserRole = (record && record.role) ? record.role : (currentUserData.role || ROLE_ADMIN);
    currentUserData.role = currentUserRole;
    ensureAtLeastOneChantier();
    currentData = currentUserData.chantiers[currentUserData.chantierActif];
    saveUserData(currentUser,currentUserData);
    showApp();
  }else{
    // Tentative de restauration via snapshot local
    try{
      const snapshotRaw = safeGetItem(LS_SNAPSHOT_KEY);
      if(snapshotRaw){
        const snap = JSON.parse(snapshotRaw);
        if(snap && snap.user && snap.data){
          currentUser = snap.user;
          currentUserData = snap.data;
          currentUserRole = snap.role || ROLE_ADMIN;
          setCurrentUsername(currentUser);
          ensureAtLeastOneChantier();
          currentData = currentUserData.chantiers[currentUserData.chantierActif];
          saveUserData(currentUser,currentUserData);
          showApp();
        }else{
          showAuth();
        }
      }else{
        showAuth();
      }
    }catch(err){
      console.error("Erreur restauration snapshot", err);
      showAuth();
    }
  }
  setAuthMode("login");
  currentMainView = "dashboard";
  updateMainView();
  setupPasswordToggle(authPasswordInput, togglePasswordBtn);
  setupPasswordToggle(authPasswordConfirmInput, togglePasswordConfirmBtn);
})();

























