#!/usr/bin/env python3
"""Push corrected workflow to n8n via REST API."""
import json
import os
import sys
import urllib.request

# Load workflow
with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

wf_id = "HRqtM3UNadfayBPP"
api_url = os.environ.get("N8N_API_URL", "http://localhost:5678")
api_key = os.environ.get("N8N_API_KEY", "")

url = f"{api_url.rstrip('/')}/api/v1/workflows/{wf_id}"
data = json.dumps({
    "nodes": payload["nodes"],
    "connections": payload["connections"],
}).encode("utf-8")

req = urllib.request.Request(
    url,
    data=data,
    method="PUT",
    headers={
        "Content-Type": "application/json",
        "X-N8N-API-KEY": api_key,
    },
)

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
        print("OK:", result.get("name", "workflow updated"))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.reason)
    print(e.read().decode())
    sys.exit(1)
