// ═══════════════════════════════════════════════════════
//  OFFLINE ROUTER — Dijkstra on OSM GeoJSON road network
//  + Google Maps export
// ═══════════════════════════════════════════════════════

const ROAD_SPEED = {
  primary: 80, secondary: 60, tertiary: 50,
  tertiary_link: 40, secondary_link: 40,
  residential: 30, living_street: 15,
  service: 20, raceway: 120, unclassified: 40
};
const TRAFFIC_PENALTY = { normal: 1, clear: 0.7, moderate: 1.5, slow: 2.5, jam: 6 };

// ── Graph ────────────────────────────────────────────────
let graph = {};      // nodeKey -> { lat, lng, edges: [{to, dist, featureId}] }
let nodeIndex = [];  // array of nodeKeys for KD-tree search

function nodeKey(lat, lng) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function haversine(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*toR)*Math.cos(b.lat*toR)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

function buildGraph() {
  graph = {};
  ROADS_GEOJSON.features.forEach(feat => {
    const coords = feat.geometry.coordinates; // [lng, lat]
    const p = feat.properties;
    if (p.blocked) return;
    const oneway = p.oneway === 'yes';
    const speed = ROAD_SPEED[p.highway] || 30;
    const featureId = p.id;

    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      const k = nodeKey(lat, lng);
      if (!graph[k]) graph[k] = { lat, lng, edges: [] };
    }

    for (let i = 0; i < coords.length - 1; i++) {
      const [lngA, latA] = coords[i];
      const [lngB, latB] = coords[i+1];
      const kA = nodeKey(latA, lngA), kB = nodeKey(latB, lngB);
      const dist = haversine({lat:latA,lng:lngA}, {lat:latB,lng:lngB});
      const baseCost = dist / speed;

      graph[kA].edges.push({ to: kB, dist, baseCost, featureId });
      if (!oneway) graph[kB].edges.push({ to: kA, dist, baseCost, featureId });
    }
  });

  nodeIndex = Object.keys(graph);
  console.log(`Graph built: ${nodeIndex.length} nodes`);
}

function nearestNode(lat, lng) {
  let best = null, bestD = Infinity;
  // Approximate search — within 0.01 degree radius first
  for (const k of nodeIndex) {
    const n = graph[k];
    const d = (n.lat - lat)**2 + (n.lng - lng)**2;
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const min = this.items[0];
    const end = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = end;
      this.sinkDown(0);
    }
    return min;
  }

  get length() {
    return this.items.length;
  }

  bubbleUp(index) {
    const item = this.items[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.items[parentIndex];
      if (item.cost >= parent.cost) break;
      this.items[parentIndex] = item;
      this.items[index] = parent;
      index = parentIndex;
    }
  }

  sinkDown(index) {
    const length = this.items.length;
    const item = this.items[index];

    while (true) {
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;
      let swapIndex = null;

      if (leftIndex < length && this.items[leftIndex].cost < item.cost) {
        swapIndex = leftIndex;
      }
      if (rightIndex < length) {
        const right = this.items[rightIndex];
        const leftCost = swapIndex === null ? item.cost : this.items[leftIndex].cost;
        if (right.cost < leftCost) swapIndex = rightIndex;
      }
      if (swapIndex === null) break;

      this.items[index] = this.items[swapIndex];
      this.items[swapIndex] = item;
      index = swapIndex;
    }
  }
}

// ── Dijkstra ─────────────────────────────────────────────
function dijkstra(startKey, endKey) {
  // Cost = time (seconds), penalised by traffic
  const costs = {}, prev = {}, visited = new Set();
  costs[startKey] = 0;
  const pq = new MinHeap();
  pq.push({ key: startKey, cost: 0 });

  // Lookup traffic status for a feature
  function trafficMul(featureId) {
    const rd = roadData[featureId];
    const s = rd ? (rd.traffic_status || 'normal') : 'normal';
    return TRAFFIC_PENALTY[s] || 1;
  }

  while (pq.length) {
    const { key, cost } = pq.pop();
    if (visited.has(key)) continue;
    visited.add(key);
    if (key === endKey) break;
    const node = graph[key];
    if (!node) continue;
    for (const edge of node.edges) {
      if (visited.has(edge.to)) continue;
      const newCost = cost + edge.baseCost * trafficMul(edge.featureId);
      if (newCost < (costs[edge.to] ?? Infinity)) {
        costs[edge.to] = newCost;
        prev[edge.to] = { from: key, featureId: edge.featureId, dist: edge.dist, baseCost: edge.baseCost };
        pq.push({ key: edge.to, cost: newCost });
      }
    }
  }

  if (costs[endKey] === undefined) return null;

  // Reconstruct path
  const path = [], featureIds = new Set();
  let cur = endKey;
  let totalDist = 0;
  let totalBaseTime = 0;
  while (prev[cur]) {
    const { from, featureId, dist, baseCost } = prev[cur];
    path.unshift(graph[cur]);
    featureIds.add(featureId);
    totalDist += dist;
    totalBaseTime += baseCost;
    cur = from;
  }
  path.unshift(graph[startKey]);

  return { path, featureIds, totalDist, totalBaseTime, totalTime: costs[endKey] };
}

