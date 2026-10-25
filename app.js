import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import * as f3 from "https://unpkg.com/family-chart@0.9.0/dist/family-chart.esm.js";

window.onerror = (msg, src, line, col, err) => {
  const s = document.createElement('div');
  s.style.cssText = 'position:fixed;top:60px;left:10px;right:10px;background:#400;color:#f88;padding:8px;z-index:9999;font:12px monospace;';
  s.textContent = 'JS error: ' + msg + ' @' + line;
  document.body.appendChild(s);
};

const firebaseConfig = {
  apiKey: "AIzaSyDgvTQ9Zzhnaf_uIQGbtRuRHPuBaVvTWXE",
  authDomain: "read-family-tree.firebaseapp.com",
  projectId: "read-family-tree",
  storageBucket: "read-family-tree.firebasestorage.app",
  messagingSenderId: "334577026946",
  appId: "1:334577026946:web:0d0ef647a044f81e50b19b",
  measurementId: "G-KPZEZHQKP1"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

const loginOverlay = document.getElementById('login-overlay');
const appEl = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginOverlay.style.display = 'none';
    appEl.style.display = 'block';
    document.getElementById('user-email').textContent = user.email;
    initTree();
  } else {
    loginOverlay.style.display = 'flex';
    appEl.style.display = 'none';
  }
});

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  authError.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
  } catch (err) { authError.textContent = err.message; }
};
document.getElementById('signup-btn').onclick = async () => {
  authError.textContent = '';
  try {
    await createUserWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
  } catch (err) { authError.textContent = err.message; }
};
document.getElementById('logout-btn').onclick = () => signOut(auth);

let treeInitialised = false;

