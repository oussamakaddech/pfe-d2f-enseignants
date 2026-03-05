# report_generator.py
# Generateur de rapports RICE / Recommandation formateur
# -------------------------------------------------------
# Ce module produit des rapports structures (JSON, Markdown, HTML)
# a partir des resultats d''analyse RICE et des recommandations semantiques.
#
# Exporteurs disponibles :
#   generate_rice_report(result, fmt)         -> str (json | markdown | html)
#   generate_reco_report(candidates, ctx, fmt) -> str (json | markdown | html)
#   generate_coverage_report(result)          -> dict  (statistiques referentiel)

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional


# ─── helpers ─────────────────────────────────────────────────────────────────

def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _h(level: int, text: str) -> str:
    return f"{'#' * level} {text}\n"


def _table_md(headers: List[str], rows: List[List[str]]) -> str:
    sep = " | ".join("---" for _ in headers)
    lines = ["| " + " | ".join(headers) + " |", "| " + sep + " |"]
    for row in rows:
        lines.append("| " + " | ".join(str(c) for c in row) + " |")
    return "\n".join(lines) + "\n"


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
    )


_HTML_STYLE = """
<style>
  body  { font-family: Arial, sans-serif; max-width: 900px; margin: auto; padding: 24px; }
  h1    { color: #1a3c6e; border-bottom: 2px solid #1a3c6e; }
  h2    { color: #2e6ea6; margin-top: 28px; }
  h3    { color: #3a7abf; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 16px; font-size: 13px; }
  th    { background: #1a3c6e; color: #fff; padding: 6px 10px; text-align: left; }
  td    { border: 1px solid #ccc; padding: 5px 10px; }
  tr:nth-child(even) td { background: #f4f7fb; }
  .badge { display:inline-block; padding:2px 8px; border-radius:12px;
           font-size:11px; font-weight:bold; background:#e8f0fe; color:#1a3c6e; }
  .score { color: #1a7a4a; font-weight: bold; }
  .stat  { background:#f0f4f8; padding:12px; border-radius:8px;
           display:inline-block; margin:4px; min-width:120px; text-align:center; }
  .stat .val { font-size:24px; font-weight:bold; color:#1a3c6e; }
  .stat .lbl { font-size:11px; color:#555; }
</style>
"""

# ─── RICE analysis report ─────────────────────────────────────────────────────

def generate_rice_report(result: Dict[str, Any], fmt: str = "markdown") -> str:
    """Genere un rapport du resultat d'analyse RICE.

    Parameters
    ----------
    result : dict
        Dictionnaire serialise d'un ``RiceAnalysisResult``
        (champs : propositions, stats, extractedEnseignants, foundEnseignants).
    fmt : str
        Format de sortie : ``"json"``, ``"markdown"`` ou ``"html"``.

    Returns
    -------
    str
        Rapport formate.
    """
    fmt = fmt.lower().strip()
    if fmt == "json":
        return _rice_json(result)
    if fmt == "html":
        return _rice_html(result)
    return _rice_markdown(result)


def _rice_json(result: Dict[str, Any]) -> str:
    stats    = result.get("stats", {})
    domaines = result.get("propositions", [])
    report   = {
        "generated_at": _now_str(),
        "service": "RICE – Referentiel Intelligent de Competences Enseignants",
        "stats": stats,
        "summary": {
            "domaines": [
                {
                    "code":  d.get("code"),
                    "nom":   d.get("nom"),
                    "gcDomaine": d.get("gcDomaine"),
                    "gcCodes":   d.get("gcCodes", []),
                    "nb_competences": len(d.get("competences", [])),
                    "nb_savoirs": sum(
                        len(sc.get("savoirs", []))
                        for c in d.get("competences", [])
                        for sc in c.get("sousCompetences", [])
                    ),
                }
                for d in domaines
            ]
        },
        "extracted_enseignants": result.get("extractedEnseignants", []),
    }
    return json.dumps(report, ensure_ascii=False, indent=2)


