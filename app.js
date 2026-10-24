const SEED = [
  { id: 'charles', name: 'Charles Francis Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'COPD and asthma', gender: 'M', parentIds: [] },
  { id: 'judy', name: 'Judy Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: 'Dementia (onset)', gender: 'F', parentIds: [] },
  { id: 'edward', name: 'Edward Read', dob: '~1931', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: [] },
  { id: 'mark', name: 'Mark Francis Read', dob: '1963-07', birthLoc: 'Australia', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles', 'judy'] },
  { id: 'merna', name: 'Merna Read', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: [] },
  { id: 'donald', name: 'Donald Utton', dob: '', birthLoc: 'UK?', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['charles'] },
  { id: 'vanessa', name: 'Vanessa', dob: '', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'F', parentIds: ['charles', 'judy'] },
  { id: 'matthew', name: 'Matthew Read', dob: '~1993', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'] },
  { id: 'mitchell', name: 'Mitchell Read', dob: '~1994', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'] },
  { id: 'michael', name: 'Michael Read', dob: '~1999', birthLoc: '', dod: '', deathLoc: '', deathReason: '', gender: 'M', parentIds: ['mark', 'merna'] }
];

let people = JSON.parse(localStorage.getItem('familyTree') || 'null') || SEED.map(p => ({...p}));
let meId = sessionStorage.getItem('meId') || null;

const svg = d3.select('#chart');
const g = svg.append('g');
const width = window.innerWidth;
const height = window.innerHeight;
svg.attr('viewBox', [0, 0, width, height]);

const zoom = d3.zoom().scaleExtent([0.2, 3]).on('zoom', (e) => g.attr('transform', e.transform));
svg.call(zoom);

function save() {
  localStorage.setItem('familyTree', JSON.stringify(people));
}

function buildHierarchy() {
  const byId = Object.fromEntries(people.map(p => [p.id, {...p, children: []}]));
  const roots = [];
  people.forEach(p => {
    const node = byId[p.id];
    if (!p.parentIds || p.parentIds.length === 0) {
      roots.push(node);
    } else {
      const parent = byId[p.parentIds[0]];
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });
  if (roots.length > 1) {
    return d3.hierarchy({ id: '__root', name: '', children: roots });
  } else if (roots.length === 1) {
    return d3.hierarchy(roots[0]);
  }
  return d3.hierarchy({ id: '__empty', name: 'No data', children: [] });
}

function render() {
  g.selectAll('*').remove();
  const root = buildHierarchy();
  const treeLayout = d3.tree().nodeSize([180, 120]).separation((a, b) => a.parent === b.parent ? 1 : 1.2);
  treeLayout(root);

  const nodes = root.descendants().filter(d => d.data.id !== '__root' && d.data.id !== '__empty');
  const links = root.links().filter(l => l.source.data.id !== '__root');

  g.selectAll('.link')
    .data(links)
    .join('path')
    .attr('class', 'link')
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

  const node = g.selectAll('.node')
    .data(nodes)
    .join('g')
    .attr('class', d => 'node' + (d.data.id === meId ? ' me' : ''))
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .on('contextmenu', (e, d) => {
      e.preventDefault();
      showContextMenu(e, d.data);
    })
    .on('click', (e, d) => {
    });

  node.append('rect')
    .attr('x', -70).attr('y', -25).attr('width', 140).attr('height', 50);

  node.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text(d => d.data.name || 'Unnamed')
    .call(wrapText, 130);

  setTimeout(() => {
    if (meId) {
      const meNode = nodes.find(n => n.data.id === meId);
      if (meNode) {
        const t = d3.zoomIdentity
          .translate(width / 2 - meNode.x * 1.5, height / 2 - meNode.y * 1.5)
          .scale(1.5);
        svg.transition().duration(600).call(zoom.transform, t);
        return;
      }
    }
    if (nodes.length) {
      const xs = nodes.map(n => n.x);
      const ys = nodes.map(n => n.y);
      const minX = Math.min(...xs) - 100, maxX = Math.max(...xs) + 100;
      const minY = Math.min(...ys) - 50, maxY = Math.max(...ys) + 50;
      const dx = maxX - minX, dy = maxY - minY;
      const scale = Math.min(0.9, Math.min((width - 100) / dx, (height - 100) / dy));
      const t = d3.zoomIdentity
        .translate((width - dx * scale) / 2 - minX * scale, (height - dy * scale) / 2 - minY * scale + 40)
        .scale(scale);
      svg.transition().duration(600).call(zoom.transform, t);
    }
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
let currentPerson = null;

function showContextMenu(e, person) {
  currentPerson = person;
  menu.innerHTML = `
    <div data-action="setme">Set as Me</div>
    <div data-action="edit">Edit Properties</div>
    <div data-action="addchild">Add Child</div>
    <div data-action="addparent">Add Parent</div>
    <div data-action="addsibling">Add Sibling</div>
  `;
  menu.style.display = 'block';
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
}

document.addEventListener('click', () => menu.style.display = 'none');
menu.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (!action || !currentPerson) return;
  menu.style.display = 'none';
  if (action === 'setme') {
    meId = currentPerson.id;
    sessionStorage.setItem('meId', meId);
    render();
  } else if (action === 'edit') {
    openModal(currentPerson, 'Edit');
  } else if (action === 'addchild') {
    openModal(null, 'Add Child', { parentIds: [currentPerson.id] });
  } else if (action === 'addparent') {
    openModal(null, 'Add Parent', { asParentOf: currentPerson.id });
  } else if (action === 'addsibling') {
    openModal(null, 'Add Sibling', { parentIds: currentPerson.parentIds || [] });
  }
});

const modal = document.getElementById('modal');
const form = document.getElementById('person-form');
let editing = null;
let extra = {};

function openModal(person, title, extras = {}) {
  editing = person;
  extra = extras;
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

document.getElementById('modal-cancel').onclick = () => modal.classList.remove('show');
form.onsubmit = (e) => {
  e.preventDefault();
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
    Object.assign(editing, data);
  } else {
    const id = 'p' + Date.now();
    const newP = { id, parentIds: extra.parentIds || [], ...data };
    people.push(newP);
    if (extra.asParentOf) {
      const child = people.find(p => p.id === extra.asParentOf);
      if (child) {
        child.parentIds = child.parentIds || [];
        if (!child.parentIds.includes(id)) child.parentIds.push(id);
      }
    }
  }
  save();
  modal.classList.remove('show');
  render();
};

const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.dataset.theme = savedTheme;
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
window.addEventListener('resize', () => { });
