// ═══════════════════════════════════════════════════════════════
//  DEMO.JS — Traffic Simulation, Checkpoints & Chat
//  3 pre-defined routes from periphery → Boulevard World center
//  Incidents, police checkpoints, heatmap, live chat comms
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CENTER_PT = [24.776217, 46.602357];
let eventCenter = [...DEFAULT_CENTER_PT];
let eventCenterRoadDistanceM = 0;

const HISTORICAL_EVENT_BASELINE = {
  avgVisitors: 42000,
  vehicleShare: 0.58,
  avgVehicleOccupancy: 2.7,
  peakArrivalShare: 0.32,
  checkpointCapacity: 1150
};

const DEMO_ROUTE_TEMPLATES = [
  { id:'nw',    name:'NW Corridor',    label:'Northwest arrivals -> Event Center', bearing:315, status:'jam' },
  { id:'east',  name:'East Corridor',  label:'Eastern arrivals -> Event Center',   bearing:90,  status:'slow' },
  { id:'south', name:'South Corridor', label:'Southern arrivals -> Event Center',  bearing:180, status:'moderate' }
];

const INCIDENT_TEMPLATES = [
  { id:'i1', route:'nw',    bearing:315, dist:3600, severity:'jam',      desc:'Multi-vehicle collision — 3 lanes blocked' },
  { id:'i2', route:'nw',    bearing:315, dist:2300, severity:'slow',     desc:'Signal failure — manual control active' },
  { id:'i3', route:'nw',    bearing:315, dist:4600, severity:'moderate', desc:'Congestion — slow-moving vehicles' },
  { id:'i4', route:'east',  bearing:90,  dist:3200, severity:'slow',     desc:'Heavy vehicle restriction — lane closure' },
  { id:'i5', route:'east',  bearing:90,  dist:1900, severity:'moderate', desc:'Lane merge — 30% capacity reduction' },
  { id:'i6', route:'south', bearing:180, dist:3100, severity:'jam',      desc:'Road works contraflow — 1 lane only' },
  { id:'i7', route:'south', bearing:180, dist:2100, severity:'slow',     desc:'School zone — reduced speed limit active' },
];

const CHECKPOINT_TEMPLATES = [
  { id:'cp-a', bearing:315, dist:3600, name:'Junction Alpha — NW Gate',    officer:'Cpl. Al-Harbi',    unit:'Unit 7',  zone:'NW' },
  { id:'cp-b', bearing:315, dist:2100, name:'Junction Bravo — NW Mid',     officer:'Sgt. Al-Qahtani', unit:'Unit 12', zone:'NW' },
  { id:'cp-c', bearing:90,  dist:3200, name:'Junction Charlie — East Gate', officer:'Cpl. Al-Dosari',  unit:'Unit 3',  zone:'E'  },
  { id:'cp-d', bearing:180, dist:3100, name:'Junction Delta — South Gate',  officer:'Sgt. Al-Shehri',  unit:'Unit 9',  zone:'S'  },
  { id:'cp-e', bearing:235, dist:1100, name:'Junction Echo — SW Entry',     officer:'Cpl. Al-Ghamdi',  unit:'Unit 5',  zone:'SW' },
  { id:'cp-f', bearing:45,  dist:1300, name:'Junction Foxtrot — NE Entry',  officer:'Sgt. Al-Zahrani', unit:'Unit 14', zone:'NE' },
];

// ── Pre-defined Routes ──────────────────────────────────────────
const DEMO_ROUTES = [
  {
    id: 'nw', name: 'NW Corridor', label: 'King Fahd Rd → Boulevard World',
    anchors: [
      [24.809, 46.563],[24.801, 46.571],[24.793, 46.579],
      [24.786, 46.588],[24.781, 46.595], eventCenter
    ],
    status: 'jam'
  },
  {
    id: 'east', name: 'East Corridor', label: 'Al Urubah Rd → Boulevard World',
    anchors: [
      [24.779, 46.649],[24.779, 46.637],[24.778, 46.624],
      [24.777, 46.613],[24.776, 46.607], eventCenter
    ],
    status: 'slow'
  },
  {
    id: 'south', name: 'South Corridor', label: 'Olaya St → Boulevard World',
    anchors: [
      [24.744, 46.601],[24.752, 46.601],[24.760, 46.601],
      [24.768, 46.601],[24.773, 46.601], eventCenter
    ],
    status: 'moderate'
  }
];

// ── Incidents along routes ──────────────────────────────────────
const INCIDENTS = [
  { id:'i1', lat:24.801, lng:46.571, route:'nw',    severity:'jam',      desc:'Multi-vehicle collision — 3 lanes blocked' },
  { id:'i2', lat:24.786, lng:46.588, route:'nw',    severity:'slow',     desc:'Signal failure — manual control active' },
  { id:'i3', lat:24.793, lng:46.579, route:'nw',    severity:'moderate', desc:'Congestion — slow-moving vehicles' },
  { id:'i4', lat:24.779, lng:46.637, route:'east',  severity:'slow',     desc:'Heavy vehicle restriction — lane closure' },
  { id:'i5', lat:24.778, lng:46.624, route:'east',  severity:'moderate', desc:'Lane merge — 30% capacity reduction' },
  { id:'i6', lat:24.752, lng:46.601, route:'south', severity:'jam',      desc:'Road works contraflow — 1 lane only' },
  { id:'i7', lat:24.760, lng:46.601, route:'south', severity:'slow',     desc:'School zone — reduced speed limit active' },
];