def _rice_markdown(result: Dict[str, Any]) -> str:
    stats    = result.get("stats", {})
    domaines = result.get("propositions", [])
    dept     = stats.get("departement", "gc").upper()

    lines: List[str] = [
        _h(1, f"Rapport RICE – Departement {dept}"),
        f"*Genere le {_now_str()}*\n",
        _h(2, "Statistiques globales"),
        _table_md(
            ["Indicateur", "Valeur"],
            [
                ["Domaines extraits",   str(stats.get("totalDomaines", 0))],
                ["Competences",          str(stats.get("totalCompetences", 0))],
                ["Sous-competences",     str(stats.get("totalSousCompetences", 0))],
                ["Savoirs",              str(stats.get("totalSavoirs", 0))],
                ["Enseignants couverts", str(stats.get("enseignantsCovered", 0))],
                ["Taux de couverture",   f"{stats.get('tauxCouverture', 0):.1f}%"],
                ["Codes referentiel",    str(stats.get("gcCodesCoveredCount", 0))],
            ],
        ),
    ]

    if stats.get("gcCodesCovered"):
        lines.append("\n**Codes referentiel couverts :** " +
                     ", ".join(f"`{c}`" for c in stats["gcCodesCovered"]) + "\n")

    # Enseignants extraits
    ens_list = result.get("extractedEnseignants", [])
    if ens_list:
        lines.append(_h(2, "Enseignants extraits des fiches"))
        lines.append(_table_md(
            ["Nom extrait", "Role", "ID match", "Nom match", "Fichier"],
            [
                [
                    e.get("nom_complet", ""),
                    e.get("role", ""),
                    e.get("matched_id", "-") or "-",
                    e.get("matched_nom", "-") or "-",
                    e.get("fichier", ""),
                ]
                for e in ens_list
            ],
        ))

    # Arbre de domaines
    lines.append(_h(2, "Arbre des competences propose"))
    for d in domaines:
        gc_tag = f" `[{d.get('gcDomaine')}]`" if d.get("gcDomaine") else ""
        lines.append(_h(3, f"{d.get('code')} – {d.get('nom')}{gc_tag}"))
        if d.get("description"):
            lines.append(f"*{d['description'][:120]}*\n")

        for c in d.get("competences", []):
            lines.append(f"\n**{c.get('code')} · {c.get('nom')}**\n")
            for sc in c.get("sousCompetences", []):
                nb_sav = len(sc.get("savoirs", []))
                lines.append(f"  - *{sc.get('nom')}* ({nb_sav} savoir(s))\n")
                for s in sc.get("savoirs", [])[:5]:  # preview: 5 savoirs max
                    niveau = s.get("niveau", "?")
                    stype  = s.get("type", "")
                    gcs    = ", ".join(s.get("gcCodes", [])[:3])
                    lines.append(
                        f"    - `{s.get('code')}` {s.get('nom', '')[:70]} "
                        f"| {stype} | {niveau}"
                        + (f" | `{gcs}`" if gcs else "") + "\n"
                    )
                if len(sc.get("savoirs", [])) > 5:
                    lines.append(
                        f"    - *… {len(sc['savoirs']) - 5} autre(s)*\n"
                    )
    return "".join(lines)


