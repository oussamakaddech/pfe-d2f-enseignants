"""Test live : ajout d'un besoin de formation (CUP/chef) -> notification mail D2F."""
import base64
import hashlib
import hmac
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

env = Path(".env").read_text(encoding="utf-8", errors="replace")
secret = re.search(r"^JWT_SECRET=(.*)$", env, re.MULTILINE).group(1).strip().strip('"').strip("'")


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make(sub: str, scope: str, email: str) -> str:
    now = int(time.time())
    si = b64(json.dumps({"alg": "HS512", "typ": "JWT"}, separators=(",", ":")).encode()) + "." + b64(
        json.dumps({"sub": sub, "scope": scope, "email": email, "iat": now, "exp": now + 3600},
                   separators=(",", ":")).encode())
    return si + "." + b64(hmac.new(secret.encode(), si.encode(), hashlib.sha512).digest())


token = make("hsalhi", "ROLE_CUP", "h.salhi@esprit.tn")
body = {
    "username": "hsalhi",
    "typeBesoin": "COLLECTIF",
    "titre": "TEST notification mail D2F " + time.strftime("%H:%M:%S"),
    "priorite": "HAUTE",
    "up": "UP_GL",
    "departement": "DEPT_GL",
    "theme": "Diagnostic canal Microsoft Graph",
}

# Variante « chef de département » : python scripts/test_besoin_mail_live.py chef
if len(sys.argv) > 1 and sys.argv[1] == "chef":
    token = make("oussama", "ROLE_CHEF_DEPARTEMENT", "o.kaddech@esprit.tn")
    body.update(username="oussama", up="UP_WEB", departement="DEPT_WEB")
req = urllib.request.Request(
    "http://localhost:8004/api/v1/besoins-formations",
    data=json.dumps(body).encode(),
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        print("HTTP", resp.status)
        created = json.loads(resp.read().decode())
        print("besoin", created.get("idBesoinFormation"))
except urllib.error.HTTPError as e:
    print("HTTP", e.code)
    print(e.read().decode()[:600])
    raise SystemExit(1)

# ── Second déclencheur : MODIFICATION du même besoin (PUT) ───────────────────
modified = dict(body)
modified["idBesoinFormation"] = created.get("idBesoinFormation")
modified["titre"] = body["titre"] + " (modifie)"
req2 = urllib.request.Request(
    "http://localhost:8004/api/v1/besoins-formations",
    data=json.dumps(modified).encode(),
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
    method="PUT",
)
try:
    with urllib.request.urlopen(req2, timeout=30) as resp:
        print("HTTP", resp.status, "(modification)")
except urllib.error.HTTPError as e:
    print("HTTP", e.code, "(modification)")
    print(e.read().decode()[:600])

# ── Nettoyage final : suppression logique du besoin de test (créateur) ───────
del_req = urllib.request.Request(
    f"http://localhost:8004/api/v1/besoins-formations/{created.get('idBesoinFormation')}",
    headers={"Authorization": "Bearer " + token},
    method="DELETE",
)
try:
    with urllib.request.urlopen(del_req, timeout=30) as resp:
        print("HTTP", resp.status, "(suppression)")
except urllib.error.HTTPError as e:
    print("HTTP", e.code, "(suppression)")