// ── Police Checkpoints ──────────────────────────────────────────
const CHECKPOINTS = [
  { id:'cp-a', lat:24.801, lng:46.571, name:'Junction Alpha — NW Gate',      officer:'Cpl. Al-Harbi',    unit:'Unit 7',  zone:'NW' },
  { id:'cp-b', lat:24.786, lng:46.588, name:'Junction Bravo — NW Mid',       officer:'Sgt. Al-Qahtani', unit:'Unit 12', zone:'NW' },
  { id:'cp-c', lat:24.779, lng:46.637, name:'Junction Charlie — East Gate',   officer:'Cpl. Al-Dosari',  unit:'Unit 3',  zone:'E'  },
  { id:'cp-d', lat:24.752, lng:46.601, name:'Junction Delta — South Gate',    officer:'Sgt. Al-Shehri',  unit:'Unit 9',  zone:'S'  },
  { id:'cp-e', lat:24.776, lng:46.595, name:'Junction Echo — SW Entry',       officer:'Cpl. Al-Ghamdi',  unit:'Unit 5',  zone:'SW' },
  { id:'cp-f', lat:24.777, lng:46.609, name:'Junction Foxtrot — NE Entry',    officer:'Sgt. Al-Zahrani', unit:'Unit 14', zone:'NE' },
];

const QUICK_MSGS = [
  'Move to adjacent junction immediately',
  'Redirect incoming traffic — route congested',
  'Backup requested at your location',
  'Signal override authorised — manual control',
  'Incident cleared — resume normal flow',
  'VIP convoy approaching — hold all traffic',
  'Open emergency lane northbound',
];

const OFFICER_REPLIES = [
  'Understood. Moving now.',
  'Roger that. On my way.',
  'Confirmed. Will redirect traffic.',
  'Copy. Situation noted.',
  'Acknowledged. Backup en route.',
  'Received. Implementing now.',
  'All units alerted.',
];

const SIM_STATUSES = ['jam','jam','slow','moderate','slow','clear'];
const SIM_SEVS    = ['jam','slow','moderate','jam','slow','moderate'];

// ── State ───────────────────────────────────────────────────────
let demoActive    = false;
let demoLayers    = [];
let heatLayer     = null;
let chatCp        = null;
const chatHistory = {};   // cpId → [{from,text,time}]
let demoGraph     = null; // Undirected graph used only for demo visualization fallback
let selectedAltRouteId = null;

const ALT_COLOR = '#38bdf8';
const ALT_ROUTE_PENALTY = 12;

// ── Event Center ────────────────────────────────────────────────
function offsetLatLng(center, bearingDeg, distanceM) {
  const R = 6371000;
  const bearing = bearingDeg * Math.PI / 180;
  const lat1 = center[0] * Math.PI / 180;
  const lng1 = center[1] * Math.PI / 180;
  const d = distanceM / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return [lat2 * 180 / Math.PI, lng2 * 180 / Math.PI];
}

function nearestRoadDistance(latlng) {
  if (!nodeIndex || nodeIndex.length === 0) buildGraph();
  const k = nearestNode(latlng[0], latlng[1]);
  if (!k || !graph[k]) return Infinity;
  return haversine({ lat:latlng[0], lng:latlng[1] }, graph[k]);
}

function buildCorridorAnchors(center, bearing) {
  return [5200, 3900, 2600, 1350, 450, 0].map(dist => offsetLatLng(center, bearing, dist));
}

function clearRouteCaches() {
  DEMO_ROUTES.forEach(route => {
    route.roadPath = null;
    route.featureIds = new Set();
    route.alternate = null;
    route.distanceM = 0;
    route.baseTimeSec = 0;
    route.trafficTimeSec = 0;
  });
  selectedAltRouteId = null;
}

function rebuildScenarioAroundCenter() {
  eventCenterRoadDistanceM = nearestRoadDistance(eventCenter);
  DEMO_ROUTE_TEMPLATES.forEach((tpl, i) => {
    const route = DEMO_ROUTES[i];
    route.id = tpl.id;
    route.name = tpl.name;
    route.label = tpl.label;
    route.status = route.status || tpl.status;
    route.anchors = buildCorridorAnchors(eventCenter, tpl.bearing);
  });

  INCIDENT_TEMPLATES.forEach((tpl, i) => {
    const inc = INCIDENTS[i];
    const [lat, lng] = offsetLatLng(eventCenter, tpl.bearing, tpl.dist);
    Object.assign(inc, tpl, { lat, lng });
  });

  CHECKPOINT_TEMPLATES.forEach((tpl, i) => {
    const cp = CHECKPOINTS[i];
    const [lat, lng] = offsetLatLng(eventCenter, tpl.bearing, tpl.dist);
    Object.assign(cp, tpl, { lat, lng });
  });

  clearRouteCaches();
}

