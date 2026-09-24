#!/usr/bin/env python3
"""Create RunPod serverless template + endpoint for SFP book OCR."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests

API = "https://api.runpod.io/graphql"


def gql(api_key: str, query: str, variables: dict | None = None) -> dict:
    r = requests.post(
        API,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={"query": query, "variables": variables or {}},
        timeout=120,
    )
    r.raise_for_status()
    data = r.json()
    if data.get("errors"):
        raise SystemExit(json.dumps(data["errors"], indent=2))
    return data["data"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--name", default="sfp-book-ocr")
    ap.add_argument("--gpu", default="NVIDIA GeForce RTX 4090")
    args = ap.parse_args()

    api_key = os.environ.get("RUNPOD_API_KEY")
    if not api_key:
        env = Path.home() / ".config/runpod/agent.env"
        for line in env.read_text().splitlines():
            if line.startswith("RUNPOD_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
    if not api_key:
        print("RUNPOD_API_KEY missing", file=sys.stderr)
        return 1

    # saveTemplate
    # https://docs.runpod.io/references/graphql/manage-endpoints
    save_template = """
    mutation Save($input: SaveTemplateInput!) {
      saveTemplate(input: $input) {
        id
        name
        imageName
      }
    }
    """
    tpl = gql(
        api_key,
        save_template,
        {
            "input": {
                "name": args.name,
                "imageName": args.image,
                "isServerless": True,
                "containerDiskInGb": 20,
                "volumeInGb": 0,
                "ports": "8000/http",
                "env": [
                    {"key": "OCR_DPI", "value": "200"},
                    {"key": "OCR_AUTO_MIN", "value": "0.65"},
                ],
            }
        },
    )["saveTemplate"]
    print("template", tpl)

    # Prefer REST create endpoint if GraphQL is finicky
    rest = requests.post(
        "https://rest.runpod.io/v1/endpoints",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "name": args.name,
            "templateId": tpl["id"],
            "workersMin": 0,
            "workersMax": 3,
            "idleTimeout": 60,
            "scalerType": "QUEUE_DELAY",
            "scalerValue": 4,
            "gpuTypeIds": ["NVIDIA GeForce RTX 4090", "NVIDIA RTX A5000", "NVIDIA RTX 4000 Ada Generation"],
            "gpuCount": 1,
        },
        timeout=120,
    )
    print("rest status", rest.status_code, rest.text[:500])
    endpoint = None
    if rest.ok:
        endpoint = rest.json()
    else:
        # GraphQL fallback
        create_ep = """
        mutation Create($input: EndpointInput!) {
          createEndpoint(input: $input) {
            id
            name
          }
        }
        """
        try:
            endpoint = gql(
                api_key,
                create_ep,
                {
                    "input": {
                        "name": args.name,
                        "templateId": tpl["id"],
                        "workersMin": 0,
                        "workersMax": 3,
                        "idleTimeout": 60,
                        "scalerType": "QUEUE_DELAY",
                        "scalerValue": 4,
                        "gpuIds": "AMPERE_16,AMPERE_24,ADA_24",
                        "networkVolumeId": None,
                    }
                },
            )["createEndpoint"]
        except SystemExit as e:
            print("createEndpoint failed", e)
            # Still save template so user can finish in console
            Path("/tmp/sfp-book-ocr-endpoint.json").write_text(
                json.dumps({"template": tpl, "image": args.image, "error": str(e)}, indent=2)
            )
            return 1

    out = {
        "template": tpl,
        "endpoint": endpoint,
        "image": args.image,
        "run_url": f"https://api.runpod.ai/v2/{endpoint.get('id') if isinstance(endpoint, dict) else endpoint}/run",
        "runsync_url": f"https://api.runpod.ai/v2/{endpoint.get('id') if isinstance(endpoint, dict) else endpoint}/runsync",
    }
    Path("/tmp/sfp-book-ocr-endpoint.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