// ── Route State ───────────────────────────────────────────
let routeMode = false;
let waypoints = [];          // [{lat, lng, marker}]
let routePolyline = null;
let routeHighlights = [];
let waypointStep = 0;        // 0=start, 1=end (simple A→B for now)

const WP_ICONS = {
  start: L.divIcon({ className:'', html:'<div style="width:20px;height:20px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 10px #22c55e;"></div>', iconAnchor:[10,10] }),
  end:   L.divIcon({ className:'', html:'<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 10px #ef4444;"></div>', iconAnchor:[10,10] }),
  via:   L.divIcon({ className:'', html:'<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 8px #3b82f6;"></div>', iconAnchor:[7,7] }),
};

function toggleRouteMode(enable) {
  routeMode = enable;
  // If demo was active, tear it down
  if (typeof demoActive !== 'undefined' && demoActive) {
    clearDemoLayers(); closeChatPanel(); demoActive = false;
    document.getElementById('panel-demo').style.display = 'none';
  }
  ['tab-traffic','tab-route','tab-demo'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('tab-active');
  });
  document.getElementById(enable ? 'tab-route' : 'tab-traffic').classList.add('tab-active');
  document.getElementById('panel-traffic').style.display = enable ? 'none' : 'flex';
  document.getElementById('panel-route').style.display   = enable ? 'flex' : 'none';
  const pd = document.getElementById('panel-demo'); if (pd) pd.style.display = 'none';

  if (enable) {
    map.getContainer().style.cursor = 'crosshair';
    showToast('Click map to place Start point');
  } else {
    map.getContainer().style.cursor = '';
    clearRoute();
  }
}


function handleRouteMapClick(e) {
  if (!routeMode) return;
  const { lat, lng } = e.latlng;

  if (waypoints.length === 0) {
    addWaypoint(lat, lng, 'start');
    showToast('Now click to place End point');
  } else if (waypoints.length === 1) {
    addWaypoint(lat, lng, 'end');
    calculateRoute();
  } else {
    // Insert as via point before end
    const end = waypoints.pop();
    end.marker.remove();
    addWaypoint(lat, lng, 'via');
    addWaypoint(end.lat, end.lng, 'end');
    calculateRoute();
  }
  updateWaypointList();
}

function addWaypoint(lat, lng, type) {
  const marker = L.marker([lat, lng], { icon: WP_ICONS[type], draggable: true })
    .addTo(map)
    .on('dragend', () => { waypoints.find(w=>w.marker===marker).lat = marker.getLatLng().lat; waypoints.find(w=>w.marker===marker).lng = marker.getLatLng().lng; calculateRoute(); });
  waypoints.push({ lat, lng, type, marker });
}

function clearRoute() {
  waypoints.forEach(w => w.marker.remove());
  waypoints = [];
  if (routePolyline) { routePolyline.remove(); routePolyline = null; }
  routeHighlights.forEach(l => l.remove());
  routeHighlights = [];
  document.getElementById('route-result').innerHTML = '';
  document.getElementById('route-gmaps-btn').style.display = 'none';
  updateWaypointList();
  if (routeMode) showToast('Route cleared — click to place Start');
}