function setEventCenter(latlng, opts = {}) {
  ensureDemoGraph();
  const dist = nearestRoadDistance(latlng);
  if (dist > 2500) {
    if (!opts.quiet && typeof showToast === 'function') showToast('Select a point closer to the mapped road network');
    return false;
  }

  eventCenter = [latlng[0], latlng[1]];
  eventCenterRoadDistanceM = dist;
  rebuildScenarioAroundCenter();
  if (demoActive) {
    drawDemoLayers();
    map.flyTo(eventCenter, opts.zoom || 14, { duration:0.8 });
  }
  if (!opts.quiet && typeof showToast === 'function') showToast('Event center updated');
  return true;
}

function resetEventCenter() {
  setEventCenter([...DEFAULT_CENTER_PT], { zoom:14 });
}

function handleDemoMapClick(e) {
  if (!demoActive || routeMode) return;
  setEventCenter([e.latlng.lat, e.latlng.lng]);
}

function roadAccessScore() {
  const radiusM = 1800;
  let nearby = 0;
  ROADS_GEOJSON.features.forEach(feat => {
    if (feat.properties.blocked) return;
    const coords = feat.geometry.coordinates;
    for (let i = 0; i < coords.length; i += Math.max(1, Math.floor(coords.length / 3))) {
      const [lng, lat] = coords[i];
      if (haversine({ lat:eventCenter[0], lng:eventCenter[1] }, { lat, lng }) <= radiusM) {
        nearby++;
        break;
      }
    }
  });
  return Math.max(0.78, Math.min(1.18, nearby / 230));
}

function deterministicDemandFactor() {
  const seed = Math.abs(Math.sin(eventCenter[0] * 12.9898 + eventCenter[1] * 78.233));
  return 0.9 + seed * 0.22;
}

function eventDemandMetrics() {
  const access = roadAccessScore();
  const expectedVisitors = Math.round(HISTORICAL_EVENT_BASELINE.avgVisitors * deterministicDemandFactor() * access / 100) * 100;
  const expectedVehicles = Math.round(
    expectedVisitors * HISTORICAL_EVENT_BASELINE.vehicleShare / HISTORICAL_EVENT_BASELINE.avgVehicleOccupancy
  );
  const peakArrivals = Math.round(expectedVehicles * HISTORICAL_EVENT_BASELINE.peakArrivalShare);
  const checkpointStaff = Math.max(6, CHECKPOINTS.length + Math.ceil(expectedVehicles / HISTORICAL_EVENT_BASELINE.checkpointCapacity));
  return { access, expectedVisitors, expectedVehicles, peakArrivals, checkpointStaff };
}

// ── Route Geometry ───────────────────────────────────────────────
function ensureDemoGraph() {
  if (typeof graph === 'undefined' || !graph || Object.keys(graph).length === 0) {
    buildGraph();
  }
  if (demoGraph) return;

  demoGraph = {};
  ROADS_GEOJSON.features.forEach(feat => {
    const coords = feat.geometry.coordinates;
    const p = feat.properties;
    if (p.blocked) return;
    const speed = ROAD_SPEED[p.highway] || 30;
    const featureId = p.id;

    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      const k = nodeKey(lat, lng);
      if (!demoGraph[k]) demoGraph[k] = { lat, lng, edges: [] };
    }

    for (let i = 0; i < coords.length - 1; i++) {
      const [lngA, latA] = coords[i];
      const [lngB, latB] = coords[i + 1];
      const kA = nodeKey(latA, lngA), kB = nodeKey(latB, lngB);
      const dist = haversine({ lat:latA, lng:lngA }, { lat:latB, lng:lngB });
      const baseCost = dist / speed;
      demoGraph[kA].edges.push({ to:kB, dist, baseCost, featureId });
      demoGraph[kB].edges.push({ to:kA, dist, baseCost, featureId });
    }
  });
}

function sameLatLng(a, b) {
  return a && b && Math.abs(a[0] - b[0]) < 0.000001 && Math.abs(a[1] - b[1]) < 0.000001;
}

function demoDijkstra(startKey, endKey, opts = {}) {
  const costs = {}, prev = {}, visited = new Set();
  const pq = new MinHeap();
  const avoidFeatureIds = opts.avoidFeatureIds || new Set();
  const blockedFeatureIds = opts.blockedFeatureIds || new Set();
  costs[startKey] = 0;
  pq.push({ key:startKey, cost:0 });

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

    const node = demoGraph[key];
    if (!node) continue;
    for (const edge of node.edges) {
      if (visited.has(edge.to)) continue;
      if (blockedFeatureIds.has(edge.featureId)) continue;
      const avoidPenalty = avoidFeatureIds.has(edge.featureId) ? ALT_ROUTE_PENALTY : 1;
      const newCost = cost + edge.baseCost * trafficMul(edge.featureId) * avoidPenalty;
      if (newCost < (costs[edge.to] ?? Infinity)) {
        costs[edge.to] = newCost;
        prev[edge.to] = { from:key, featureId:edge.featureId, dist:edge.dist, baseCost:edge.baseCost };
        pq.push({ key:edge.to, cost:newCost });
      }
    }
  }

  if (costs[endKey] === undefined) return null;

  const path = [], featureIds = new Set();
  let cur = endKey;
  let totalDist = 0;
  let totalBaseTime = 0;
  while (prev[cur]) {
    const { from, featureId, dist, baseCost } = prev[cur];
    path.unshift(demoGraph[cur]);
    featureIds.add(featureId);
    totalDist += dist;
    totalBaseTime += baseCost;
    cur = from;
  }
  path.unshift(demoGraph[startKey]);

  return { path, featureIds, totalDist, totalBaseTime, totalTime: costs[endKey] };
}

