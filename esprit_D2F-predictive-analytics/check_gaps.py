"""Compare gaps for ENS007 and ENS015."""
import urllib.request, json

for ens in ["ENS007", "ENS015"]:
    req = urllib.request.Request("http://localhost:8000/api/v1/analytics/gaps/" + ens + "?page=0&size=100")
    with urllib.request.urlopen(req) as resp:
        d = json.loads(resp.read())
    total = d.get("total", "?")
    print("\n=== " + ens + ": " + str(total) + " gaps total ===")
    for g in d.get("gaps", []):
        nom = g.get("competence_nom", g.get("competence_code", "?"))
        cur = g.get("niveau_actuel", 0)
        req_ = g.get("niveau_requis", 0)
        score = g.get("gap_score", "?")
        urgence = g.get("niveau_urgence", "?")
        justif = g.get("justification", "?")
        print("  " + str(nom) + ": cur=" + str(cur) + ", req=" + str(req_) + ", score=" + str(score) + ", urgence=" + str(urgence) + ", gap=" + str(justif))