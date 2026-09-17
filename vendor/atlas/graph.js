const SVG_NS = 'http://www.w3.org/2000/svg';

const TYPES = {
  problem: { label: 'Problem', color: '#527bb4', fill: '#edf3fb' },
  idea: { label: 'Idea', color: '#9675bb', fill: '#f4effb' },
  paper: { label: 'Paper', color: '#b88c47', fill: '#fcf5e8' },
  capability: { label: 'Capability', color: '#478f87', fill: '#ecf6f3' },
  resource: { label: 'Resource', color: '#84944e', fill: '#f3f5e8' },
  project: { label: 'Project', color: '#647b93', fill: '#eef2f6' },
  reflection: { label: 'Reflection', color: '#b37688', fill: '#fbf0f3' },
  person: { label: 'Person', color: '#4b96aa', fill: '#edf7fa' },
  claim: { label: 'Claim', color: '#aa785f', fill: '#faf0e9' },
};

const CARD_WIDTH = 154;
const CARD_HEIGHT = 74;
let instanceCount = 0;

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return (result >>> 0) / 4294967295;
}

function titleLines(title, limit = 23) {
  const text = String(title || 'Untitled').trim();
  if (/[^\x00-\x7F]/.test(text)) {
    const lines = [];
    let line = ''; let width = 0;
    for (const character of [...text]) {
      const weight = /[^\x00-\x7F]/.test(character) ? 2.15 : character === ' ' ? 0.6 : 1;
      if (width + weight > limit && line) { lines.push(line.trim()); line = ''; width = 0; }
      line += character; width += weight;
    }
    if (line) lines.push(line.trim());
    if (lines.length > 2) return [lines[0], `${lines[1].slice(0, -1)}…`];
    return lines;
  }
  const words = text.split(/\s+/);
  // Character wrapping also keeps Chinese titles and unbroken identifiers inside a card.
  const units = words.length === 1 && text.length > limit ? [...text] : words;
  const separator = units === words ? ' ' : '';
  const lines = [];
  let line = '';
  for (const word of units) {
    const candidate = line ? `${line}${separator}${word}` : word;
    if (candidate.length > limit && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  if (lines.length > 2) return [lines[0], `${lines[1].slice(0, limit - 1).trimEnd()}…`];
  return lines.map(item => item.length > limit ? `${item.slice(0, limit - 1)}…` : item);
}

function edgeEndpoint(from, toward, padding = 0) {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (!dx && !dy) return { x: from.x, y: from.y };
  const factor = Math.min((CARD_WIDTH / 2 + padding) / Math.max(Math.abs(dx), 0.001),
    (CARD_HEIGHT / 2 + padding) / Math.max(Math.abs(dy), 0.001));
  return { x: from.x + dx * factor, y: from.y + dy * factor };
}

function layoutGraph(nodes, edges, viewportWidth, viewportHeight) {
  const width = Math.max(360, viewportWidth);
  const height = Math.max(420, viewportHeight);
  const count = nodes.length;
  if (!count) return new Map();
  const columns = Math.max(2, Math.min(count, Math.floor((width - 12) / 184)));
  const rows = Math.ceil(count / columns);
  const spaceX = 188;
  const spaceY = 113;
  const ordering = ['paper', 'problem', 'idea', 'capability', 'project', 'resource', 'reflection', 'person'];
  const ordered = [...nodes].sort((a, b) => {
    const aRank = ordering.indexOf(a.type);
    const bRank = ordering.indexOf(b.type);
    return aRank - bRank || String(a.id).localeCompare(String(b.id));
  });
  const positions = ordered.map((node, index) => {
    const row = Math.floor(index / columns);
    const itemsInRow = Math.min(columns, count - row * columns);
    const x = width / 2 + (index % columns - (itemsInRow - 1) / 2) * spaceX;
    const y = height / 2 + (row - (rows - 1) / 2) * spaceY;
    return {
      id: node.id, x, y, anchorX: x, anchorY: y,
      vx: 0, vy: 0,
    };
  });
  const lookup = new Map(positions.map(position => [position.id, position]));
  const links = edges.filter(edge => lookup.has(edge.source) && lookup.has(edge.target) && edge.source !== edge.target);

  // Deterministic settling keeps the map recognizable while giving connected cards natural clusters.
  for (let iteration = 0; iteration < 160; iteration += 1) {
    const cooling = 1 - iteration / 190;
    for (const position of positions) {
      position.vx += (position.anchorX - position.x) * 0.07;
      position.vy += (position.anchorY - position.y) * 0.07;
    }
    for (const edge of links) {
      const source = lookup.get(edge.source);
      const target = lookup.get(edge.target);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance - 188) * 0.005;
      source.vx += dx / distance * force;
      source.vy += dy / distance * force;
      target.vx -= dx / distance * force;
      target.vy -= dy / distance * force;
    }
    for (let a = 0; a < positions.length; a += 1) {
      for (let b = a + 1; b < positions.length; b += 1) {
        const first = positions[a];
        const second = positions[b];
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        if (Math.abs(dx) + Math.abs(dy) < 0.01) { dx = 1; dy = hash(first.id) - 0.5; }
        const distance = Math.max(10, Math.hypot(dx, dy));
        const force = 1250 / (distance * distance);
        first.vx -= dx / distance * force;
        first.vy -= dy / distance * force;
        second.vx += dx / distance * force;
        second.vy += dy / distance * force;
        const overlapX = CARD_WIDTH + 38 - Math.abs(dx);
        const overlapY = CARD_HEIGHT + 36 - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY * 1.3) {
            const push = Math.sign(dx || 1) * overlapX * 0.15;
            first.vx -= push; second.vx += push;
          } else {
            const push = Math.sign(dy || 1) * overlapY * 0.15;
            first.vy -= push; second.vy += push;
          }
        }
      }
    }
    for (const position of positions) {
      position.vx *= 0.64;
      position.vy *= 0.64;
      position.x += Math.max(-10, Math.min(10, position.vx)) * cooling;
      position.y += Math.max(-10, Math.min(10, position.vy)) * cooling;
    }
  }
  // A final constraint pass guarantees that cards do not intersect after the settling step.
  for (let iteration = 0; iteration < 60; iteration += 1) {
    let adjusted = false;
    for (let a = 0; a < positions.length; a += 1) {
      for (let b = a + 1; b < positions.length; b += 1) {
        const first = positions[a]; const second = positions[b];
        const dx = second.x - first.x; const dy = second.y - first.y;
        const overlapX = CARD_WIDTH + 30 - Math.abs(dx);
        const overlapY = CARD_HEIGHT + 30 - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          adjusted = true;
          if (overlapX < overlapY * 1.3) {
            const amount = (overlapX / 2 + 0.1) * Math.sign(dx || 1);
            first.x -= amount; second.x += amount;
          } else {
            const amount = (overlapY / 2 + 0.1) * Math.sign(dy || 1);
            first.y -= amount; second.y += amount;
          }
        }
      }
    }
    if (!adjusted) break;
  }
  return lookup;
}

