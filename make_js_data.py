import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')

with open('roads.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Minify and wrap as a JS variable
minified = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
js_output = f"const ROADS_GEOJSON = {minified};\n"

with open('roads_data.js', 'w', encoding='utf-8') as f:
    f.write(js_output)

print(f"roads_data.js written: {len(js_output)} chars, {len(data['features'])} features")
