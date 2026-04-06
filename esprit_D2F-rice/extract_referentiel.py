import re
import json

def parse_referentiel(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    domaine_code = "TECH-Info-Web"
    domaine_nom = "Technique"
    
    competences = {}
    current_section = 0
    current_comp_code = None

    # Pre-populate competences from the table section
    for line in lines:
        line = line.strip()
        if line.startswith("TECH-Info-Web-C") and ("Concevoir" in line or "Connecter" in line or "Tester" in line):
            parts = line.split(" ", 1)
            code_comp = parts[0]
            rest = parts[1]
            nom_desc = rest.split(" HTML")
            if len(nom_desc) == 1:
                nom_desc = rest.split(" Algorithmique")
            if len(nom_desc) == 1:
                nom_desc = rest.split(" TECH-Info")
            if len(nom_desc) == 1:
                nom_desc = rest.split(" Git")
            
            competences[code_comp] = {
                "tmpId": "comp_" + code_comp,
                "code": code_comp,
                "nom": nom_desc[0].split(" Concevoir")[0].split(" Connecter")[0].split(" Tester")[0].strip(),
                "description": "",
                "savoirs": [],
                "sousCompetences": []
            }

    # Parse Savoirs
    for line in lines:
        line = line.strip()
        
        # New Competence block
        match_section = re.search(r"^\d+\.\s+(TECH-Info-Web-C\d+)", line)
        if match_section:
            current_comp_code = match_section.group(1)
            continue

        if not current_comp_code:
            continue
            
        # Match Savoir row (starts with TECH-...-A..)
        match_savoir = re.search(r"^(TECH-[\w-]+-C\d+-A\d+)\s+(.*?)\s+([TP])\s+(N\d+)", line)
        if match_savoir:
            code_savoir = match_savoir.group(1)
            nom_savoir = match_savoir.group(2).strip()
            type_sav = "THEORIQUE" if match_savoir.group(3) == "T" else "PRATIQUE"
            niveau_sav = match_savoir.group(4) + "_DEBUTANT" if match_savoir.group(4) == "N1" else (
                         match_savoir.group(4) + "_AVANCE" if match_savoir.group(4) == "N4" else
                         match_savoir.group(4) + "_INTERMEDIAIRE")
            
            if current_comp_code in competences:
                competences[current_comp_code]["savoirs"].append({
                    "tmpId": "sav_" + code_savoir,
                    "code": code_savoir,
                    "nom": nom_savoir,
                    "type": type_sav,
                    "niveau": niveau_sav
                })

    result = {
        "propositions": [
            {
                "tmpId": "dom_" + domaine_code,
                "code": domaine_code,
                "nom": domaine_nom,
                "competences": list(competences.values())
            }
        ]
    }
    
    return result

if __name__ == "__main__":
    result = parse_referentiel("exemple_web.txt")
    with open("referentiel_extracted.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=4, ensure_ascii=False)
    print("Succes: Fichier referentiel_extracted.json genere.")
