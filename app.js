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
  const MIN_SEP = 240;

  function computePositions() {
    const pos = {};
    const placed = new Set();
    const unitX = 320;
    const genH = 340;
    const coupleW = 120;
    const clusterGap = 520;

    function place(id, x, y) {
      if (placed.has(id)) return;
      pos[id] = { x, y };
      placed.add(id);
    }
    function spouseOf(p) {
      return (p.spouseIds || []).map(s => getPerson(s.id)).find(Boolean) || null;
    }
    function childrenOf(parentIds) {
      const key = parentIds.slice().sort().join('|');
      return people.filter(c => (c.parentIds || []).slice().sort().join('|') === key);
    }

    // Width needed by a person's subtree (couple + children)
    function subtreeWidth(person) {
      if (!person) return unitX;
      const sp = spouseOf(person);
      const pids = sp ? [person.id, sp.id] : [person.id];
      const kids = childrenOf(pids);
      if (!kids.length) return coupleW + 40;
      const kidsW = kids.reduce((sum, k) => sum + subtreeWidth(k), 0) + (kids.length - 1) * 40;
      return Math.max(coupleW + 40, kidsW);
    }

    function placeCouple(person, centerX, y) {
      if (placed.has(person.id)) return;
      const sp = spouseOf(person);
      if (sp && !placed.has(sp.id)) {
        const male = person.gender === 'M' ? person : (sp.gender === 'M' ? sp : person);
        const female = male === person ? sp : person;
        place(male.id, centerX - coupleW / 2, y);
        place(female.id, centerX + coupleW / 2, y);
      } else {
        place(person.id, centerX, y);
      }
    }

    function layout(person, centerX, y) {
      if (placed.has(person.id)) return;
      placeCouple(person, centerX, y);
      const sp = spouseOf(person);
      const both = sp && pos[sp.id] && Math.abs(pos[sp.id].y - y) < 5;
      const pids = both ? [person.id, sp.id] : [person.id];
      const kids = childrenOf(pids).filter(k => !placed.has(k.id));
      if (!kids.length) return;
      const widths = kids.map(subtreeWidth);
      const total = widths.reduce((a, b) => a + b, 0) + (kids.length - 1) * 60;
      let x = centerX - total / 2;
      kids.forEach((kid, i) => {
        const w = widths[i];
        layout(kid, x + w / 2, y + genH);
        x += w + 60;
      });
    }

    // Roots spaced by their subtree width
    const roots = people.filter(p => !p.parentIds || p.parentIds.length === 0);
    let cursor = 0;
    roots.forEach(r => {
      if (placed.has(r.id)) return;
      const w = subtreeWidth(r);
      layout(r, cursor + w / 2, 0);
      cursor += w + clusterGap;
    });

    // Half-siblings (single parent) — place left of the full sibling group
    people.filter(p => !placed.has(p.id) && (p.parentIds || []).length === 1).forEach((p, i) => {
      const parent = getPerson(p.parentIds[0]);
      if (parent && pos[parent.id]) {
        placeCouple(p, pos[parent.id].x - unitX * (2 + i), pos[parent.id].y + genH);
      } else {
        place(p.id, cursor, genH);
        cursor += unitX;
      }
    });

    people.forEach(p => { if (!placed.has(p.id)) place(p.id, cursor, 0); });

    // Re-centre each sibling group under their parents, then push whole clusters apart
    const groups = {};
    people.forEach(p => {
      if (!p.parentIds || !p.parentIds.length || !pos[p.id]) return;
      const key = p.parentIds.slice().sort().join('|');
      if (!groups[key]) groups[key] = { parents: p.parentIds, kids: [] };
      groups[key].kids.push(p);
    });
    Object.values(groups).forEach(g => {
      const parentPos = g.parents.map(id => pos[id]).filter(Boolean);
      if (!parentPos.length) return;
      const parentMid = parentPos.reduce((s, p) => s + p.x, 0) / parentPos.length;
      const kidMid = g.kids.reduce((s, k) => s + pos[k.id].x, 0) / g.kids.length;
      const dx = parentMid - kidMid;
      // Only shift if the group has drifted far from its parents
      if (Math.abs(dx) > 40) {
        g.kids.forEach(k => { pos[k.id].x += dx; });
      }
    });

    // Push clusters apart if their bounding boxes overlap
    const clusters = Object.values(groups).map(g => {
      const xs = g.kids.map(k => pos[k.id].x);
      return { kids: g.kids, minX: Math.min(...xs), maxX: Math.max(...xs), y: pos[g.kids[0].id].y };
    });
    for (let iter = 0; iter < 8; iter++) {
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const a = clusters[i], b = clusters[j];
          if (Math.abs(a.y - b.y) > 40) continue;
          const gap = 80;
          if (a.maxX + gap > b.minX && a.minX < b.maxX) {
            const push = (a.maxX + gap - b.minX) / 2 + 10;
            a.kids.forEach(k => { pos[k.id].x -= push; });
            b.kids.forEach(k => { pos[k.id].x += push; });
            a.minX -= push; a.maxX -= push;
            b.minX += push; b.maxX += push;
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

    // One clean connector per parent group: drop from linkage, bar, drop to children
    const groups = Object.values(byParents);
    groups.forEach((group, gi) => {
      const parents = group.parents.map(id => getPerson(id)).filter(Boolean);
      const kids = group.children.filter(k => pos[k.id]);
      if (!kids.length) return;

      let fromY, midX;
      if (parents.length >= 2 && pos[parents[0].id] && pos[parents[1].id]) {
        // Start from the centre of the linkage line between the two parents
        fromY = pos[parents[0].id].y;
        midX = (pos[parents[0].id].x + pos[parents[1].id].x) / 2;
      } else if (parents[0] && pos[parents[0].id]) {
        fromY = pos[parents[0].id].y + HH + 4;
        midX = pos[parents[0].id].x;
      } else return;

      const kidXs = kids.map(k => pos[k.id].x);
      const minKidY = Math.min(...kids.map(k => pos[k.id].y));
      // Bar sits in the gap between parents and children, offset per group so they don't stack
      const gap = Math.max(80, minKidY - fromY);
      const barY = fromY + 90 + gi * 90;
      const safeBarY = Math.min(barY, minKidY - HH - 20);

      // Vertical from linkage line down to bar
      g.append('line').attr('class', 'child-link')
        .attr('x1', midX).attr('y1', fromY)
        .attr('x2', midX).attr('y2', safeBarY)
        .attr('stroke', 'var(--link)').attr('stroke-width', 1.5);

      // Horizontal bar across this group's children only
      const hLeft = Math.min(midX, ...kidXs);
      const hRight = Math.max(midX, ...kidXs);
      g.append('line').attr('class', 'child-link')
        .attr('x1', hLeft).attr('y1', safeBarY)
        .attr('x2', hRight).attr('y2', safeBarY)
        .attr('stroke', 'var(--link)').attr('stroke-width', 1.5);

      // Drop from bar to each child
      kids.forEach(k => {
        g.append('line').attr('class', 'child-link')
          .attr('x1', pos[k.id].x).attr('y1', safeBarY)
          .attr('x2', pos[k.id].x).attr('y2', pos[k.id].y - HH - 2)
          .attr('stroke', 'var(--link)').attr('stroke-width', 1.5);
      });
    });

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

