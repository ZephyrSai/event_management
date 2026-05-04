# Boulevard World — Smart Traffic Operations POC

zephyrsai.github.io/event_management

An interactive, offline-capable traffic operations platform for **Boulevard World, Riyadh, Saudi Arabia** (`24.776217, 46.602357`). It lets operators inspect real OpenStreetMap road geometry, mark live traffic conditions, apply road restrictions, calculate traffic-aware routes, and run a smart demo with a user-defined event center, simulated incidents, demand forecasting, KPI charts, alternate-route generation, and Google Maps export.

The current bundled dataset contains **6,824 OSM road segments**, about **28,505 graph nodes**, and about **51,740 directed routing edges**.

---

## Features

### Traffic Management

- Dark Leaflet map centered around Boulevard World.
- Real road geometry from OpenStreetMap stored locally in `roads_data.js`.
- Traffic status coloring: Jammed, Slow, Moderate, Clear, Normal.
- Multi-select from the map or sidebar, then apply statuses or restrictions in bulk.
- Road restrictions:
  - Block or reopen selected roads.
  - Set selected roads to one-way or two-way.
  - Blocked roads are removed from route calculations and alternate generation.
- Search and filter by road name or road type.
- Road info panel showing type, status, restriction, lanes, max speed, one-way state, and ref.
- Header stats for total roads, jammed, slow/moderate, clear, and blocked roads.
- Live cursor coordinates in the footer.

### Route Planner

- Click-to-place Start, End, and Via waypoints.
- Draggable pins recalculate routes.
- Offline Dijkstra routing runs entirely in the browser.
- Routes respect:
  - Traffic penalties.
  - One-way settings.
  - Blocked roads.
- Route summary shows distance, estimated time, and jam warnings.
- Google Maps export creates a navigation URL from the calculated route path.

### Smart Demo Mode

- Event center can be changed by clicking a location on the map while Demo mode is active.
- The app validates that the selected center is close enough to the mapped road network before regenerating the scenario.
- Three simulated traffic corridors into Boulevard World:
  - NW Corridor
  - East Corridor
  - South Corridor
- Demo corridor paths are generated around the selected event center and calculated over actual OSM roads, not straight-line overlays.
- Demand forecast estimates expected visitors, expected vehicles, peak arrivals per hour, and recommended control staffing.
- Forecast inputs include historical average visitors, vehicle share, average vehicle occupancy, peak-arrival share, and access-road density around the selected center.
- Smart operations panel includes:
  - Active corridor count.
  - Average delay.
  - Peak risk score.
  - Blocked-road count.
  - Delay-by-corridor bar chart.
  - Traffic-mix stacked chart.
- Each corridor card shows:
  - Distance.
  - Current traffic ETA.
  - Delay.
  - Risk score.
  - Time saved by the alternate.
  - Operational recommendation.
- Alternate-route generator creates one alternate for each simulated corridor.
- Alternates are drawn on the map and can be exported individually to Google Maps.
- Police checkpoint markers include simulated chat/comms.

### Offline-Capable

- Leaflet and road data are stored locally.
- Road geometry and routing work without an external API.
- Background map tiles use CartoDB and require internet unless already cached.

---

## Project Structure

```text
event_management/
├── index.html            # Main application UI
├── router.js             # Offline graph builder, Dijkstra router, Google Maps export
├── demo.js               # Smart demo mode, simulated corridors, incidents, alternates, chat
├── roads_data.js         # 6,824 OSM road segments embedded as JS
├── roads.geojson         # GeoJSON source used to generate roads_data.js
├── roads_raw.json        # Raw Overpass API response
├── lib/                  # Offline Leaflet.js assets
├── fetch_roads.py        # Re-fetch road data from Overpass API
├── convert_to_geojson.py # Convert raw Overpass JSON to GeoJSON
├── make_js_data.py       # Package GeoJSON into roads_data.js
└── inspect_geojson.py    # Print road stats and bounding box
```

---

## Running the App

Serve it with a local HTTP server. Do not open `index.html` directly via `file://`, because browser security can block local script loading.

```bash
cd event_management
python3 -m http.server 8765
```