function initTree() {
  if (treeInitialised) return;
  treeInitialised = true;

  const status = document.createElement('div');
  status.id = 'chart-status';
  status.style.cssText = 'position:fixed;bottom:30px;left:10px;background:#222;color:#0f0;padding:6px 10px;z-index:200;font-size:12px;';
  status.textContent = 'initTree started';
  document.body.appendChild(status);

  const SEED = [
    { id: 'charles', name: 'Charles Francis Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'COPD and asthma', gender: 'M', parentIds: [], spouseIds: [{ id: 'charles-prev', married: false }, { id: 'judy', married: true }] },
    { id: 'judy', name: 'Judy Anne Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'Dementia (onset)', gender: 'F', parentIds: [], spouseIds: [{ id: 'charles', married: true }] },
    { id: 'charles-prev', name: 'Previous partner', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: [], spouseIds: [{ id: 'charles', married: false }] },
    { id: 'edward', name: 'Edward Read', dob: '~1931', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles', 'charles-prev'], spouseIds: [] },
    { id: 'mark', name: 'Mark Francis Read', dob: '1963-07', birthLoc: 'Australia', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles', 'judy'], spouseIds: [{ id: 'merna', married: true }] },
    { id: 'merna', name: 'Merna Helena Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: [], spouseIds: [{ id: 'mark', married: true }] },
    { id: 'donald', name: 'Donald Utton', dob: '', birthLoc: 'UK?', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles', 'charles-prev'], spouseIds: [] },
    { id: 'vanessa', name: 'Vanessa Anne Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: ['charles', 'judy'], spouseIds: [] },
    { id: 'matthew', name: 'Matthew Mark Read', dob: '~1993', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] },
    { id: 'mitchell', name: 'Mitchell John Read', dob: '~1994', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] },
    { id: 'michael', name: 'Michael Luke Read', dob: '~1999', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] }
  ];

  let people = JSON.parse(localStorage.getItem('familyTree') || 'null') || [{ id: 'me', name: 'Me', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: [], spouseIds: [] }];
  people.forEach(p => { if (!p.spouseIds) p.spouseIds = []; });

  // Fix half-siblings: if Don/Ed only list Charles, attach them to a previous partner
  if (!people.find(p => p.id === 'charles-prev')) {
    people.push({ id: 'charles-prev', name: 'Previous partner', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: [], spouseIds: [{ id: 'charles', married: false }] });
  }
  people.forEach(p => {
    if ((p.id === 'edward' || p.id === 'donald') && (!p.parentIds || p.parentIds.length < 2)) {
      p.parentIds = ['charles', 'charles-prev'];
    }
  });
  const charles = people.find(p => p.id === 'charles');
  if (charles && !charles.spouseIds.find(s => s.id === 'charles-prev')) {
    charles.spouseIds.unshift({ id: 'charles-prev', married: false });
  }


  function toF3(people) {
    return people.map(p => {
      const parts = (p.name || '').trim().split(/\s+/);
      const first = parts.slice(0, -1).join(' ') || parts[0] || '';
      const last = parts.length > 1 ? parts[parts.length - 1] : '';
      const spouses = (p.spouseIds || []).map(s => s.id);
      const children = people.filter(c => (c.parentIds || []).includes(p.id)).map(c => c.id);
      return {
        id: p.id,
        data: {
          "first name": first,
          "last name": last,
          birthday: p.dob || '',
          gender: p.gender || '',
          "death date": p.dod || '',
          "death reason": p.deathReason || '',
          "married surname": p.marriedSurname || ''
        },
        rels: {
          spouses,
          children,
          parents: p.parentIds || []
        }
      };
    });
  }

  function fromF3(f3Data) {
    if (!Array.isArray(f3Data)) return people;
    return f3Data.map(d => {
      if (!d || !d.data) return null;
      const name = [d.data["first name"], d.data["last name"]].filter(Boolean).join(' ');
      const rels = d.rels || {};
      const spouseIds = (rels.spouses || []).map(id => ({ id, married: true }));
      return {
        id: d.id,
        name,
        dob: d.data.birthday || '',
        dod: d.data["death date"] || '',
        deathReason: d.data["death reason"] || '',
        marriedSurname: d.data["married surname"] || '',
        gender: d.data.gender || '',
        parentIds: rels.parents || [],
        spouseIds,
        birthLoc: '',
        deathLoc: ''
      };
    }).filter(Boolean);
  }

  const data = toF3(people);
  status.textContent = 'Data ready (' + data.length + ')';
  const meId = sessionStorage.getItem('meId') || 'mark';

  let f3Chart;
  try {
    const validMain = data.find(d => d.id === meId) ? meId : (data[0] && data[0].id);
    f3Chart = f3.createChart('#chart', data, { main_id: validMain });
    const f3Card = f3Chart
      .setCardHtml()
      .setCardDisplay([["first name", "last name"], ["birthday"]]);

    f3Chart.updateTree({ initial: true });

  // Custom edit panel
  const panel = document.createElement('div');
  panel.id = 'custom-panel';
  panel.style.cssText = 'display:none;position:fixed;top:60px;right:10px;width:280px;background:#1e1e1e;color:#fff;padding:16px;border-radius:8px;z-index:1000;font:14px system-ui;';
  panel.innerHTML = `
    <h3 style="margin:0 0 12px">Edit person</h3>
    <label>First name<br><input id="p-first" style="width:100%;margin-bottom:8px;padding:6px;border-radius:4px;border:1px solid #444;background:#2a2a2a;color:#fff"></label>
    <label>Last name<br><input id="p-last" style="width:100%;margin-bottom:8px;padding:6px;border-radius:4px;border:1px solid #444;background:#2a2a2a;color:#fff"></label>
    <label>Birthday<br><input id="p-dob" style="width:100%;margin-bottom:8px;padding:6px;border-radius:4px;border:1px solid #444;background:#2a2a2a;color:#fff"></label>
    <label>Gender<br><select id="p-gender" style="width:100%;margin-bottom:8px;padding:6px;border-radius:4px;border:1px solid #444;background:#2a2a2a;color:#fff"><option value="M">Male</option><option value="F">Female</option></select></label>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button id="p-save" style="flex:1;padding:8px;background:#2a6;color:#fff;border:none;border-radius:4px;cursor:pointer">Save</button>
      <button id="p-cancel" style="flex:1;padding:8px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer">Cancel</button>
    </div>
  `;
  document.body.appendChild(panel);

  let editingId = null;
  document.getElementById('chart').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const main = f3Chart.getMainDatum ? f3Chart.getMainDatum() : null;
    if (!main) return;
    editingId = main.id;
    const p = people.find(x => x.id === editingId);
    if (!p) return;
    const parts = (p.name || '').split(' ');
    document.getElementById('p-first').value = parts.slice(0, -1).join(' ') || parts[0] || '';
    document.getElementById('p-last').value = parts.length > 1 ? parts[parts.length - 1] : '';
    document.getElementById('p-dob').value = p.dob || '';
    document.getElementById('p-gender').value = p.gender || 'M';
    panel.style.display = 'block';
  });
  document.getElementById('p-cancel').onclick = () => { panel.style.display = 'none'; };
  document.getElementById('p-save').onclick = () => {
    const p = people.find(x => x.id === editingId);
    if (!p) return;
    const first = document.getElementById('p-first').value.trim();
    const last = document.getElementById('p-last').value.trim();
    p.name = [first, last].filter(Boolean).join(' ');
    p.dob = document.getElementById('p-dob').value.trim();
    p.gender = document.getElementById('p-gender').value;
    localStorage.setItem('familyTree', JSON.stringify(people));
    panel.style.display = 'none';
    const data = toF3(people);
    f3Chart = f3.createChart('#chart', data);
    f3Chart.setCardHtml().setCardDisplay([["first name", "last name"], ["birthday"]]);
    f3Chart.updateTree({ initial: true });
  };


    // Set titles on form icons
    const setIconTitles = () => {
      document.querySelectorAll('.f3-form button').forEach(el => {
        if (el.title) return;
        const cls = (el.className && el.className.baseVal) || el.className || '';
        const s = String(cls);
        if (s.includes('add')) el.title = 'Add relative';
        else if (s.includes('edit')) el.title = 'Edit';
        else if (s.includes('close') || el.textContent.trim() === '×') el.title = 'Close';
      });
    };



    // Rename Submit -> Save and auto-close form after submit
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.f3-form button[type="submit"]').forEach(btn => {
        if (btn.textContent.trim() === 'Submit') btn.textContent = 'Save';
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    status.textContent = 'Chart ready (' + data.length + ')';
    setTimeout(() => status.remove(), 3000);
  } catch (err) {
    console.error('family-chart error:', err);
    status.textContent = 'Chart error: ' + err.message;
    status.style.color = '#f66';
    document.getElementById('chart').innerHTML = '<p style="color:#f66;padding:20px;">Chart failed to load: ' + err.message + '</p>';
  }



  document.getElementById('theme-toggle').onclick = () => {
    const body = document.body;
    body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
  };
  document.getElementById('export-btn').onclick = () => {
    const blob = new Blob([JSON.stringify(people, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'family-tree.json';
    a.click();
  };
  document.getElementById('reset-btn').onclick = () => {
    if (confirm('Clear all local data and reload the seed tree?')) {
      localStorage.removeItem('familyTree');
      location.reload();
    }
  };
}
