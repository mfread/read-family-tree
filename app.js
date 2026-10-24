import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgvTQ9Zzhnaf_uIQGbtRuRHPuBaVvTWXE",
  authDomain: "read-family-tree.firebaseapp.com",
  projectId: "read-family-tree",
  storageBucket: "read-family-tree.firebasestorage.app",
  messagingSenderId: "334577026946",
  appId: "1:334577026946:web:0d0ef647a044f81e50b19b",
  measurementId: "G-KPZEZHQKP1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const ALLOWED_EMAILS = ["mfread@gmail.com"];

const loginOverlay = document.getElementById("login-overlay");
const appDiv = document.getElementById("app");
const authError = document.getElementById("auth-error");
const userEmailSpan = document.getElementById("user-email");

function showError(msg) { authError.textContent = msg; }

function showApp(user) {
  loginOverlay.style.display = "none";
  appDiv.style.display = "block";
  userEmailSpan.textContent = user.email;
  initTree();
}

function showLogin() {
  loginOverlay.style.display = "flex";
  appDiv.style.display = "none";
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (ALLOWED_EMAILS.length === 0 || ALLOWED_EMAILS.includes(user.email)) showApp(user);
    else { signOut(auth); showError("This email is not authorised."); showLogin(); }
  } else showLogin();
});

document.getElementById("login-form").onsubmit = async (e) => {
  e.preventDefault();
  showError("");
  try { await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); }
  catch (err) { showError(err.message); }
};

document.getElementById("signup-btn").onclick = async () => {
  showError("");
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) { showError("Enter email and password first."); return; }
  try { await createUserWithEmailAndPassword(auth, email, password); }
  catch (err) { showError(err.message); }
};

document.getElementById("logout-btn").onclick = () => signOut(auth);

let treeInitialised = false;

