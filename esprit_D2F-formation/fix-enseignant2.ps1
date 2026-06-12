$filePath = 'C:\Users\oussama\Desktop\pfe-d2f-enseignants\esprit_D2F-formation\src\main\java\esprit\pfe\serviceformation\services\EnseignantServiceImpl.java'
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Replace createEnseignant body with delegation + new private method
$oldMethod = @'
    @Override
    @Transactional
    public Enseignant createEnseignant(Enseignant enseignant) {
        // Contrôle d'unicité de l'email (→ 409). La contrainte SQL ux_enseignants_mail
        // (V29) reste le garde-fou dur ; ce pré-contrôle donne un message clair.
        if (enseignant.getMail() != null && !enseignant.getMail().isBlank()
                && enseignantRepository.existsByMail(enseignant.getMail())) {
            throw new DuplicateEnseignantException(
                    "Un enseignant avec cet email existe déjà : " + enseignant.getMail());
        }
        // Résolution des associations Up/Dept en entités MANAGÉES. Le DTO ne fournit
        // qu'un id et construit un new Up()/Dept() transient : tenter de persister
        // l'enseignant avec une telle référence non gérée lève une
        // InvalidDataAccessApiUsageException (« unsaved transient instance »), non
        // mappée → 500 générique. On recharge donc la vraie entité (ou 400 si l'id
        // est inconnu) avant le save.
        enseignant.setUp(resolveUp(enseignant.getUp()));
        enseignant.setDept(resolveDept(enseignant.getDept()));
        // Auto-generate ID au format E00001, E00002, … si non fourni OU si l'id
        // fourni est déjà pris (le frontend envoie parfois un id "stable" dérivé
        // du nom qui peut entrer en collision → sinon violation de PK / 500).
        // existsByIdIncludingDeleted : la collision se teste sur la ligne PHYSIQUE
        // (la PK enseignants_pkey couvre aussi les lignes soft-deleted), sinon un
        // id réutilisé après suppression logique repassait le contrôle puis violait
        // la PK à l'INSERT. La vérif d'unicité d'email ci-dessus garantit qu'on ne
        // duplique pas la même personne.
        if (enseignant.getId() == null || enseignant.getId().isBlank()
                || enseignantRepository.existsByIdIncludingDeleted(enseignant.getId())) {
            enseignant.setId(nextAvailableEnseignantId());
        }
        // Default mandatory fields not provided from the creation form
        if (enseignant.getCup() == null || enseignant.getCup().isBlank()) {
            enseignant.setCup("N");
        }
        if (enseignant.getChefDepartement() == null || enseignant.getChefDepartement().isBlank()) {
            enseignant.setChefDepartement("N");
        }
        // type/etat sont NOT NULL en base : valeurs par défaut si non fournies.
        if (enseignant.getType() == null || enseignant.getType().isBlank()) {
            enseignant.setType("P");
        }
        if (enseignant.getEtat() == null ||enseignant.getEtat().isBlank()) {
            enseignant.setEtat("A");
        }
        return enseignantRepository.save(enseignant);
    }
'@

$newMethod = @'
    @Override
    @Transactional
    public Enseignant createEnseignant(Enseignant enseignant) {
        return doCreateEnseignant(enseignant);
    }

    private Enseignant doCreateEnseignant(Enseignant enseignant) {
        if (enseignant.getMail() != null && !enseignant.getMail().isBlank()
                && enseignantRepository.existsByMail(enseignant.getMail())) {
            throw new DuplicateEnseignantException(
                    "Un enseignant avec cet email existe déjà : " + enseignant.getMail());
        }
        enseignant.setUp(resolveUp(enseignant.getUp()));
        enseignant.setDept(resolveDept(enseignant.getDept()));
        if (enseignant.getId() == null || enseignant.getId().isBlank()
                || enseignantRepository.existsByIdIncludingDeleted(enseignant.getId())) {
            enseignant.setId(nextAvailableEnseignantId());
        }
        if (enseignant.getCup() == null || enseignant.getCup().isBlank()) {
            enseignant.setCup("N");
        }
        if (enseignant.getChefDepartement() == null || enseignant.getChefDepartement().isBlank()) {
            enseignant.setChefDepartement("N");
        }
        if (enseignant.getType() == null || enseignant.getType().isBlank()) {
            enseignant.setType("P");
        }
        if (enseignant.getEtat() == null || enseignant.getEtat().isBlank()) {
            enseignant.setEtat("A");
        }
        return enseignantRepository.save(enseignant);
    }
'@

if ($content.Contains($oldMethod)) {
    $content = $content.Replace($oldMethod, $newMethod)
    [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Replaced successfully"
} else {
    Write-Host "Old method text not found - checking encoding"
    # Try without comments
    $simpleOld = '    @Override' + "`r`n" + '    @Transactional' + "`r`n" + '    public Enseignant createEnseignant(Enseignant enseignant) {'
    if ($content.Contains($simpleOld)) {
        Write-Host "Found method signature"
    } else {
        Write-Host "Method signature not found either"
        Write-Host "Content around line 26:"
        $lines = $content -split "`n"
        for ($i = 25; $i -lt 30; $i++) {
            Write-Host "Line $($i+1): $($lines[$i])"
        }
    }
}
