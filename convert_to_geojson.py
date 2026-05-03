import json

# Load raw Overpass data
with open('roads_raw.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

elements = raw.get('elements', [])

# Priority road types for traffic management (exclude purely pedestrian)
VEHICLE_TYPES = {
    'motorway', 'motorway_link', 'trunk', 'trunk_link',
    'primary', 'primary_link', 'secondary', 'secondary_link',
    'tertiary', 'tertiary_link', 'residential', 'service',
    'living_street', 'unclassified', 'road', 'raceway'
}

features = []

for el in elements:
    if el.get('type') != 'way':
        continue
    
    tags = el.get('tags', {})
    hw_type = tags.get('highway', '')
    
    # Only include vehicle roads
    if hw_type not in VEHICLE_TYPES:
        continue
    
    geometry = el.get('geometry', [])
    if len(geometry) < 2:
        continue
    
    # Build coordinate array [lon, lat] — rounded to 5dp (~1m precision)
    coords = [[round(g['lon'], 5), round(g['lat'], 5)] for g in geometry]
    
    # Get road name (try Arabic then English)
    name = tags.get('name', tags.get('name:en', tags.get('ref', f"Road_{el['id']}")))
    name_en = tags.get('name:en', name)
    name_ar = tags.get('name', '')
    
    feature = {
        "type": "Feature",
        "id": el['id'],
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        },
        "properties": {
            "id": el['id'],
            "name": name_en or name_ar or f"Road_{el['id']}",
            "name_ar": name_ar,
            "highway": hw_type,
            "lanes": tags.get('lanes', ''),
            "maxspeed": tags.get('maxspeed', ''),
            "oneway": tags.get('oneway', 'no'),
            "ref": tags.get('ref', ''),
            "surface": tags.get('surface', ''),
            "traffic_status": "normal"  # default
        }
    }
    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "name": "Boulevard World Roads",
    "crs": {
        "type": "name",
        "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
    },
    "features": features
}

with open('roads.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"GeoJSON saved: {len(features)} road features")

# Print summary of included road types
types = {}
for feat in features:
    hw = feat['properties']['highway']
    types[hw] = types.get(hw, 0) + 1

print("Included road types:")
for k, v in sorted(types.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")
