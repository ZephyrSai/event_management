import urllib.request
import urllib.parse
import json

# Bounding box around Boulevard World, Riyadh (24.776217, 46.602357)
# ~5km radius: lat ±0.045 deg, lng ±0.050 deg
query = '[out:json][timeout:120];(way["highway"](24.731,46.552,24.821,46.652););out geom;'

data = urllib.parse.urlencode({'data': query}).encode('utf-8')
req = urllib.request.Request(
    'https://overpass-api.de/api/interpreter',
    data=data,
    method='POST'
)
req.add_header('User-Agent', 'TrafficMapPOC/1.0 (educational use)')
req.add_header('Accept', 'application/json')
req.add_header('Content-Type', 'application/x-www-form-urlencoded')

print("Fetching road data from Overpass API...")
with urllib.request.urlopen(req, timeout=120) as response:
    content = response.read()

with open('roads_raw.json', 'wb') as f:
    f.write(content)

parsed = json.loads(content)
elements = parsed.get('elements', [])
print(f"Done. Size: {len(content)} bytes")
print(f"Total highway elements: {len(elements)}")

# Count by type
types = {}
for el in elements:
    hw = el.get('tags', {}).get('highway', 'unknown')
    types[hw] = types.get(hw, 0) + 1

print("Highway types:")
for k, v in sorted(types.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")