def _rice_html(result: Dict[str, Any]) -> str:
    stats    = result.get("stats", {})
    domaines = result.get("propositions", [])
    dept     = stats.get("departement", "gc").upper()

    body_parts: List[str] = [
        f"<h1>Rapport RICE &ndash; D&eacute;partement {_escape_html(dept)}</h1>",
        f"<p><em>G&eacute;n&eacute;r&eacute; le {_now_str()}</em></p>",
        "<h2>Statistiques globales</h2>",
        "<div>",
    ]

    def stat_div(val: Any, lbl: str) -> str:
        return (
            f'<div class="stat"><div class="val">{_escape_html(str(val))}</div>'
            f'<div class="lbl">{_escape_html(lbl)}</div></div>'
        )

    body_parts += [
        stat_div(stats.get("totalDomaines", 0),         "Domaines"),
        stat_div(stats.get("totalCompetences", 0),      "Comp&eacute;tences"),
        stat_div(stats.get("totalSousCompetences", 0),  "Sous-comp."),
        stat_div(stats.get("totalSavoirs", 0),          "Savoirs"),
        stat_div(stats.get("enseignantsCovered", 0),    "Enseignants"),
        stat_div(f"{stats.get('tauxCouverture', 0):.1f}%", "Couverture"),
        stat_div(stats.get("gcCodesCoveredCount", 0),   "Codes r&eacute;f."),
        "</div>",
    ]

    # Enseignants extraits
    ens_list = result.get("extractedEnseignants", [])
    if ens_list:
        body_parts.append("<h2>Enseignants extraits des fiches</h2>")
        body_parts.append(
            "<table><tr><th>Nom extrait</th><th>Role</th>"
            "<th>ID match</th><th>Nom match</th><th>Fichier</th></tr>"
        )
        for e in ens_list:
            body_parts.append(
                f"<tr><td>{_escape_html(e.get('nom_complet',''))}</td>"
                f"<td>{_escape_html(e.get('role',''))}</td>"
                f"<td>{_escape_html(e.get('matched_id','') or '-')}</td>"
                f"<td>{_escape_html(e.get('matched_nom','') or '-')}</td>"
                f"<td>{_escape_html(e.get('fichier',''))}</td></tr>"
            )
        body_parts.append("</table>")

    # Arbre domaines
    body_parts.append("<h2>Arbre des comp&eacute;tences propos&eacute;</h2>")
    for d in domaines:
        gc_tag = (f' <span class="badge">{_escape_html(d["gcDomaine"])}</span>'
                  if d.get("gcDomaine") else "")
        body_parts.append(
            f"<h3>{_escape_html(d.get('code',''))} &ndash; "
            f"{_escape_html(d.get('nom',''))}{gc_tag}</h3>"
        )
        for c in d.get("competences", []):
            body_parts.append(
                f"<h4>{_escape_html(c.get('code',''))} &middot; "
                f"{_escape_html(c.get('nom',''))}</h4><ul>"
            )
            for sc in c.get("sousCompetences", []):
                nb  = len(sc.get("savoirs", []))
                body_parts.append(
                    f"<li><em>{_escape_html(sc.get('nom',''))}</em> "
                    f"({nb} savoir(s))<ul>"
                )
                for s in sc.get("savoirs", [])[:5]:
                    code   = _escape_html(s.get("code", ""))
                    nom    = _escape_html(s.get("nom", "")[:80])
                    niveau = _escape_html(s.get("niveau", ""))
                    stype  = _escape_html(s.get("type", ""))
                    gcs    = ", ".join(s.get("gcCodes", [])[:3])
                    body_parts.append(
                        f'<li><code>{code}</code> {nom} '
                        f'<span class="badge">{stype}</span> '
                        f'<span class="badge">{niveau}</span>'
                        + (f' <span class="badge">{_escape_html(gcs)}</span>' if gcs else "")
                        + "</li>"
                    )
                if len(sc.get("savoirs", [])) > 5:
                    body_parts.append(
                        f"<li><em>... {len(sc['savoirs']) - 5} autre(s)</em></li>"
                    )
                body_parts.append("</ul></li>")
            body_parts.append("</ul>")

    html = (
        "<!DOCTYPE html><html lang='fr'><head>"
        "<meta charset='UTF-8'>"
        f"<title>Rapport RICE – {dept}</title>"
        f"{_HTML_STYLE}"
        "</head><body>"
        + "".join(body_parts)
        + "</body></html>"
    )
    return html


# ─── Recommendation report ───────────────────────────────────────────────────

def generate_reco_report(
    candidates: List[Dict[str, Any]],
    context: str = "",
    fmt: str = "markdown",
) -> str:
    """Genere un rapport des candidats enseignants recommandes.

    Parameters
    ----------
    candidates : list[dict]
        Liste renvoyee par ``recommend_semantic`` (champs : enseignant_id, nom,
        prenom, mail, up_id, dept_id, score).
    context : str
        Texte de contexte utilise pour la requete de recommandation.
    fmt : str
        Format de sortie : ``"json"``, ``"markdown"`` ou ``"html"``.
    """
    fmt = fmt.lower().strip()
    if fmt == "json":
        return json.dumps(
            {
                "generated_at": _now_str(),
                "context":      context[:200],
                "nb_candidates": len(candidates),
                "candidates":   candidates,
            },
            ensure_ascii=False,
            indent=2,
        )

    if fmt == "html":
        body = [
            "<h1>Recommandation de formateurs</h1>",
            f"<p><em>G&eacute;n&eacute;r&eacute; le {_now_str()}</em></p>",
        ]
        if context:
            body.append(
                f"<p><strong>Contexte :</strong> {_escape_html(context[:200])}</p>"
            )
        body.append(
            "<table>"
            "<tr><th>#</th><th>Nom</th><th>Pr&eacute;nom</th>"
            "<th>Email</th><th>UP</th><th>Dept</th><th>Score</th></tr>"
        )
        for i, c in enumerate(candidates, 1):
            score_pct = f"{c.get('score', 0) * 100:.1f}%"
            body.append(
                f'<tr><td>{i}</td>'
                f'<td>{_escape_html(c.get("nom",""))}</td>'
                f'<td>{_escape_html(c.get("prenom",""))}</td>'
                f'<td>{_escape_html(c.get("mail",""))}</td>'
                f'<td>{_escape_html(str(c.get("up_id","") or ""))}</td>'
                f'<td>{_escape_html(str(c.get("dept_id","") or ""))}</td>'
                f'<td class="score">{score_pct}</td></tr>'
            )
        body.append("</table>")
        return (
            "<!DOCTYPE html><html lang='fr'><head>"
            "<meta charset='UTF-8'><title>Recommandation formateurs</title>"
            f"{_HTML_STYLE}</head><body>"
            + "".join(body)
            + "</body></html>"
        )

    # Markdown (default)
    lines = [
        _h(1, "Recommandation de formateurs"),
        f"*Genere le {_now_str()}*\n",
    ]
    if context:
        lines.append(f"**Contexte :** {context[:200]}\n")
    lines.append(
        _table_md(
            ["#", "Nom", "Prenom", "Email", "UP", "Dept", "Score"],
            [
                [
                    str(i),
                    c.get("nom", ""),
                    c.get("prenom", ""),
                    c.get("mail", ""),
                    str(c.get("up_id", "") or ""),
                    str(c.get("dept_id", "") or ""),
                    f"{c.get('score', 0) * 100:.1f}%",
                ]
                for i, c in enumerate(candidates, 1)
            ],
        )
    )
    return "".join(lines)