function calculateRouteGeometry(route) {
  const anchors = route.anchors || route.waypoints || [];
  if (anchors.length < 2) return anchors;

  ensureDemoGraph();

  const latlngs = [];
  const featureIds = new Set();
  let totalDist = 0;
  let totalBaseTime = 0;
  let routed = true;

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    const start = nearestNode(a[0], a[1]);
    const end = nearestNode(b[0], b[1]);
    const result = start && end ? (dijkstra(start, end) || demoDijkstra(start, end)) : null;

    if (!result || !result.path || result.path.length < 2) {
      routed = false;
      break;
    }

    const leg = result.path.map(n => [n.lat, n.lng]);
    if (latlngs.length && sameLatLng(latlngs[latlngs.length - 1], leg[0])) leg.shift();
    latlngs.push(...leg);
    result.featureIds.forEach(id => featureIds.add(id));
    totalDist += result.totalDist || 0;
    totalBaseTime += result.totalBaseTime || result.totalTime || 0;
  }

  if (!routed) {
    featureIds.clear();
    totalDist = 0;
    totalBaseTime = 0;

    const start = nearestNode(anchors[0][0], anchors[0][1]);
    const end = nearestNode(anchors[anchors.length - 1][0], anchors[anchors.length - 1][1]);
    const direct = start && end ? (dijkstra(start, end) || demoDijkstra(start, end)) : null;
    if (direct && direct.path && direct.path.length > 1) {
      latlngs.length = 0;
      latlngs.push(...direct.path.map(n => [n.lat, n.lng]));
      direct.featureIds.forEach(id => featureIds.add(id));
      totalDist = direct.totalDist || 0;
      totalBaseTime = direct.totalBaseTime || direct.totalTime || 0;
      routed = true;
    }
  }

  route.roadPath = routed && latlngs.length ? latlngs : anchors;
  route.featureIds = featureIds;
  route.distanceM = totalDist;
  route.baseTimeSec = totalBaseTime;
  route.trafficTimeSec = totalBaseTime * (TRAFFIC_PENALTY[route.status] || 1);
  route.isRouted = routed;
  return route.roadPath;
}

function addRouteHeatPoints(heatPts, routePath, status) {
  if (!routePath || routePath.length < 2) return;
  const intensity = status === 'jam' ? 0.9 : status === 'slow' ? 0.6 : 0.4;
  const step = Math.max(1, Math.floor(routePath.length / 12));
  for (let i = step; i < routePath.length - 1; i += step) {
    heatPts.push([routePath[i][0], routePath[i][1], intensity]);
  }
}

