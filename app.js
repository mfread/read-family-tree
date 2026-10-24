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
    { id: 'charles', name: 'Charles Francis Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'COPD and asthma', gender: 'M', parentIds: [], spouseIds: [{ id: 'judy', married: true }] },
    { id: 'judy', name: 'Judy Anne Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'Dementia (onset)', gender: 'F', parentIds: [], spouseIds: [{ id: 'charles', married: true }] },
    { id: 'edward', name: 'Edward Read', dob: '~1931', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles'], spouseIds: [] },
    { id: 'mark', name: 'Mark Francis Read', dob: '1963-07', birthLoc: 'Australia', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles', 'judy'], spouseIds: [{ id: 'merna', married: true }] },
    { id: 'merna', name: 'Merna Helena Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: [], spouseIds: [{ id: 'mark', married: true }] },
    { id: 'donald', name: 'Donald Utton', dob: '', birthLoc: 'UK?', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles'], spouseIds: [] },
    { id: 'vanessa', name: 'Vanessa Anne Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: ['charles', 'judy'], spouseIds: [] },
    { id: 'matthew', name: 'Matthew Mark Read', dob: '~1993', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] },
    { id: 'mitchell', name: 'Mitchell John Read', dob: '~1994', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] },
    { id: 'michael', name: 'Michael Luke Read', dob: '~1999', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'], spouseIds: [] }
  ];

  let people = JSON.parse(localStorage.getItem('familyTree') || 'null') || SEED.map(p => ({...p}));
  people.forEach(p => { if (!p.spouseIds) p.spouseIds = []; });

  let meId = sessionStorage.getItem('meId') || null;
  let viewMode = 'both';
  let lineageId = null;

  const svg = d3.select('#chart');
  const g = svg.append('g');
  const width = window.innerWidth;
  const height = window.innerHeight;
  svg.attr('viewBox', [0, 0, width, height]);
  const zoom = d3.zoom().scaleExtent([0.15, 3]).on('zoom', (e) => g.attr('transform', e.transform));
  svg.call(zoom);

  function save() { localStorage.setItem('familyTree', JSON.stringify(people)); }
  function getPerson(id) { return people.find(p => p.id === id); }
  function isAlive(p) { return !p.dod || !p.dod.trim(); }

  const HW = 70, HH = 28;
  const MIN_SEP = 160;

  function computePositions() {
    const pos = {};
    const placed = new Set();
    const unitX = 200;

    const roots = people.filter(p => !p.parentIds || p.parentIds.length === 0);

    function placePerson(p, x, y) {
      if (placed.has(p.id)) return;
      pos[p.id] = { x, y };
      placed.add(p.id);
    }

    function layout(p, x, y) {
      if (placed.has(p.id)) return;
      placePerson(p, x, y);

      const spouses = (p.spouseIds || []).map(s => getPerson(s.id)).filter(Boolean);
      spouses.forEach(sp => {
        if (placed.has(sp.id)) return;
        const putMaleLeft = (p.gender === 'M' && sp.gender !== 'M') || (sp.gender === 'F' && p.gender !== 'F');
        if (putMaleLeft || p.gender === 'M') {
          placePerson(sp, x + unitX * 0.95, y);
        } else {
          pos[p.id].x = x + unitX * 0.95;
          placePerson(sp, x, y);
        }
      });

      let children = people.filter(c => (c.parentIds || []).includes(p.id) && !placed.has(c.id));
      children.sort((a, b) => {
        const aHalf = (a.parentIds || []).length === 1;
        const bHalf = (b.parentIds || []).length === 1;
        if (aHalf && !bHalf) return -1;
        if (!aHalf && bHalf) return 1;
        return 0;
      });

      if (children.length) {
        const childY = y + 180;
        const totalWidth = (children.length - 1) * unitX;
        const startX = x - totalWidth / 2;
        children.forEach((child, i) => {
          layout(child, startX + i * unitX, childY);
        });
      }
    }

    let rootX = 0;
    roots.forEach(r => {
      if (!placed.has(r.id)) {
        layout(r, rootX, 0);
        rootX += unitX * 4;
      }
    });
    people.forEach(p => { if (!placed.has(p.id)) layout(p, rootX, 0); });

    // Force children to sit below their parents (fixes cases where a child was placed as a root or spouse first)
    people.forEach(child => {
      if (!child.parentIds || !child.parentIds.length || !pos[child.id]) return;
      const parents = child.parentIds.map(id => pos[id]).filter(Boolean);
      if (!parents.length) return;
      const maxParentY = Math.max(...parents.map(p => p.y));
      if (pos[child.id].y <= maxParentY + 80) {
        pos[child.id].y = maxParentY + 180;
        // Centre under the parents (or under the couple midpoint)
        const midX = parents.reduce((s, p) => s + p.x, 0) / parents.length;
        pos[child.id].x = midX;
      }
    });

    const ids = Object.keys(pos);
    for (let iter = 0; iter < 8; iter++) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos[ids[i]], b = pos[ids[j]];
          if (Math.abs(a.y - b.y) > 40) continue;
          const dx = b.x - a.x;
          const dist = Math.abs(dx);
          if (dist < MIN_SEP && dist > 0.1) {
            const push = (MIN_SEP - dist) / 2 + 2;
            if (dx > 0) {
              a.x -= push;
              b.x += push;
            } else {
              a.x += push;
              b.x -= push;
            }
          }
        }
      }
    }

    return pos;
  }

  function getLineage(id, mode) {
    if (!id) return new Set();
    const set = new Set();
    const person = getPerson(id);
    if (!person) return set;
    const wantGender = mode === 'paternal' ? 'M' : 'F';

    function traceUp(pid) {
      const p = getPerson(pid);
      if (!p) return;
      const parents = (p.parentIds || []).map(getPerson).filter(Boolean);
      const same = parents.find(par => par.gender === wantGender);
      const next = same || parents[0];
      if (next && !set.has(next.id)) {
        set.add(next.id);
        traceUp(next.id);
      }
    }

    function traceDown(pid) {
      const children = people.filter(c => (c.parentIds || []).includes(pid));
      children.forEach(c => {
        if (c.gender === wantGender && !set.has(c.id)) {
          set.add(c.id);
          traceDown(c.id);
        }
      });
    }

    if (person.gender === wantGender) {
      set.add(id);
      traceUp(id);
      traceDown(id);
    }
    return set;
  }

  function render() {
    g.selectAll('*').remove();
    const pos = computePositions();
    const lineage = (viewMode !== 'both' && lineageId) ? getLineage(lineageId, viewMode) : null;

    const marriageLines = [];
    people.forEach(p => {
      (p.spouseIds || []).forEach(s => {
        if (!pos[p.id] || !pos[s.id] || p.id > s.id) return;
        const married = s.married !== false;
        const left = pos[p.id].x < pos[s.id].x ? p.id : s.id;
        const right = left === p.id ? s.id : p.id;
        marriageLines.push({
          x1: pos[left].x + HW + 2,
          y1: pos[left].y,
          x2: pos[right].x - HW - 2,
          y2: pos[right].y,
          married
        });
      });
    });

    g.selectAll('.marriage')
      .data(marriageLines)
      .join('line')
      .attr('class', 'marriage')
      .attr('x1', d => d.x1).attr('y1', d => d.y1)
      .attr('x2', d => d.x2).attr('y2', d => d.y2)
      .attr('stroke', d => d.married ? 'var(--married)' : 'var(--unmarried)')
      .attr('stroke-width', 2.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (e, d) => {
        let tip = document.getElementById('line-tip');
        if (!tip) {
          tip = document.createElement('div');
          tip.id = 'line-tip';
          tip.style.cssText = 'position:fixed;background:#333;color:#fff;padding:3px 7px;border-radius:4px;font-size:11px;pointer-events:none;z-index:600;';
          document.body.appendChild(tip);
        }
        tip.textContent = d.married ? 'married' : 'not married';
        tip.style.left = (e.pageX + 8) + 'px';
        tip.style.top = (e.pageY - 22) + 'px';
      })
      .on('mouseleave', () => {
        const tip = document.getElementById('line-tip');
        if (tip) tip.remove();
      });

    const childLinks = [];
    const siblingBars = [];
    const byParents = {};
    people.forEach(child => {
      if (!child.parentIds || !child.parentIds.length || !pos[child.id]) return;
      const key = child.parentIds.slice().sort().join('|');
      if (!byParents[key]) byParents[key] = { parents: child.parentIds, children: [] };
      byParents[key].children.push(child);
    });

    Object.values(byParents).forEach(group => {
      const parents = group.parents.map(id => getPerson(id)).filter(Boolean);
      const kids = group.children.filter(k => pos[k.id]);
      if (!kids.length) return;

      let midX, fromY;
      if (parents.length >= 2 && pos[parents[0].id] && pos[parents[1].id]) {
        midX = (pos[parents[0].id].x + pos[parents[1].id].x) / 2;
        fromY = pos[parents[0].id].y; // from marriage line
      } else if (parents[0] && pos[parents[0].id]) {
        midX = pos[parents[0].id].x;
        fromY = pos[parents[0].id].y + HH + 4;
      } else return;

      const kidXs = kids.map(k => pos[k.id].x);
      const kidYs = kids.map(k => pos[k.id].y);
      const minKidY = Math.min(...kidYs);
      const barLeft = Math.min(...kidXs);
      const barRight = Math.max(...kidXs);

      // Private bar for this parent group — offset so it does not share another group's line
      const gap = minKidY - fromY;
      const barY = fromY + Math.max(40, gap * 0.55);

      // Vertical drop from the marriage line (or single parent) to the private bar
      childLinks.push({ x1: midX, y1: fromY, x2: midX, y2: barY });

      // Horizontal only for this group's children
      const hLeft = Math.min(midX, barLeft);
      const hRight = Math.max(midX, barRight);
      childLinks.push({ x1: hLeft, y1: barY, x2: hRight, y2: barY });

      // Drop from the private bar to each child
      kids.forEach(k => {
        childLinks.push({ x1: pos[k.id].x, y1: barY, x2: pos[k.id].x, y2: pos[k.id].y - HH - 2 });
      });
    });

    g.selectAll('.child-link').data(childLinks).join('line')
      .attr('class', 'child-link')
      .attr('x1', d => d.x1).attr('y1', d => d.y1)
      .attr('x2', d => d.x2).attr('y2', d => d.y2)
      .attr('stroke', 'var(--link)').attr('stroke-width', 1.5);

    g.selectAll('.sibling-bar').data(siblingBars).join('line')
      .attr('class', 'sibling-bar')
      .attr('x1', d => d.x1).attr('y1', d => d.y1)
      .attr('x2', d => d.x2).attr('y2', d => d.y2)
      .attr('stroke', 'var(--link)').attr('stroke-width', 1.5);

    const node = g.selectAll('.node')
      .data(people.filter(p => pos[p.id]))
      .join('g')
      .attr('class', d => {
        let cls = 'node' + (d.id === meId ? ' me' : '') + (isAlive(d) ? ' alive' : ' dead');
        if (lineage && !lineage.has(d.id)) cls += ' greyed';
        return cls;
      })
      .attr('transform', d => `translate(${pos[d.id].x},${pos[d.id].y})`)
      .on('click', (e, d) => {
        e.stopPropagation();
        if (viewMode === 'both') return;
        const want = viewMode === 'paternal' ? 'M' : 'F';
        if (d.gender !== want) return;
        if (lineageId === d.id) lineageId = null;
        else lineageId = d.id;
        render();
      })
      .on('contextmenu', (e, d) => { e.preventDefault(); showContextMenu(e, d.id); });

    node.append('rect').attr('x', -HW).attr('y', -HH).attr('width', HW * 2).attr('height', HH * 2);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .each(function(d) {
        const text = d3.select(this);
        const parts = (d.name || 'Unnamed').split(' ');
        const surname = parts.pop();
        const given = parts.join(' ');
        text.append('tspan').attr('x', 0).attr('dy', given ? '-0.4em' : '0.3em').text(given || surname);
        if (given) text.append('tspan').attr('x', 0).attr('dy', '1.2em').text(surname.toUpperCase());
      });

    setTimeout(() => {
      const xs = Object.values(pos).map(p => p.x);
      const ys = Object.values(pos).map(p => p.y);
      if (!xs.length) return;
      const minX = Math.min(...xs) - 120, maxX = Math.max(...xs) + 120;
      const minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 60;
      const dx = maxX - minX, dy = maxY - minY;
      const scale = Math.min(0.9, Math.min((width - 60) / dx, (height - 60) / dy));
      let t;
      if (meId && pos[meId]) {
        t = d3.zoomIdentity.translate(width / 2 - pos[meId].x * 1.2, height / 2 - pos[meId].y * 1.2).scale(1.2);
      } else {
        t = d3.zoomIdentity
          .translate((width - dx * scale) / 2 - minX * scale, (height - dy * scale) / 2 - minY * scale + 30)
          .scale(scale);
      }
      svg.transition().duration(500).call(zoom.transform, t);
    }, 40);
  }

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewMode = btn.id.replace('view-', '');
      lineageId = null;
      render();
    };
  });

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
    } else if (action === 'edit') openEditModal(person);
    else if (action === 'addchild') openLinkModal('child', person);
    else if (action === 'addparent') openLinkModal('parent', person);
    else if (action === 'addsibling') openEditModal(null, 'Add Sibling', { parentIds: person.parentIds || [] });
    else if (action === 'linkspouse') openLinkModal('spouse', person);
  });

  function openLinkModal(type, person) {
    const existing = people.filter(p => p.id !== person.id);

    let currentId = null;
    let currentMarried = true;
    if (type === 'spouse' && person.spouseIds && person.spouseIds.length) {
      currentId = person.spouseIds[0].id;
      currentMarried = person.spouseIds[0].married !== false;
    } else if (type === 'parent' && person.parentIds && person.parentIds.length) {
      currentId = person.parentIds[0];
    } else if (type === 'child') {
      const child = people.find(c => (c.parentIds || []).includes(person.id));
      if (child) currentId = child.id;
    }

    const options = existing.map(p => {
      const selected = p.id === currentId ? ' selected' : '';
      return `<option value="${p.id}"${selected}>${p.name}</option>`;
    }).join('');

    const marriedHtml = type === 'spouse' ? `
      <div style="margin:10px 0; display:flex; align-items:center; gap:10px;">
        <label for="married-check" style="margin:0; cursor:pointer;">Married</label>
        <input type="checkbox" id="married-check" ${currentMarried ? 'checked' : ''} style="width:auto; margin:0;">
      </div>
    ` : '';

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
          const existingS = person.spouseIds.find(s => s.id === other.id);
          if (existingS) existingS.married = married;
          else person.spouseIds.push({ id: other.id, married });

          const existingO = other.spouseIds.find(s => s.id === person.id);
          if (existingO) existingO.married = married;
          else other.spouseIds.push({ id: person.id, married });
        }
        save();
        render();
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
      form.marriedSurname.value = person.marriedSurname || '';
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
      marriedSurname: form.marriedSurname.value.trim(),
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
      lineageId = null;
      render();
    }
  };

  render();
}

