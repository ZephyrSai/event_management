import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('roads.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Total features:', len(data['features']))
for feat in data['features'][:5]:
    p = feat['properties']
    print(f"  id={p['id']}, name={p['name']}, highway={p['highway']}, oneway={p['oneway']}")

# Bounding box
all_lons, all_lats = [], []
for feat in data['features']:
    for coord in feat['geometry']['coordinates']:
        all_lons.append(coord[0])
        all_lats.append(coord[1])

print('Bounding box:')
print(f'  SW: {min(all_lats):.6f}, {min(all_lons):.6f}')
print(f'  NE: {max(all_lats):.6f}, {max(all_lons):.6f}')
print(f'  Center: {(min(all_lats)+max(all_lats))/2:.6f}, {(min(all_lons)+max(all_lons))/2:.6f}')

# Named roads only
named = [f for f in data['features'] if f['properties']['name'] and not f['properties']['name'].startswith('Road_')]
print(f'Named roads: {len(named)}')
for feat in named[:10]:
    p = feat['properties']
    print(f"  {p['name']} ({p['highway']})")