/**
 * Mount an independent SVG research graph. Call destroy() when removing its host.
 * onSelect receives a node id. Optional onConnect receives (sourceId, targetId)
 * when the user Shift-clicks a second node while a node is selected.
 */
export function mountGraph(container, options = {}) {
  if (!container) throw new Error('mountGraph requires a container element.');
  const uid = `atlas-graph-${++instanceCount}`;
  let nodes = options.nodes || [];
  let edges = options.edges || [];
  let selectedId = options.selectedId || null;
  let positions = new Map();
  let viewport = { width: 800, height: 480 };
  let camera = { x: 0, y: 0, scale: 1 };
  let destroyed = false;
  let resizeFrame;
  let pointer = null;
  let suppressClick = false;
  let layoutSignature = '';
  const events = new AbortController();

  const root = document.createElement('div');
  root.className = 'atlas-graph';
  const svg = svgElement('svg', {
    class: 'atlas-graph-svg', role: 'group',
    'aria-label': 'Research connection map. Select a node to inspect its connections. Drag to pan, or use the map zoom controls.',
    viewBox: '0 0 800 480',
  });
  const defs = svgElement('defs');
  const pattern = svgElement('pattern', { id: `${uid}-dots`, width: 22, height: 22, patternUnits: 'userSpaceOnUse' });
  pattern.append(svgElement('circle', { cx: 1, cy: 1, r: 0.7, fill: '#bac4d2', opacity: 0.38 }));
  defs.append(pattern);
  for (const [name, color] of [['normal', '#a2afbf'], ['active', '#667c9e'], ['suggested', '#b69a67']]) {
    const marker = svgElement('marker', {
      id: `${uid}-arrow-${name}`, viewBox: '0 0 10 10', refX: 8.5, refY: 5,
      markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse', markerUnits: 'strokeWidth',
    });
    marker.append(svgElement('path', { d: 'M 1 1 L 9 5 L 1 9', fill: 'none', stroke: color, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    defs.append(marker);
  }
  svg.append(defs, svgElement('rect', { width: '100%', height: '100%', fill: `url(#${uid}-dots)`, 'pointer-events': 'none' }));
  const scene = svgElement('g', { class: 'atlas-graph-scene' });
  const edgeLayer = svgElement('g', { class: 'atlas-graph-edges', 'aria-hidden': 'true' });
  const nodeLayer = svgElement('g', { class: 'atlas-graph-nodes' });
  const labelLayer = svgElement('g', { class: 'atlas-graph-labels', 'aria-hidden': 'true', 'pointer-events': 'none' });
  scene.append(edgeLayer, nodeLayer, labelLayer);
  svg.append(scene);

  const empty = document.createElement('div');
  empty.className = 'atlas-graph-empty';
  const emptyTitle = document.createElement('strong');
  emptyTitle.textContent = 'A little space for your next connection';
  const emptyDescription = document.createElement('p');
  emptyDescription.textContent = 'Add a note, or change your filters to bring something into view.';
  empty.append(emptyTitle, emptyDescription);
  const hint = document.createElement('div');
  hint.className = 'atlas-graph-hint';
  hint.setAttribute('aria-hidden', 'true');
  const list = document.createElement('details');
  list.className = 'atlas-graph-list';
  const summary = document.createElement('summary');
  summary.textContent = 'Node list';
  const listContent = document.createElement('div');
  listContent.className = 'atlas-graph-list-items';
  listContent.setAttribute('aria-label', 'Select a research node');
  list.append(summary, listContent);
  const announcement = document.createElement('div');
  announcement.className = 'atlas-graph-sr-only';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  root.append(svg, empty, hint, list, announcement);
  container.append(root);

  function connectedIds() {
    const ids = new Set(selectedId ? [selectedId] : []);
    if (selectedId) for (const edge of edges) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    return ids;
  }

  function setCamera() {
    scene.setAttribute('transform', `translate(${camera.x},${camera.y}) scale(${camera.scale})`);
  }

  function reset(fitAll = true) {
    if (!positions.size) { camera = { x: 0, y: 0, scale: 1 }; setCamera(); return; }
    const points = [...positions.values()];
    const minX = Math.min(...points.map(point => point.x)) - CARD_WIDTH / 2;
    const maxX = Math.max(...points.map(point => point.x)) + CARD_WIDTH / 2;
    const minY = Math.min(...points.map(point => point.y)) - CARD_HEIGHT / 2;
    const maxY = Math.max(...points.map(point => point.y)) + CARD_HEIGHT / 2;
    const fittedScale = Math.min(1.12, (viewport.width - 50) / (maxX - minX + 36), (viewport.height - 98) / (maxY - minY + 30));
    const scale = fitAll ? Math.max(0.16, fittedScale) : Math.max(0.85, fittedScale);
    camera = {
      scale,
      x: viewport.width / 2 - (minX + maxX) / 2 * scale,
      y: (viewport.height - 16) / 2 - (minY + maxY) / 2 * scale,
    };
    if (!fitAll) revealSelection();
    setCamera();
  }

  function revealSelection() {
    const position = positions.get(selectedId);
    if (!position) return;
    const left = camera.x + (position.x - CARD_WIDTH / 2) * camera.scale;
    const right = camera.x + (position.x + CARD_WIDTH / 2) * camera.scale;
    const top = camera.y + (position.y - CARD_HEIGHT / 2) * camera.scale;
    const bottom = camera.y + (position.y + CARD_HEIGHT / 2) * camera.scale;
    if (left < 24) camera.x += 24 - left;
    else if (right > viewport.width - 24) camera.x -= right - viewport.width + 24;
    if (top < 65) camera.y += 65 - top;
    else if (bottom > viewport.height - 64) camera.y -= bottom - viewport.height + 64;
    setCamera();
  }

  function zoom(factor, anchor = { x: viewport.width / 2, y: viewport.height / 2 }) {
    const next = Math.max(0.16, Math.min(2.7, camera.scale * factor));
    const ratio = next / camera.scale;
    camera.x = anchor.x - (anchor.x - camera.x) * ratio;
    camera.y = anchor.y - (anchor.y - camera.y) * ratio;
    camera.scale = next;
    setCamera();
  }

  function localPoint(event) {
    const bounds = svg.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * viewport.width / bounds.width,
      y: (event.clientY - bounds.top) * viewport.height / bounds.height };
  }

  function renderEdges() {
    const fragment = document.createDocumentFragment();
    const labels = document.createDocumentFragment();
    const occupiedLabels = [];
    for (const edge of edges) {
      const source = positions.get(edge.source); const target = positions.get(edge.target);
      if (!source || !target) continue;
      const active = selectedId && (edge.source === selectedId || edge.target === selectedId);
      const suggested = edge.status === 'suggested';
      const kind = suggested ? 'suggested' : active ? 'active' : 'normal';
      let d; let labelPoint;
      if (edge.source === edge.target) {
        d = `M ${source.x - 36} ${source.y - 37} C ${source.x - 66} ${source.y - 108}, ${source.x + 66} ${source.y - 108}, ${source.x + 36} ${source.y - 40}`;
        labelPoint = { x: source.x, y: source.y - 91 };
      } else {
        const start = edgeEndpoint(source, target, 3);
        const end = edgeEndpoint(target, source, 7);
        const distance = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
        const bend = (hash(edge.id || `${edge.source}-${edge.target}`) - 0.5) * 38;
        const control = { x: (start.x + end.x) / 2 - (end.y - start.y) / distance * bend,
          y: (start.y + end.y) / 2 + (end.x - start.x) / distance * bend };
        d = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
        labelPoint = { x: start.x * 0.25 + control.x * 0.5 + end.x * 0.25,
          y: start.y * 0.25 + control.y * 0.5 + end.y * 0.25 };
      }
      const path = svgElement('path', {
        d, class: `atlas-graph-edge${active ? ' is-active' : ''}${selectedId && !active ? ' is-dim' : ''}${suggested ? ' is-suggested' : ''}`,
        'marker-end': `url(#${uid}-arrow-${kind})`,
      });
      fragment.append(path);
      if (active && edge.relation) {
        const relation = String(edge.relation).replace(/[_-]/g, ' ');
        const text = relation.length > 31 ? `${relation.slice(0, 30)}…` : relation;
        const width = Math.max(48, [...text].reduce((sum, character) => sum + (/[^\x00-\x7F]/.test(character) ? 12 : 6.5), 0) + 16);
        const box = { left: labelPoint.x - width / 2, right: labelPoint.x + width / 2,
          top: labelPoint.y - 12, bottom: labelPoint.y + 13 };
        const intersects = other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top;
        const hitsNode = [...positions.values()].some(position => intersects({
          left: position.x - CARD_WIDTH / 2 - 5, right: position.x + CARD_WIDTH / 2 + 5,
          top: position.y - CARD_HEIGHT / 2 - 5, bottom: position.y + CARD_HEIGHT / 2 + 5,
        }));
        // The inspector always retains the relation. Keep the map's labels only where
        // they can be read without covering a card or another relationship label.
        if (hitsNode || occupiedLabels.some(intersects)) continue;
        occupiedLabels.push(box);
        const group = svgElement('g', { class: `atlas-graph-edge-label${suggested ? ' is-suggested' : ''}`, transform: `translate(${labelPoint.x},${labelPoint.y})` });
        group.append(svgElement('rect', { x: -width / 2, y: -11, width, height: 23, rx: 6 }));
        const label = svgElement('text', { y: 4, 'text-anchor': 'middle' });
        label.textContent = text;
        group.append(label);
        labels.append(group);
      }
    }
    edgeLayer.replaceChildren(fragment);
    labelLayer.replaceChildren(labels);
  }

  function renderNodes() {
    const neighbors = connectedIds();
    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
      const position = positions.get(node.id);
      if (!position) continue;
      const type = TYPES[node.type] || TYPES.project;
      const group = svgElement('g', {
        class: `atlas-graph-node${node.id === selectedId ? ' is-selected' : ''}${selectedId && !neighbors.has(node.id) ? ' is-dim' : ''}`,
        transform: `translate(${position.x},${position.y})`, 'data-node-id': node.id,
        tabindex: 0, role: 'button', 'aria-label': `${type.label}: ${node.title || 'Untitled'}`,
        'aria-pressed': String(node.id === selectedId),
      });
      group.style.setProperty('--node-color', type.color);
      group.style.setProperty('--node-fill', type.fill);
      const title = svgElement('title');
      title.textContent = `${node.title || 'Untitled'}${options.onConnect && selectedId && node.id !== selectedId ? '\nShift-click to connect to the selected node.' : ''}`;
      group.append(title, svgElement('rect', { class: 'atlas-graph-node-halo', x: -CARD_WIDTH / 2 - 5, y: -CARD_HEIGHT / 2 - 5, width: CARD_WIDTH + 10, height: CARD_HEIGHT + 10, rx: 19 }),
        svgElement('rect', { class: 'atlas-graph-node-surface', x: -CARD_WIDTH / 2, y: -CARD_HEIGHT / 2, width: CARD_WIDTH, height: CARD_HEIGHT, rx: 13 }),
        svgElement('circle', { class: 'atlas-graph-node-dot', cx: -CARD_WIDTH / 2 + 17, cy: -21, r: 3 }));
      const category = svgElement('text', { class: 'atlas-graph-node-type', x: -CARD_WIDTH / 2 + 26, y: -17.5 });
      category.textContent = type.label;
      group.append(category);
      const lines = titleLines(node.title, 22);
      const label = svgElement('text', { class: 'atlas-graph-node-title', x: -CARD_WIDTH / 2 + 14, y: lines.length === 1 ? 8 : 3 });
      lines.forEach((line, index) => {
        const tspan = svgElement('tspan', { x: -CARD_WIDTH / 2 + 14, dy: index ? 16 : 0 });
        tspan.textContent = line;
        label.append(tspan);
      });
      group.append(label);
      fragment.append(group);
    }
    nodeLayer.replaceChildren(fragment);
  }

  function renderList() {
    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
      const button = document.createElement('button');
      const type = TYPES[node.type] || TYPES.project;
      button.type = 'button';
      button.dataset.nodeId = node.id;
      button.style.setProperty('--node-color', type.color);
      button.setAttribute('aria-pressed', String(node.id === selectedId));
      const label = document.createElement('span');
      label.textContent = type.label;
      button.append(label, document.createTextNode(node.title || 'Untitled'));
      fragment.append(button);
    }
    listContent.replaceChildren(fragment);
  }

  function paint() {
    const focusId = document.activeElement?.getAttribute('data-node-id');
    const focusInSvg = document.activeElement?.closest('.atlas-graph-nodes');
    renderEdges(); renderNodes(); renderList();
    empty.hidden = nodes.length > 0;
    list.hidden = nodes.length === 0;
    hint.hidden = nodes.length === 0;
    hint.textContent = selectedId ? 'Your selected neighborhood · drag to explore' : 'Drag to explore · Fit map shows every element';
    if (focusId && focusInSvg) {
      [...nodeLayer.children].find(element => element.getAttribute('data-node-id') === focusId)?.focus({ preventScroll: true });
    }
  }

  function choose(id, shiftKey = false) {
    if (shiftKey && selectedId && selectedId !== id && options.onConnect) {
      options.onConnect(selectedId, id);
      return;
    }
    selectedId = id;
    revealSelection();
    paint();
    const node = nodes.find(item => item.id === id);
    const connectionCount = edges.filter(edge => edge.source === id || edge.target === id).length;
    announcement.textContent = `${node?.title || 'Node'} selected. ${connectionCount} connection${connectionCount === 1 ? '' : 's'}.`;
    options.onSelect?.(id);
  }

  function rebuild(forceLayout = false) {
    const signature = `${nodes.map(node => `${node.id}:${node.type}`).sort().join('|')}::${edges.map(edge => `${edge.source}>${edge.target}`).sort().join('|')}`;
    if (forceLayout || signature !== layoutSignature) {
      layoutSignature = signature;
      positions = layoutGraph(nodes, edges, viewport.width, viewport.height);
      reset(false);
    }
    paint();
  }

  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const point = localPoint(event);
    const nodeId = event.target.closest('[data-node-id]')?.getAttribute('data-node-id');
    const position = positions.get(nodeId);
    pointer = { id: event.pointerId, nodeId, start: point, moved: false,
      x: position?.x ?? camera.x, y: position?.y ?? camera.y };
    svg.setPointerCapture(event.pointerId);
  }, { signal: events.signal });
  svg.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const point = localPoint(event);
    const dx = point.x - pointer.start.x; const dy = point.y - pointer.start.y;
    if (!pointer.moved && Math.hypot(dx, dy) < 4) return;
    pointer.moved = true;
    root.classList.add('is-dragging');
    if (pointer.nodeId && positions.has(pointer.nodeId)) {
      const position = positions.get(pointer.nodeId);
      position.x = pointer.x + dx / camera.scale;
      position.y = pointer.y + dy / camera.scale;
      const group = [...nodeLayer.children].find(element => element.getAttribute('data-node-id') === pointer.nodeId);
      group?.setAttribute('transform', `translate(${position.x},${position.y})`);
      renderEdges();
    } else {
      camera.x = pointer.x + dx; camera.y = pointer.y + dy; setCamera();
    }
  }, { signal: events.signal });
  function endPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    suppressClick = pointer.moved;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (!pointer.moved && pointer.nodeId && event.type !== 'pointercancel') choose(pointer.nodeId, event.shiftKey);
    pointer = null;
    root.classList.remove('is-dragging');
  }
  svg.addEventListener('pointerup', endPointer, { signal: events.signal });
  svg.addEventListener('pointercancel', endPointer, { signal: events.signal });
  svg.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    // Assistive technologies may synthesize click without the pointer events above.
    if (event.detail === 0) {
      const id = event.target.closest('[data-node-id]')?.getAttribute('data-node-id');
      if (id) choose(id, event.shiftKey);
    }
  }, { signal: events.signal });
  svg.addEventListener('keydown', event => {
    const id = event.target.closest('[data-node-id]')?.getAttribute('data-node-id');
    if (id && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(id, event.shiftKey); }
    if (id && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const elements = [...nodeLayer.children];
      const index = elements.findIndex(element => element.getAttribute('data-node-id') === id);
      const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      elements[(index + direction + elements.length) % elements.length]?.focus({ preventScroll: true });
    }
  }, { signal: events.signal });
  svg.addEventListener('wheel', event => {
    // Let normal trackpad scrolling continue through the page; Ctrl/⌘ + wheel zooms the map.
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoom(Math.exp(-event.deltaY * 0.005), localPoint(event));
  }, { passive: false, signal: events.signal });
  listContent.addEventListener('click', event => {
    const button = event.target.closest('button[data-node-id]');
    if (!button) return;
    choose(button.dataset.nodeId, event.shiftKey);
    const selectedButton = [...listContent.children].find(item => item.dataset.nodeId === selectedId);
    selectedButton?.focus({ preventScroll: true });
  }, { signal: events.signal });

  function resize() {
    if (destroyed) return;
    const bounds = root.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    const width = Math.round(bounds.width); const height = Math.round(bounds.height);
    if (width === viewport.width && height === viewport.height && positions.size) return;
    viewport = { width, height };
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    rebuild(true);
  }
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  observer.observe(root);
  rebuild(true);
  resize();

  return {
    update(next = {}) {
      if (destroyed) return;
      const previousSelection = selectedId;
      if (Object.hasOwn(next, 'nodes')) nodes = next.nodes || [];
      if (Object.hasOwn(next, 'edges')) edges = next.edges || [];
      if (Object.hasOwn(next, 'selectedId')) selectedId = next.selectedId || null;
      if (selectedId && !nodes.some(node => node.id === selectedId)) selectedId = null;
      rebuild();
      if (previousSelection !== selectedId) revealSelection();
    },
    zoomIn() { if (!destroyed) zoom(1.22); },
    zoomOut() { if (!destroyed) zoom(1 / 1.22); },
    reset() { if (!destroyed) reset(); },
    destroy() {
      destroyed = true;
      events.abort(); observer.disconnect(); cancelAnimationFrame(resizeFrame);
      root.remove();
    },
  };
}