function minLabel(sec) {
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

function kmLabel(m) {
  return `${(m / 1000).toFixed(1)} km`;
}

function routeIncidents(routeId) {
  return INCIDENTS.filter(inc => inc.route === routeId);
}

function routeRiskScore(route) {
  const statusRisk = { clear:8, normal:14, moderate:44, slow:68, jam:92 };
  const incidentRisk = routeIncidents(route.id).reduce((sum, inc) => {
    return sum + (inc.severity === 'jam' ? 12 : inc.severity === 'slow' ? 8 : 5);
  }, 0);
  return Math.min(99, (statusRisk[route.status] || 20) + incidentRisk);
}

function smartRecommendation(route) {
  const delayMin = Math.round(((route.trafficTimeSec || 0) - (route.baseTimeSec || 0)) / 60);
  if (route.status === 'jam' || delayMin >= 10) return 'Divert arrivals to alternate route';
  if (route.status === 'slow' || route.status === 'moderate') return 'Meter flow and keep checkpoint watch';
  return 'Keep corridor open';
}

function routeSummaryStats() {
  const active = DEMO_ROUTES.length;
  const avgDelay = active
    ? DEMO_ROUTES.reduce((sum, r) => sum + Math.max(0, (r.trafficTimeSec || 0) - (r.baseTimeSec || 0)), 0) / active
    : 0;
  const maxRisk = active ? Math.max(...DEMO_ROUTES.map(routeRiskScore)) : 0;
  const openAlternates = DEMO_ROUTES.filter(r => r.alternate && r.alternate.isRouted).length;
  const blocked = Object.values(roadData).filter(r => r.blocked).length;
  return { active, avgDelay, maxRisk, openAlternates, blocked };
}

function calculateAlternativeRoute(route) {
  const anchors = route.anchors || [];
  if (anchors.length < 2 || !route.featureIds || route.featureIds.size === 0) return null;

  ensureDemoGraph();
  const blockedFeatureIds = new Set(
    Object.values(roadData).filter(r => r.blocked).map(r => r.id)
  );
  const startAnchor = anchors[0];
  const endAnchor = anchors[anchors.length - 1];
  const start = nearestNode(startAnchor[0], startAnchor[1]);
  const end = nearestNode(endAnchor[0], endAnchor[1]);
  if (!start || !end) return null;

  const result = demoDijkstra(start, end, { avoidFeatureIds: route.featureIds, blockedFeatureIds });
  if (!result || !result.path || result.path.length < 2) return null;

  return {
    id: route.id,
    path: result.path.map(n => [n.lat, n.lng]),
    featureIds: result.featureIds,
    distanceM: result.totalDist,
    baseTimeSec: result.totalBaseTime,
    timeSec: result.totalTime,
    isRouted: true
  };
}

function calculateAlternatives() {
  DEMO_ROUTES.forEach(route => {
    if (!route.roadPath || !route.featureIds) calculateRouteGeometry(route);
    route.alternate = calculateAlternativeRoute(route);
  });
}

function exportLatLngsToGoogleMaps(latlngs) {
  if (!latlngs || latlngs.length < 2) return;
  const origin = `${latlngs[0][0]},${latlngs[0][1]}`;
  const dest = `${latlngs[latlngs.length - 1][0]},${latlngs[latlngs.length - 1][1]}`;
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
}

function exportDemoAlt(routeId) {
  const route = DEMO_ROUTES.find(r => r.id === routeId);
  if (!route || !route.alternate) {
    showToast('No alternate route available');
    return;
  }
  exportLatLngsToGoogleMaps(route.alternate.path);
  showToast(`Opened ${route.name} alternate in Google Maps`);
}

function focusDemoAlt(routeId) {
  selectedAltRouteId = routeId;
  drawDemoLayers();
  const route = DEMO_ROUTES.find(r => r.id === routeId);
  if (route && route.alternate && route.alternate.path.length > 1) {
    map.fitBounds(L.polyline(route.alternate.path).getBounds(), { padding:[70, 70] });
  }
}

// ── Icons ───────────────────────────────────────────────────────
const SC = {
  jam: '#ef4444', slow: '#f59e0b', moderate: '#fb923c',
  clear: '#22c55e', normal: '#475569'
};

function incidentIcon(sev) {
  const c = SC[sev] || SC.normal;
  return L.divIcon({ className:'', iconAnchor:[14,14], html:`
    <div style="width:28px;height:28px;border-radius:50%;background:${c};
      border:3px solid #fff;box-shadow:0 0 12px ${c};
      display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer">⚠</div>` });
}

function cpIcon(active) {
  return L.divIcon({ className:'', iconAnchor:[16,16], html:`
    <div style="width:34px;height:34px;border-radius:8px;
      background:${active?'#2563eb':'#1e3a5f'};border:2px solid ${active?'#60a5fa':'#3b82f6'};
      box-shadow:0 0 14px rgba(59,130,246,0.6);
      display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer">👮</div>` });
}

function eventCenterIcon() {
  return L.divIcon({ className:'', iconAnchor:[18,18], html:`
    <div style="width:36px;height:36px;border-radius:50%;background:#0f172a;
      border:3px solid #38bdf8;box-shadow:0 0 18px rgba(56,189,248,0.8);
      display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer">◎</div>` });
}

// ── Draw / Clear ────────────────────────────────────────────────
function drawDemoLayers() {
  clearDemoLayers();
  const heatPts = [];

  const centerHalo = L.circle(eventCenter, {
    radius: 900,
    color: '#38bdf8',
    weight: 1,
    opacity: 0.55,
    fillColor: '#38bdf8',
    fillOpacity: 0.07
  }).addTo(map);
  const centerMarker = L.marker(eventCenter, { icon:eventCenterIcon(), zIndexOffset:900 })
    .addTo(map)
    .on('click', e => L.DomEvent.stopPropagation(e))
    .bindTooltip(`<b>Event Center</b><br>${eventCenter[0].toFixed(5)}, ${eventCenter[1].toFixed(5)}<br><small>Click another map point to move it</small>`);
  demoLayers.push(centerHalo, centerMarker);

  DEMO_ROUTES.forEach(route => {
    const c = SC[route.status];
    const routePath = calculateRouteGeometry(route);
    const glow = L.polyline(routePath, { color:c, weight:14, opacity:0.12, lineCap:'round' }).addTo(map);
    const line = L.polyline(routePath, {
      color:c, weight:5, opacity:0.92, lineCap:'round',
      dashArray: route.status === 'jam' ? null : '10,6'
    }).addTo(map);
    line.bindTooltip(`<b>${route.name}</b><br>${route.label}<br><small>${route.isRouted ? 'Actual road path' : 'Fallback corridor line'}</small>`, { sticky:true });
    demoLayers.push(glow, line);

    addRouteHeatPoints(heatPts, routePath, route.status);
  });

  calculateAlternatives();

  DEMO_ROUTES.forEach(route => {
    if (!route.alternate) return;
    const selected = selectedAltRouteId === route.id;
    const alt = L.polyline(route.alternate.path, {
      color: ALT_COLOR,
      weight: selected ? 6 : 4,
      opacity: selected ? 0.95 : 0.68,
      dashArray: '3, 9',
      lineCap: 'round'
    }).addTo(map);
    alt.bindTooltip(`<b>${route.name} alternate</b><br>${kmLabel(route.alternate.distanceM)} · ${minLabel(route.alternate.timeSec)}`, { sticky:true });
    demoLayers.push(alt);
  });

  INCIDENTS.forEach(inc => {
    const m = L.marker([inc.lat, inc.lng], { icon: incidentIcon(inc.severity), zIndexOffset:500 })
      .addTo(map)
      .on('click', e => L.DomEvent.stopPropagation(e))
      .bindTooltip(`<b>⚠ ${inc.desc}</b><br><span style="color:${SC[inc.severity]}">${inc.severity.toUpperCase()}</span>`, { sticky:true });
    heatPts.push([inc.lat, inc.lng, inc.severity==='jam'?1.0:inc.severity==='slow'?0.65:0.45]);
    demoLayers.push(m);
  });

  CHECKPOINTS.forEach(cp => {
    const m = L.marker([cp.lat, cp.lng], { icon: cpIcon(chatCp && chatCp.id===cp.id), zIndexOffset:700 })
      .addTo(map)
      .on('click', e => { L.DomEvent.stopPropagation(e); openChat(cp); })
      .bindTooltip(`👮 <b>${cp.name}</b><br><small>Click to open comms</small>`);
    m._cpId = cp.id;
    demoLayers.push(m);
  });

  // Heatmap
  if (L.heatLayer) {
    heatLayer = L.heatLayer(heatPts, {
      radius:40, blur:28, maxZoom:14,
      gradient:{ 0.2:'#22c55e', 0.4:'#f59e0b', 0.65:'#fb923c', 1.0:'#ef4444' }
    });
  }
  updateHeatVis();
  refreshDemoSidebar();
  refreshSmartPanel();
}

function clearDemoLayers() {
  demoLayers.forEach(l => { try { map.removeLayer(l); } catch(e){} });
  demoLayers = [];
  if (heatLayer) { try { map.removeLayer(heatLayer); } catch(e){} heatLayer = null; }
}

function refreshSmartPanel() {
  const kpiEl = document.getElementById('demo-kpis');
  const delayEl = document.getElementById('demo-delay-chart');
  const statusEl = document.getElementById('demo-status-chart');
  const altEl = document.getElementById('demo-alt-list');
  const centerEl = document.getElementById('demo-center-panel');
  const demandEl = document.getElementById('demo-demand-kpis');
  if (!kpiEl || !delayEl || !statusEl || !altEl || !centerEl || !demandEl) return;

  const summary = routeSummaryStats();
  const demand = eventDemandMetrics();
  centerEl.innerHTML = `
    <div class="event-center-readout">
      <div>
        <strong>${eventCenter[0].toFixed(5)}, ${eventCenter[1].toFixed(5)}</strong>
        <span>${Math.round(eventCenterRoadDistanceM)} m from nearest road node</span>
      </div>
      <button onclick="resetEventCenter()">Reset</button>
    </div>
  `;
  demandEl.innerHTML = `
    <div class="kpi-grid demand-grid">
      <div class="kpi-tile"><span>Expected visitors</span><strong>${demand.expectedVisitors.toLocaleString()}</strong></div>
      <div class="kpi-tile"><span>Expected vehicles</span><strong>${demand.expectedVehicles.toLocaleString()}</strong></div>
      <div class="kpi-tile"><span>Peak arrivals/hr</span><strong>${demand.peakArrivals.toLocaleString()}</strong></div>
      <div class="kpi-tile"><span>Control staff</span><strong>${demand.checkpointStaff}</strong></div>
    </div>
    <div class="smart-note">Forecast uses historical average visitors, access-road density, vehicle share, and peak arrival rate.</div>
  `;
  kpiEl.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-tile"><span>Corridors</span><strong>${summary.active}</strong></div>
      <div class="kpi-tile"><span>Avg delay</span><strong>${minLabel(summary.avgDelay)}</strong></div>
      <div class="kpi-tile"><span>Risk peak</span><strong>${summary.maxRisk}%</strong></div>
      <div class="kpi-tile"><span>Blocked</span><strong>${summary.blocked}</strong></div>
    </div>
  `;

  const maxDelay = Math.max(1, ...DEMO_ROUTES.map(r => Math.max(0, (r.trafficTimeSec || 0) - (r.baseTimeSec || 0))));
  delayEl.innerHTML = DEMO_ROUTES.map(r => {
    const delay = Math.max(0, (r.trafficTimeSec || 0) - (r.baseTimeSec || 0));
    const width = Math.max(6, Math.round((delay / maxDelay) * 100));
    return `<div class="chart-row">
      <div class="chart-label">${r.name}</div>
      <div class="chart-track"><div class="chart-bar" style="width:${width}%;background:${SC[r.status]}"></div></div>
      <div class="chart-val">${minLabel(delay)}</div>
    </div>`;
  }).join('');

  const statusCounts = DEMO_ROUTES.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const total = Math.max(1, DEMO_ROUTES.length);
  statusEl.innerHTML = ['jam','slow','moderate','clear','normal'].map(status => {
    const pct = Math.round(((statusCounts[status] || 0) / total) * 100);
    return `<div class="status-slice" style="width:${pct}%;background:${SC[status]}" title="${status}: ${pct}%"></div>`;
  }).join('');

  altEl.innerHTML = DEMO_ROUTES.map(r => {
    const alt = r.alternate;
    const originalDelay = Math.max(0, (r.trafficTimeSec || 0) - (r.baseTimeSec || 0));
    const saving = alt ? Math.max(0, (r.trafficTimeSec || 0) - alt.timeSec) : 0;
    const risk = routeRiskScore(r);
    return `<div class="alt-card ${selectedAltRouteId === r.id ? 'selected' : ''}">
      <div class="alt-head">
        <div>
          <div class="alt-name">${r.name}</div>
          <div class="alt-meta">${kmLabel(r.distanceM || 0)} current · ${minLabel(r.trafficTimeSec || 0)} ETA</div>
        </div>
        <span style="color:${SC[r.status]};border-color:${SC[r.status]}55;background:${SC[r.status]}1f">${r.status.toUpperCase()}</span>
      </div>
      <div class="alt-metrics">
        <div><span>Delay</span><strong>${minLabel(originalDelay)}</strong></div>
        <div><span>Risk</span><strong>${risk}%</strong></div>
        <div><span>Save</span><strong>${alt ? minLabel(saving) : '-'}</strong></div>
      </div>
      <div class="smart-note">${smartRecommendation(r)}</div>
      ${alt ? `<div class="alt-actions">
        <button onclick="focusDemoAlt('${r.id}')">View alt</button>
        <button onclick="exportDemoAlt('${r.id}')">Export</button>
      </div>` : '<div class="smart-note danger">No viable alternate found</div>'}
    </div>`;
  }).join('');
}

// ── Heatmap ─────────────────────────────────────────────────────
function updateHeatVis() {
  if (!demoActive || !heatLayer) return;
  const z = map.getZoom();
  if (z < 14) {
    if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
    // hide individual incident markers at low zoom
    demoLayers.forEach(l => { if (l._cpId === undefined && l._icon && l._icon.innerHTML.includes('⚠')) { map.removeLayer(l); } });
  } else {
    if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    demoLayers.forEach(l => { if (l._cpId === undefined && l._latlng) { if (!map.hasLayer(l)) l.addTo(map); } });
  }
}
function initDemo() {
  rebuildScenarioAroundCenter();
  map.on('zoomend', updateHeatVis);
  map.on('click', handleDemoMapClick);
}

// ── Simulate ────────────────────────────────────────────────────
function simulateTraffic() {
  DEMO_ROUTES.forEach(r => { r.status = SIM_STATUSES[Math.floor(Math.random() * SIM_STATUSES.length)]; });
  if (!DEMO_ROUTES.some(r => r.status === 'jam'))
    DEMO_ROUTES[Math.floor(Math.random()*3)].status = 'jam';
  INCIDENTS.forEach(inc => { inc.severity = SIM_SEVS[Math.floor(Math.random() * SIM_SEVS.length)]; });
  drawDemoLayers();
  showToast('Traffic simulation randomised');
}

function resetDemo() {
  rebuildScenarioAroundCenter();
  DEMO_ROUTES[0].status='jam'; DEMO_ROUTES[1].status='slow'; DEMO_ROUTES[2].status='moderate';
  INCIDENTS[0].severity='jam'; INCIDENTS[1].severity='slow'; INCIDENTS[2].severity='moderate';
  INCIDENTS[3].severity='slow'; INCIDENTS[4].severity='moderate'; INCIDENTS[5].severity='jam'; INCIDENTS[6].severity='slow';
  drawDemoLayers();
  showToast('Scenario reset to default');
}

// ── Tab toggle ──────────────────────────────────────────────────
function toggleDemoMode(enable) {
  demoActive = enable;
  ['tab-traffic','tab-route','tab-demo'].forEach(id => document.getElementById(id).classList.remove('tab-active'));
  if (enable) {
    document.getElementById('tab-demo').classList.add('tab-active');
    document.getElementById('panel-traffic').style.display = 'none';
    document.getElementById('panel-route').style.display   = 'none';
    document.getElementById('panel-demo').style.display    = 'flex';
    if (routeMode) toggleRouteMode(false);
    drawDemoLayers();
    map.flyTo(eventCenter, 14, { duration:1.2 });
    showToast('Click map to set event center');
  } else {
    clearDemoLayers();
    closeChatPanel();
    document.getElementById('tab-traffic').classList.add('tab-active');
    document.getElementById('panel-traffic').style.display = 'flex';
    document.getElementById('panel-demo').style.display    = 'none';
  }
}

// ── Sidebar ─────────────────────────────────────────────────────
function refreshDemoSidebar() {
  const rl = document.getElementById('demo-route-list');
  if (!rl) return;
  rl.innerHTML = DEMO_ROUTES.map(r => {
    const c = SC[r.status], lbl = r.status.charAt(0).toUpperCase()+r.status.slice(1);
    const risk = routeRiskScore(r);
    return `<div onclick="map.flyTo([${r.anchors[0]}],15,{duration:0.8})"
      style="display:flex;align-items:center;gap:10px;padding:8px 10px;
      background:var(--panel);border:1px solid var(--border);border-radius:8px;
      margin-bottom:6px;cursor:pointer;transition:border-color 0.2s"
      onmouseover="this.style.borderColor='${c}'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="width:4px;height:38px;border-radius:2px;background:${c};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${r.name}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:1px">${r.label}</div>
        <div style="font-size:10px;color:#93c5fd;margin-top:4px">${kmLabel(r.distanceM || 0)} · ${minLabel(r.trafficTimeSec || 0)} ETA · ${risk}% risk</div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${c};background:${c}22;border:1px solid ${c}55;border-radius:10px;padding:2px 8px;white-space:nowrap">${lbl}</span>
    </div>`;
  }).join('');

  const cl = document.getElementById('demo-cp-list');
  if (!cl) return;
  cl.innerHTML = CHECKPOINTS.map(cp => {
    const msgs = chatHistory[cp.id]||[], unread = msgs.filter(m=>m.from!=='me'&&m.from!=='system').length;
    const isActive = chatCp && chatCp.id === cp.id;
    return `<div onclick="openChat(CHECKPOINTS.find(c=>c.id==='${cp.id}'))"
      style="display:flex;align-items:center;gap:10px;padding:8px 10px;
      background:${isActive?'rgba(37,99,235,0.15)':'var(--panel)'};
      border:1px solid ${isActive?'#3b82f6':'var(--border)'};border-radius:8px;
      margin-bottom:6px;cursor:pointer;transition:all 0.2s">
      <span style="font-size:18px;flex-shrink:0">👮</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cp.name}</div>
        <div style="font-size:10px;color:var(--text3)">${cp.officer} · ${cp.unit}</div>
      </div>
      ${unread>0?`<div style="background:#3b82f6;color:#fff;border-radius:10px;font-size:9px;padding:2px 6px;font-weight:700">${unread}</div>`:''}
    </div>`;
  }).join('');
}

// ── Chat ────────────────────────────────────────────────────────
function openChat(cp) {
  chatCp = cp;
  if (!chatHistory[cp.id]) chatHistory[cp.id] = [
    { from:'system', text:`Connected to ${cp.officer} — ${cp.name}`, time: ts() }
  ];
  document.getElementById('chat-panel').classList.add('visible');
  document.getElementById('chat-cp-name').textContent   = cp.name;
  document.getElementById('chat-cp-officer').textContent = `${cp.officer} · ${cp.unit}`;
  // Populate quick-message buttons
  document.getElementById('quick-btns').innerHTML = QUICK_MSGS.map(m =>
    `<button class="quick-btn" onclick="sendQuick(this.dataset.msg)" data-msg="${m}">${m}</button>`
  ).join('');
  renderChat();
  refreshDemoSidebar();
  map.flyTo([cp.lat, cp.lng], 16, { duration:0.8 });
}

function closeChatPanel() {
  chatCp = null;
  document.getElementById('chat-panel').classList.remove('visible');
  refreshDemoSidebar();
}

function renderChat() {
  if (!chatCp) return;
  const msgs = chatHistory[chatCp.id] || [];
  const el = document.getElementById('chat-messages');
  el.innerHTML = msgs.map(m => {
    if (m.from==='system') return `<div style="text-align:center;font-size:10px;color:var(--text3);margin:8px 0;padding:4px 10px;background:var(--panel2);border-radius:10px">${m.text}</div>`;
    const me = m.from==='me';
    return `<div style="display:flex;flex-direction:column;align-items:${me?'flex-end':'flex-start'};margin-bottom:10px">
      ${!me?`<div style="font-size:9px;color:#94a3b8;margin-bottom:2px">${chatCp.officer}</div>`:''}
      <div style="max-width:85%;padding:8px 12px;
        border-radius:${me?'14px 14px 3px 14px':'14px 14px 14px 3px'};
        background:${me?'linear-gradient(135deg,#2563eb,#1d4ed8)':'var(--panel2)'};
        border:1px solid ${me?'#3b82f6':'var(--border)'};
        font-size:11px;color:${me?'#fff':'var(--text2)'};line-height:1.5">${m.text}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:3px">${m.time}</div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function sendChatMsg(txt) {
  if (!chatCp || !txt.trim()) return;
  chatHistory[chatCp.id].push({ from:'me', text:txt.trim(), time:ts() });
  renderChat();
  setTimeout(() => {
    chatHistory[chatCp.id].push({
      from:'officer',
      text: OFFICER_REPLIES[Math.floor(Math.random()*OFFICER_REPLIES.length)],
      time: ts()
    });
    renderChat();
    refreshDemoSidebar();
  }, 900 + Math.random()*800);
}

function sendQuick(msg) {
  document.getElementById('chat-input').value = msg;
  doSendChat();
}

function doSendChat() {
  const inp = document.getElementById('chat-input');
  sendChatMsg(inp.value); inp.value='';
}

function ts() {
  return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
