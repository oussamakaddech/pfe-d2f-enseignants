"""Génère des JWT de test HS512 (diagnostic 403 calendar)."""
import base64
import hashlib
import hmac
import json
import re
import sys
import time
from pathlib import Path

env = Path(".env").read_text(encoding="utf-8", errors="replace")
m = re.search(r"^JWT_SECRET=(.*)$", env, re.MULTILINE)
secret = m.group(1).strip().strip('"').strip("'")


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make(sub: str, scopes: list[str], email: str) -> str:
    now = int(time.time())
    header = {"alg": "HS512", "typ": "JWT"}
    payload = {
        "sub": sub,
        "scope": " ".join(scopes),
        "email": email,
        "iat": now,
        "exp": now + 3600,
    }
    si = b64(json.dumps(header, separators=(",", ":")).encode()) + "." + b64(
        json.dumps(payload, separators=(",", ":")).encode()
    )
    sig = hmac.new(secret.encode(), si.encode(), hashlib.sha512).digest()
    return si + "." + b64(sig)


cases = {
    "enseignant_self_e00007": make("E00007", ["ROLE_ENSEIGNANT"], "o.kaddech@esprit.tn"),
    "admin_e00007": make("E00007", ["ROLE_ADMIN"], "admin@d2f.tn"),
    "enseignant_fjlassi": make("fjlassi", ["ROLE_ENSEIGNANT"], "f.jlassi@esprit.tn"),
    "cup_fjlassi": make("fjlassi", ["ROLE_CUP"], "f.jlassi@esprit.tn"),
}
out = Path("scripts/tok_cases.json")
out.write_text(json.dumps(cases), encoding="utf-8")
print("écrit:", out, [k for k in cases])