# ─── Coverage report ─────────────────────────────────────────────────────────

def generate_coverage_report(result: Dict[str, Any]) -> Dict[str, Any]:
    """Calcule des statistiques de couverture du referentiel a partir d'un resultat RICE.

    Retourne un dict structure avec :
    - codes couverts / non couverts
    - repartition par domaine competence (S/C/P/E/U/T pour GC)
    - taux de couverture par domaine
    - distribution des niveaux Bloom
    """
    stats     = result.get("stats", {})
    domaines  = result.get("propositions", [])
    dept      = stats.get("departement", "gc").upper()

    all_codes: List[str] = []
    niveau_dist: Dict[str, int] = {}
    type_dist: Dict[str, int]   = {}

    for d in domaines:
        for c in d.get("competences", []):
            for sc in c.get("sousCompetences", []):
                for s in sc.get("savoirs", []):
                    all_codes.extend(s.get("gcCodes", []))
                    niv = s.get("niveau", "UNKNOWN")
                    niveau_dist[niv] = niveau_dist.get(niv, 0) + 1
                    stype = s.get("type", "UNKNOWN")
                    type_dist[stype] = type_dist.get(stype, 0) + 1

    unique_codes = sorted(set(all_codes))

    # Repartition par prefixe (S/C/P/E/U/T pour GC)
    prefix_dist: Dict[str, int] = {}
    for code in unique_codes:
        prefix = code[0] if code else "?"
        prefix_dist[prefix] = prefix_dist.get(prefix, 0) + 1

    return {
        "generated_at":      _now_str(),
        "departement":       dept,
        "gc_codes_covered":  unique_codes,
        "gc_codes_count":    len(unique_codes),
        "prefix_distribution": prefix_dist,
        "niveau_distribution": niveau_dist,
        "type_distribution":   type_dist,
        "total_savoirs":     sum(
            len(sc.get("savoirs", []))
            for d in domaines
            for c in d.get("competences", [])
            for sc in c.get("sousCompetences", [])
        ),
        "enseignants_couverts": stats.get("enseignantsCovered", 0),
        "taux_couverture":      stats.get("tauxCouverture", 0),
    }


# ─── FastAPI router (optionnel – monte sur /report si importe dans ai_reco.py) ─

try:
    from fastapi import APIRouter
    from pydantic import BaseModel as _BM
    from typing import Literal

    _report_router = APIRouter(prefix="/report", tags=["Reports"])

    class _RecoReportReq(_BM):
        candidates: List[Dict[str, Any]]
        context:    str = ""
        fmt:        Literal["json", "markdown", "html"] = "markdown"

    class _RiceReportReq(_BM):
        result: Dict[str, Any]
        fmt:    Literal["json", "markdown", "html"] = "markdown"

    @_report_router.post("/reco")
    def report_reco(req: _RecoReportReq):
        """Genere un rapport de recommandation formateurs."""
        from fastapi.responses import PlainTextResponse, HTMLResponse
        body = generate_reco_report(req.candidates, req.context, req.fmt)
        if req.fmt == "html":
            return HTMLResponse(body)
        return PlainTextResponse(body)

    @_report_router.post("/rice")
    def report_rice(req: _RiceReportReq):
        """Genere un rapport d''analyse RICE."""
        from fastapi.responses import PlainTextResponse, HTMLResponse
        body = generate_rice_report(req.result, req.fmt)
        if req.fmt == "html":
            return HTMLResponse(body)
        return PlainTextResponse(body)

    @_report_router.post("/coverage")
    def report_coverage(req: _RiceReportReq):
        """Calcule les statistiques de couverture du referentiel."""
        return generate_coverage_report(req.result)

except ImportError:
    _report_router = None  # type: ignore[assignment]