Then open [http://127.0.0.1:8765](http://127.0.0.1:8765).

---

## How to Use

### Traffic Tab

| Action | How |
|---|---|
| Select a road | Click it on the map or in the sidebar list |
| Select multiple roads | Click several roads; selected roads highlight white |
| Apply traffic status | Select roads, then click Jammed, Slow, Moderate, Clear, or Normal |
| Block roads | Select roads, then click Block |
| Reopen roads | Select blocked roads, then click Open |
| Set one-way | Select roads, then click One-way |
| Set two-way | Select roads, then click Two-way |
| Filter road type | Use the type chips |
| Search road | Type in the road search box |
| Clear selection | Click map background or Clear |

### Route Planner Tab

| Action | How |
|---|---|
| Place Start | Click on the map |
| Place End | Click a second point |
| Add Via | Click additional points |
| Adjust route | Drag any waypoint marker |
| Export | Click Open in Google Maps |
| Clear | Click Clear Route |

### Demo Tab

| Action | How |
|---|---|
| View smart KPIs | Open the Demo tab |
| Set event center | Click a location on the map while Demo mode is active |
| Reset event center | Click Reset in the Event Center panel |
| Randomise incident status | Click Randomise Traffic Situation |
| Regenerate alternates | Click Generate Alternate Routes |
| Inspect an alternate | Click View alt on a corridor card |
| Export an alternate | Click Export on a corridor card |
| Contact checkpoint | Click a police checkpoint marker or sidebar checkpoint |

---

## How Routing Works

`router.js` builds a graph from the GeoJSON road network in the browser.

- **Nodes**: unique road coordinates, currently about `28,505`.
- **Edges**: consecutive coordinate pairs, currently about `51,740` directed edges.
- **One-way support**: one-way roads only create a forward edge.
- **Blocked-road support**: blocked roads are omitted from graph construction.
- **Cost function**: `distance / road_speed * traffic_penalty`.
- **Priority queue**: Dijkstra uses a binary min-heap for practical browser performance.

### Traffic Penalty Multipliers

| Traffic Status | Multiplier |
|---|---:|
| Clear | 0.7x |
| Normal | 1.0x |
| Moderate | 1.5x |
| Slow | 2.5x |
| Jammed | 6.0x |

### Road Speed Assumptions

| Road Type | Speed |
|---|---:|
| Primary | 80 km/h |
| Secondary | 60 km/h |
| Tertiary | 50 km/h |
| Residential | 30 km/h |
| Living Street | 15 km/h |
| Service | 20 km/h |

### Demo Event Center and Alternate Routes

The demo starts with Boulevard World as the default event center. In Demo mode, clicking a new map location moves the center and rebuilds corridors, incidents, checkpoints, demand forecasts, and alternate routes around that point. If the clicked location is too far from the mapped road network, the app rejects it and keeps the previous center.

The demo first calculates each simulated corridor over real roads. Then the alternate-route generator penalizes the current corridor’s road features so the router prefers a different road path where possible. Blocked roads are excluded. Each alternate can be exported to Google Maps with sampled waypoints from the calculated path.

---

## Updating Road Data

To refresh road data from OpenStreetMap, internet access is required:

```bash
python3 fetch_roads.py
python3 convert_to_geojson.py
python3 make_js_data.py
```

The current fetch script queries this bounding box around Boulevard World:

- SW: `24.731, 46.552`
- NE: `24.821, 46.652`

The current GeoJSON data extends to approximately:

- SW: `24.720700, 46.471480`
- NE: `24.952780, 46.668110`

---

## Road Data Coverage

| Type | Count |
|---|---:|
| Residential | 3,783 |
| Service | 1,209 |
| Tertiary | 561 |
| Living Street | 387 |
| Secondary | 202 |
| Tertiary Link | 191 |
| Primary | 147 |
| Motorway Link | 86 |
| Motorway | 71 |
| Secondary Link | 63 |
| Primary Link | 60 |
| Unclassified | 52 |
| Trunk | 11 |
| Raceway | 1 |
| **Total** | **6,824** |

---

## Tech Stack

| Library | Version | Usage |
|---|---|---|
| Leaflet.js | 1.9.4 | Map rendering |
| Leaflet.heat | local plugin | Demo heatmap |
| CartoDB Dark Matter | tile service | Dark basemap |
| OpenStreetMap | data source | Road geometry |
| Overpass API | data source | OSM road download |

No frameworks or build tools are required. The app is plain HTML, CSS, and JavaScript.

---

## Notes

- Traffic statuses and restrictions are in-memory only and reset when the page reloads.
- Google Maps export uses the calculated route path and samples up to 8 intermediate waypoints.
- For production, add persistence for live traffic states, restrictions, incidents, checkpoint messages, and operator actions.
- For larger city-scale datasets, consider a routing engine such as OSRM or Valhalla, or add spatial indexing for nearest-node lookup.