function updateWaypointList() {
  const el = document.getElementById('waypoint-list');
  if (!el) return;
  if (waypoints.length === 0) { el.innerHTML = '<div style="color:var(--text3);font-size:11px;padding:4px 0">No waypoints yet</div>'; return; }
  el.innerHTML = waypoints.map((w, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">
      <span style="color:${w.type==='start'?'#22c55e':w.type==='end'?'#ef4444':'#3b82f6'};font-size:16px">●</span>
      <span style="flex:1;color:var(--text2)">${w.type==='start'?'Start':w.type==='end'?'End':'Via '+i} · ${w.lat.toFixed(5)}, ${w.lng.toFixed(5)}</span>
      <button onclick="removeWaypoint(${i})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px">✕</button>
    </div>
  `).join('');
}

function removeWaypoint(i) {
  waypoints[i].marker.remove();
  waypoints.splice(i, 1);
  updateWaypointList();
  if (waypoints.length >= 2) calculateRoute(); else { if (routePolyline) { routePolyline.remove(); routePolyline = null; } document.getElementById('route-result').innerHTML = ''; }
}

function calculateRoute() {
  if (waypoints.length < 2) return;
  if (Object.keys(graph).length === 0) { showToast('Building road graph…'); buildGraph(); }

  // Clear previous route visuals
  if (routePolyline) { routePolyline.remove(); routePolyline = null; }
  routeHighlights.forEach(l => l.remove()); routeHighlights = [];

  const start = waypoints[0], end = waypoints[waypoints.length - 1];
  const vias = waypoints.slice(1, -1);

  // Build leg list: start → via1 → via2 → end
  const legs = [];
  const points = [start, ...vias, end];
  let totalDist = 0, totalTime = 0;
  let fullPath = [];
  let allFeatureIds = new Set();
  let ok = true;

  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i], B = points[i+1];
    const nA = nearestNode(A.lat, A.lng);
    const nB = nearestNode(B.lat, B.lng);
    if (!nA || !nB) { ok = false; break; }
    const result = dijkstra(nA, nB);
    if (!result) { ok = false; break; }
    fullPath = fullPath.concat(result.path);
    result.featureIds.forEach(id => allFeatureIds.add(id));
    totalDist += result.totalDist;
    totalTime += result.totalTime;
    legs.push(result);
  }

  if (!ok || fullPath.length < 2) {
    document.getElementById('route-result').innerHTML = '<div style="color:#ef4444;font-size:11px;padding:6px 0">⚠️ No route found between these points</div>';
    return;
  }

  // Draw route polyline (animated dashed blue)
  const latlngs = fullPath.map(n => [n.lat, n.lng]);
  routePolyline = L.polyline(latlngs, {
    color: '#60a5fa', weight: 6, opacity: 0.9,
    dashArray: '12, 6', lineCap: 'round'
  }).addTo(map);

  // Highlight involved road segments by their traffic color with a glow border
  allFeatureIds.forEach(fid => {
    const layer = featureLayerMap[fid];
    if (layer) {
      const hl = L.geoJSON(layer.toGeoJSON(), {
        style: { color: '#fff', weight: 10, opacity: 0.15, lineCap: 'round' }
      }).addTo(map);
      routeHighlights.push(hl);
    }
  });

  map.fitBounds(routePolyline.getBounds(), { padding: [60, 60] });

  // Summary
  const distKm = (totalDist / 1000).toFixed(2);
  const mins = Math.round(totalTime / 60);
  const jammed = [...allFeatureIds].filter(id => {
    const r = roadData[id];
    return r && r.traffic_status === 'jam';
  }).length;

  document.getElementById('route-result').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:18px;font-weight:700;color:var(--accent)">${distKm}</div>
        <div style="font-size:10px;color:var(--text3)">km distance</div>
      </div>
      <div style="background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:18px;font-weight:700;color:${mins>15?'#f59e0b':'#22c55e'}">${mins}</div>
        <div style="font-size:10px;color:var(--text3)">min (est.)</div>
      </div>
    </div>
    ${jammed > 0 ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;font-size:11px;color:#ef4444">⚠️ Route passes through ${jammed} jammed segment(s)</div>` : '<div style="margin-top:8px;padding:6px 10px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:6px;font-size:11px;color:#22c55e">✓ Route is clear of traffic jams</div>'}
  `;

  // Store route for GMaps export
  window._lastRoute = { latlngs, totalDist, totalTime };
  document.getElementById('route-gmaps-btn').style.display = 'block';
}

function exportToGoogleMaps() {
  if (!window._lastRoute) return;
  const { latlngs } = window._lastRoute;
  if (latlngs.length < 2) return;

  const origin = `${latlngs[0][0]},${latlngs[0][1]}`;
  const dest = `${latlngs[latlngs.length-1][0]},${latlngs[latlngs.length-1][1]}`;

  // Sample up to 8 via waypoints evenly from the path
  let viaStr = '';
  if (latlngs.length > 2) {
    const step = Math.max(1, Math.floor(latlngs.length / 9));
    const sampled = [];
    for (let i = step; i < latlngs.length - 1; i += step) {
      if (sampled.length >= 8) break;
      sampled.push(`${latlngs[i][0].toFixed(6)},${latlngs[i][1].toFixed(6)}`);
    }
    if (sampled.length) viaStr = `&waypoints=${sampled.join('|')}`;
  }

  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${viaStr}&travelmode=driving`;
  window.open(url, '_blank');
  showToast('Opened route in Google Maps');
}

// Attach map click handler (called after map is ready)
function initRouter() {
  buildGraph();
  map.on('click', handleRouteMapClick);
}