function initTree() {
  if (treeInitialised) return;
  treeInitialised = true;

  const SEED = [
    { id: 'charles', name: 'Charles Francis Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'COPD and asthma', gender: 'M', parentIds: [], spouseIds: [] },
    { id: 'judy', name: 'Judy Anne Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'Dementia (onset)', gender: 'F', parentIds: [], spouseIds: [] },
    { id: 'edward', name: 'Edward Read', dob: '~1931', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: [], spouseIds: [] },
    { id: 'mark', name: 'Mark Francis Read', dob: '1963-07', birthLoc: 'Australia', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles', 'judy'], spouseIds: [{ id: 'merna', married: true }] },
    { id: 'merna', name: 'Merna Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: [], spouseIds: [{ id: 'mark', married: true }] },
    { id: 'donald', name: 'Donald Utton', dob: '', birthLoc: 'UK?', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles'], spouseIds: [] },
    { id: 'vanessa', name: 'Vanessa', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: ['charles', 'judy'], spouseIds: [] },
    { id: 'matthew', name: 'Matthew Read', dob: '~1993', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] },
    { id: 'mitchell', name: 'Mitchell Read', dob: '~1994', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] },
    { id: 'michael', name: 'Michael Read', dob: '~1999', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] }
  ];

  let people = JSON.parse(localStorage.getItem('familyTree') || 'null') || SEED.map(p => ({...p}));
  people.forEach(p => { if (!p.spouseIds) p.spouseIds = []; });

  let meId = sessionStorage.getItem('meId') || null;

  const svg = d3.select('#chart');
  const g = svg.append('g');
  const width = window.innerWidth;
  const height = window.innerHeight;
  svg.attr('viewBox', [0, 0, width, height]);

  const zoom = d3.zoom().scaleExtent([0.2, 3]).on('zoom', (e) => g.attr('transform', e.transform));
  svg.call(zoom);

  function save() { localStorage.setItem('familyTree', JSON.stringify(people)); }
  function getPerson(id) { return people.find(p => p.id === id); }
  function isAlive(p) { return !p.dod || p.dod.trim() === ''; }

  function buildHierarchy() {
    const byId = Object.fromEntries(people.map(p => [p.id, {...p, children: []}]));
    const roots = [];
    people.forEach(p => {
      const node = byId[p.id];
      if (!p.parentIds || p.parentIds.length === 0) roots.push(node);
      else {
        const parent = byId[p.parentIds[0]];
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    });
    if (roots.length > 1) return d3.hierarchy({ id: '__root', name: '', children: roots });
    if (roots.length === 1) return d3.hierarchy(roots[0]);
    return d3.hierarchy({ id: '__empty', name: 'No data', children: [] });
  }

  function render() {
    g.selectAll('*').remove();
    const root = buildHierarchy();
    d3.tree().nodeSize([220, 170]).separation((a, b) => a.parent === b.parent ? 1.1 : 1.3)(root);

    let nodes = root.descendants().filter(d => d.data.id !== '__root' && d.data.id !== '__empty');
    const pos = {};
    nodes.forEach(n => { pos[n.data.id] = { x: n.x, y: n.y }; });

    // Place spouses: male left, female right
    const placed = new Set();
    nodes.forEach(n => {
      (n.data.spouseIds || []).forEach(s => {
        if (placed.has(s.id) || placed.has(n.data.id)) return;
        const sp = getPerson(s.id);
        if (!sp || !pos[s.id]) return;
        const me = getPerson(n.data.id);
        const male = (me.gender === 'M' || me.gender === 'male') ? me : (sp.gender === 'M' || sp.gender === 'male') ? sp : me;
        const female = (male.id === me.id) ? sp : me;
        const baseX = pos[male.id] ? pos[male.id].x : pos[n.data.id].x;
        pos[male.id] = { x: baseX, y: pos[male.id]?.y || pos[n.data.id].y };
        pos[female.id] = { x: baseX + 180, y: pos[male.id].y };
        placed.add(male.id);
        placed.add(female.id);
      });
    });

    // Marriage / partnership lines
    const marriageLines = [];
    nodes.forEach(n => {
      (n.data.spouseIds || []).forEach(s => {
        if (!pos[n.data.id] || !pos[s.id]) return;
        if (n.data.id > s.id) return; // avoid double
        const married = s.married !== false;
        marriageLines.push({
          x1: Math.min(pos[n.data.id].x, pos[s.id].x) + 75,
          y1: pos[n.data.id].y,
          x2: Math.max(pos[n.data.id].x, pos[s.id].x) - 75,
          y2: pos[s.id].y,
          married
        });
      });
    });

    const lines = g.selectAll('.marriage')
      .data(marriageLines)
      .join('line')
      .attr('class', 'marriage')
      .attr('x1', d => d.x1).attr('y1', d => d.y1)
      .attr('x2', d => d.x2).attr('y2', d => d.y2)
      .attr('stroke', d => d.married ? 'var(--married)' : 'var(--unmarried)')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('mouseenter', function(e, d) {
        const tip = document.createElement('div');
        tip.id = 'line-tip';
        tip.textContent = d.married ? 'married' : 'not married';
        tip.style.cssText = 'position:fixed;background:#333;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;pointer-events:none;z-index:500;';
        tip.style.left = (e.pageX + 10) + 'px';
        tip.style.top = (e.pageY - 20) + 'px';
        document.body.appendChild(tip);
      })
      .on('mouseleave', () => {
        const tip = document.getElementById('line-tip');
        if (tip) tip.remove();
      });

    // Child links from couple midpoint
    const childLinks = [];
    people.forEach(child => {
      if (!child.parentIds || !child.parentIds.length || !pos[child.id]) return;
      const parents = child.parentIds.map(id => getPerson(id)).filter(Boolean);
      if (!parents.length) return;

      let fromX, fromY;
      if (parents.length >= 2 && pos[parents[0].id] && pos[parents[1].id]) {
        fromX = (pos[parents[0].id].x + pos[parents[1].id].x) / 2;
        fromY = pos[parents[0].id].y + 30;
      } else if (pos[parents[0].id]) {
        fromX = pos[parents[0].id].x;
        fromY = pos[parents[0].id].y + 30;
      } else return;

      childLinks.push({
        x1: fromX, y1: fromY,
        x2: pos[child.id].x, y2: pos[child.id].y - 30
      });
    });

    g.selectAll('.child-link')
      .data(childLinks)
      .join('path')
      .attr('class', 'child-link')
      .attr('fill', 'none')
      .attr('stroke', 'var(--link)')
      .attr('stroke-width', 1.5)
      .attr('d', d => `M${d.x1},${d.y1} V${(d.y1+d.y2)/2} H${d.x2} V${d.y2}`);

    // Nodes
    const node = g.selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', d => {
        const alive = isAlive(d.data);
        return 'node' + (d.data.id === meId ? ' me' : '') + (alive ? ' alive' : ' dead');
      })
      .attr('transform', d => `translate(${pos[d.data.id].x},${pos[d.data.id].y})`)
      .on('contextmenu', (e, d) => { e.preventDefault(); showContextMenu(e, d.data.id); });

    node.append('rect').attr('x', -75).attr('y', -30).attr('width', 150).attr('height', 60);

    node.append('text').attr('text-anchor', 'middle').attr('dy', '0.3em')
      .text(d => d.data.name || 'Unnamed').call(wrapText, 140);

    setTimeout(() => {
      const xs = Object.values(pos).map(p => p.x);
      const ys = Object.values(pos).map(p => p.y);
      if (!xs.length) return;
      const minX = Math.min(...xs)-120, maxX = Math.max(...xs)+120;
      const minY = Math.min(...ys)-60, maxY = Math.max(...ys)+60;
      const dx = maxX-minX, dy = maxY-minY;
      const scale = Math.min(0.85, Math.min((width-80)/dx, (height-80)/dy));
      let t;
      if (meId && pos[meId]) {
        t = d3.zoomIdentity.translate(width/2 - pos[meId].x*1.3, height/2 - pos[meId].y*1.3).scale(1.3);
      } else {
        t = d3.zoomIdentity.translate((width-dx*scale)/2 - minX*scale, (height-dy*scale)/2 - minY*scale + 40).scale(scale);
      }
      svg.transition().duration(600).call(zoom.transform, t);
    }, 50);
  }

  function wrapText(text, width) {
    text.each(function() {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      let word, line = [], lineNumber = 0, lineHeight = 1.1, y = text.attr('y') || 0, dy = parseFloat(text.attr('dy') || 0);
      let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
        }
      }
    });
  }

  const menu = document.getElementById('context-menu');
  let currentPersonId = null;

  function showContextMenu(e, personId) {
    currentPersonId = personId;
    menu.innerHTML = `
      <div data-action="setme">Set as Me</div>
      <div data-action="edit">Edit Properties</div>
      <div data-action="addchild">Add / Link Child</div>
      <div data-action="addparent">Add / Link Parent</div>
      <div data-action="addsibling">Add Sibling</div>
      <div data-action="linkspouse">Link Spouse / Partner</div>
    `;
    menu.style.display = 'block';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
  }

  document.addEventListener('click', () => menu.style.display = 'none');
  menu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action || !currentPersonId) return;
    menu.style.display = 'none';
    const person = getPerson(currentPersonId);
    if (!person) return;

    if (action === 'setme') {
      meId = currentPersonId;
      sessionStorage.setItem('meId', meId);
      render();
    } else if (action === 'edit') {
      openEditModal(person);
    } else if (action === 'addchild') {
      openLinkModal('child', person);
    } else if (action === 'addparent') {
      openLinkModal('parent', person);
    } else if (action === 'addsibling') {
      openEditModal(null, 'Add Sibling', { parentIds: person.parentIds || [] });
    } else if (action === 'linkspouse') {
      openLinkModal('spouse', person);
    }
  });

  function openLinkModal(type, person) {
    const existing = people.filter(p => p.id !== person.id);
    const options = existing.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    const marriedHtml = type === 'spouse' ? `<label style="display:block;margin:8px 0;"><input type="checkbox" id="married-check" checked> Married</label>` : '';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:var(--modal-bg);padding:24px;border-radius:10px;min-width:280px;">
        <h3>Link ${type} to ${person.name}</h3>
        <p>Select existing or create new:</p>
        <select id="existing-select" style="width:100%;padding:8px;margin:8px 0;"><option value="">-- Create new --</option>${options}</select>
        ${marriedHtml}
        <div style="margin-top:12px;text-align:right;">
          <button type="button" id="link-cancel">Cancel</button>
          <button type="button" id="link-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#link-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#link-ok').onclick = () => {
      const sel = overlay.querySelector('#existing-select').value;
      const marriedEl = overlay.querySelector('#married-check');
      const married = marriedEl ? marriedEl.checked : true;
      overlay.remove();

      if (sel) {
        const other = getPerson(sel);
        if (type === 'child') {
          other.parentIds = other.parentIds || [];
          if (!other.parentIds.includes(person.id)) other.parentIds.push(person.id);
        } else if (type === 'parent') {
          person.parentIds = person.parentIds || [];
          if (!person.parentIds.includes(other.id)) person.parentIds.push(other.id);
        } else if (type === 'spouse') {
          person.spouseIds = person.spouseIds || [];
          other.spouseIds = other.spouseIds || [];
          if (!person.spouseIds.find(s => s.id === other.id)) person.spouseIds.push({ id: other.id, married });
          if (!other.spouseIds.find(s => s.id === person.id)) other.spouseIds.push({ id: person.id, married });
        }
        save(); render();
      } else {
        if (type === 'child') openEditModal(null, 'Add Child', { parentIds: [person.id] });
        else if (type === 'parent') openEditModal(null, 'Add Parent', { asParentOf: person.id });
        else if (type === 'spouse') openEditModal(null, 'Add Spouse', { asSpouseOf: person.id, married });
      }
    };
  }

  const modal = document.getElementById('modal');
  let editing = null;
  let extra = {};

  function openEditModal(person, title = 'Edit', extras = {}) {
    editing = person;
    extra = extras;
    const form = document.getElementById('person-form');
    document.getElementById('modal-title').textContent = title + (person ? ': ' + person.name : '');
    form.reset();
    if (person) {
      form.name.value = person.name || '';
      form.dob.value = person.dob || '';
      form.birthLoc.value = person.birthLoc || '';
      form.dod.value = person.dod || '';
      form.deathLoc.value = person.deathLoc || '';
      form.deathReason.value = person.deathReason || '';
      form.gender.value = person.gender || '';
    }
    modal.classList.add('show');
  }

  document.getElementById('person-form').onsubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value.trim(),
      dob: form.dob.value.trim(),
      birthLoc: form.birthLoc.value.trim(),
      dod: form.dod.value.trim(),
      deathLoc: form.deathLoc.value.trim(),
      deathReason: form.deathReason.value.trim(),
      gender: form.gender.value
    };
    if (editing) {
      const real = getPerson(editing.id);
      if (real) Object.assign(real, data);
    } else {
      const id = 'p' + Date.now();
      const newP = { id, parentIds: extra.parentIds || [], spouseIds: [], ...data };
      people.push(newP);
      if (extra.asParentOf) {
        const child = getPerson(extra.asParentOf);
        if (child) {
          child.parentIds = child.parentIds || [];
          if (!child.parentIds.includes(id)) child.parentIds.push(id);
        }
      }
      if (extra.asSpouseOf) {
        const other = getPerson(extra.asSpouseOf);
        if (other) {
          newP.spouseIds.push({ id: other.id, married: extra.married !== false });
          other.spouseIds = other.spouseIds || [];
          other.spouseIds.push({ id: newP.id, married: extra.married !== false });
        }
      }
    }
    save();
    modal.classList.remove('show');
    render();
  };

  document.getElementById('modal-cancel').onclick = () => modal.classList.remove('show');

  const themeToggle = document.getElementById('theme-toggle');
  document.body.dataset.theme = localStorage.getItem('theme') || 'light';
  themeToggle.onclick = () => {
    const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = next;
    localStorage.setItem('theme', next);
  };

  document.getElementById('export-btn').onclick = () => {
    const blob = new Blob([JSON.stringify(people, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'read-family-tree.json';
    a.click();
  };
  document.getElementById('reset-btn').onclick = () => {
    if (confirm('Reset to initial seed data? This will overwrite your local changes.')) {
      people = SEED.map(p => ({...p}));
      save();
      meId = null;
      sessionStorage.removeItem('meId');
      render();
    }
  };

  render();
}
