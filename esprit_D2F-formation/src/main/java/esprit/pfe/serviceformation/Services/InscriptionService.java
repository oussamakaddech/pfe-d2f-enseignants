// src/main/java/esprit/pfe/serviceformation/Services/InscriptionService.java
package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.*;
import esprit.pfe.serviceformation.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class InscriptionService {
    private static final String FORMATION_INTROUVABLE = "Formation introuvable";

    private final FormationRepository formationRepo;
    private final EnseignantRepository enseignantRepo;
    private final InscriptionRepository inscriptionRepo;
    private final InscriptionService self;

    @Autowired
    public InscriptionService(FormationRepository formationRepo,
                              EnseignantRepository enseignantRepo,
                              InscriptionRepository inscriptionRepo,
                              @Lazy InscriptionService self) {
        this.formationRepo = formationRepo;
        this.enseignantRepo = enseignantRepo;
        this.inscriptionRepo = inscriptionRepo;
        this.self = self;
    }


    /**
     * 1. Lister les formations accessibles pour un formateur
     * - doit être visible (inscriptionsOuvertes == true)
     * - et soit ouverte à tous (ouverte == true), soit liée à son UP
     */
    @Transactional
    public List<FormationDTO> listerFormationsAccessibles(String enseignantId) {
        Enseignant ens = enseignantRepo.findById(enseignantId)
                .or(() -> enseignantRepo.findByMail(enseignantId))
                .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable"));
        String upEns = ens.getUp() != null ? ens.getUp().getId() : null;

        return formationRepo.findAll().stream()
                .filter(Formation::isInscriptionsOuvertes) // visibles
                .filter(f -> f.isOuverte() // ouvertes à tous
                        || (f.getUp() != null && f.getUp().getId().equals(upEns)) // ou UP correspond
                )
                .map(this::mapFormationToDTO) // conversion en DTO
                .toList();
    }

    /**
     * 2. Créer une demande d’inscription
     * - vérifie d’abord la visibilité
     * - puis si pas ouverte à tous, s’assure que l’UP matche
     */
    @Transactional
    public Inscription demanderInscription(Long formationId, String enseignantId) {
        // 1. Vérifications préalables
        Formation f = formationRepo.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException(FORMATION_INTROUVABLE));

        if (!f.isInscriptionsOuvertes()) {
            throw new IllegalStateException("Cette formation n'est pas visible pour inscription");
        }

        Enseignant e = enseignantRepo.findById(enseignantId)
                .or(() -> enseignantRepo.findByMail(enseignantId))
                .orElseThrow(() -> new IllegalArgumentException("Enseignant introuvable"));

        String upForm = f.getUp() != null ? f.getUp().getId() : null;
        String upEns = e.getUp() != null ? e.getUp().getId() : null;

        if (!f.isOuverte() && (upForm == null || !upForm.equals(upEns))) {
            throw new IllegalStateException("Vous n’êtes pas autorisé à vous inscrire à cette formation");
        }

        // 2. Vérification du chevauchement de dates
        validateNoOverlap(enseignantId, f);

        // 3. Création de l'entité
        Inscription ins = new Inscription();
        ins.setFormation(f);
        ins.setEnseignant(e);

        // 4. Tentative de sauvegarde avec gestion de doublon
        try {
            return inscriptionRepo.save(ins);
        } catch (Exception ex) {
            // Simple catch pour intercepter toute violation de contrainte
            throw new IllegalStateException("Vous avez déjà fait une demande pour cette formation.");
        }
    }

    private void validateNoOverlap(String enseignantId, Formation f) {
        List<Inscription> existingInscriptions = inscriptionRepo.findByEnseignant_Id(enseignantId);
        for (Inscription existing : existingInscriptions) {
            if (existing.getEtat() != EtatInscription.REJECTED) {
                Formation existingF = existing.getFormation();
                if (isOverlapping(existingF, f)) {
                    throw new IllegalStateException(
                            "Chevauchement détecté avec la formation: " + existingF.getTitreFormation());
                }
            }
        }
    }

    private boolean isOverlapping(Formation f1, Formation f2) {
        if (f1.getDateDebut() == null || f1.getDateFin() == null || f2.getDateDebut() == null || f2.getDateFin() == null) {
            return false;
        }
        return f1.getDateDebut().compareTo(f2.getDateFin()) <= 0
                && f1.getDateFin().compareTo(f2.getDateDebut()) >= 0;
    }

    @Transactional(readOnly = true)
    public Page<InscriptionDTO> listerInscriptionsParFormation(Long formationId, Pageable pageable) {
        formationRepo.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException(FORMATION_INTROUVABLE));
        return inscriptionRepo
                .findByFormation_IdFormation(formationId, pageable)
                .map(this::mapInscriptionToDTO);
    }

    /**
     * 3. Lister les demandes PENDING pour D2F ou CUP
     */
    @Transactional(readOnly = true)
    public List<InscriptionDTO> listerInscriptionsParFormation(Long formationId) {
        formationRepo.findById(formationId)
                .orElseThrow(() -> new IllegalArgumentException(FORMATION_INTROUVABLE));
        return inscriptionRepo
                .findByFormation_IdFormation(formationId)
                .stream()
                .map(this::mapInscriptionToDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<FormationDTO> listerFormationsAccessibles(String enseignantId, Pageable pageable) {
        List<FormationDTO> all = self.listerFormationsAccessibles(enseignantId);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<FormationDTO> slice = (start >= all.size()) ? List.of() : all.subList(start, end);
        return new PageImpl<>(slice, pageable, all.size());
    }

    /**
     * 4. Approuver ou rejeter une demande
     */
    @Transactional
    public Inscription traiterDemande(Long inscriptionId, boolean approuver) {
        Inscription ins = inscriptionRepo.findById(inscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("Demande introuvable"));
        ins.setEtat(approuver
                ? EtatInscription.APPROVED
                : EtatInscription.REJECTED);
        return inscriptionRepo.save(ins);
    }

    public SeanceDTO mapSeanceToDTO(SeanceFormation seance) {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(seance.getIdSeance());
        dto.setDateSeance(seance.getDateSeance());
        dto.setHeureDebut(seance.getHeureDebut());
        dto.setHeureFin(seance.getHeureFin());
        dto.setSalle(seance.getSalle());
        dto.setOnlineMeetingUrl(seance.getOnlineMeetingUrl());
        dto.setContenus(seance.getContenus());
        dto.setMethodes(seance.getMethodes());
        dto.setTypeSeance(seance.getTypeSeance());
        dto.setDureePratique(seance.getDureePratique());
        dto.setDureeTheorique(seance.getDureeTheorique());

        if (seance.getAnimateurs() != null) {
            dto.setAnimateurs(seance.getAnimateurs().stream().map(this::mapEnseignantToDTO).toList());
        }
        if (seance.getParticipants() != null) {
            dto.setParticipants(seance.getParticipants().stream().map(this::mapEnseignantToDTO).toList());
        }
        return dto;
    }

    public EnseignantDTO mapEnseignantToDTO(Enseignant ens) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(ens.getId());
        dto.setNom(ens.getNom());
        dto.setPrenom(ens.getPrenom());
        dto.setMail(ens.getMail());
        dto.setType(ens.getType());
        // Null-safe access to avoid NPE when Dept or UP is not assigned
        if (ens.getDept() != null) {
            dto.setDeptLibelle(ens.getDept().getLibelle());
        }
        if (ens.getUp() != null) {
            dto.setUpLibelle(ens.getUp().getLibelle());
        }
        return dto;
    }

    public FormationDTO mapFormationToDTO(Formation formation) {
        FormationDTO dto = new FormationDTO();
        dto.setIdFormation(formation.getIdFormation());
        dto.setTitreFormation(formation.getTitreFormation());
        dto.setTypeFormation(
                formation.getTypeFormation() != null ? formation.getTypeFormation().toString() : "INTERNE");
        dto.setDateDebut(formation.getDateDebut());
        dto.setDateFin(formation.getDateFin());
        dto.setEtatFormation(
                formation.getEtatFormation() != null ? formation.getEtatFormation().toString() : "PLANIFIE");
        dto.setCoutFormation(formation.getCoutFormation());
        dto.setOrganismeRefExterne(formation.getOrganismeRefExterne());
        dto.setCoutHebergement(formation.getCoutHebergement());
        dto.setCoutFormation(formation.getCoutFormation());
        dto.setCoutRepas(formation.getCoutRepas());
        dto.setCoutTransport(formation.getCoutTransport());
        dto.setAcquis(formation.getAcquis());
        dto.setDomaine(formation.getDomaine());
        dto.setEvalMethods(formation.getEvalMethods());
        dto.setIndicateurs(formation.getIndicateurs());
        dto.setObjectifs(formation.getObjectifs());
        dto.setObjectifsPedago(formation.getObjectifsPedago());
        dto.setPopulationCible(formation.getPopulationCible());
        dto.setExterneFormateurEmail(formation.getExterneFormateurEmail());
        dto.setExterneFormateurNom(formation.getExterneFormateurNom());
        dto.setExterneFormateurPrenom(formation.getExterneFormateurPrenom());
        dto.setPrerequis(formation.getPrerequis());
        dto.setChargeHoraireGlobal(formation.getChargeHoraireGlobal());
        dto.setOuverte(formation.isOuverte());
        dto.setInscriptionsOuvertes(formation.isInscriptionsOuvertes());
        if (formation.getSeances() != null) {
            dto.setSeances(formation.getSeances().stream().map(this::mapSeanceToDTO).toList());
        }
        // Transformation pour département
        if (formation.getDepartement() != null) {
            DeptDTO deptDTO = new DeptDTO();
            deptDTO.setId(formation.getDepartement().getId());
            deptDTO.setLibelle(formation.getDepartement().getLibelle());
            dto.setDepartement1(deptDTO);
        }
        // Transformation pour UP
        if (formation.getUp() != null) {
            UpDTO upDTO = new UpDTO();
            upDTO.setId(formation.getUp().getId());
            upDTO.setLibelle(formation.getUp().getLibelle());
            dto.setUp1(upDTO);
        }
        return dto;
    }

    // dans InscriptionService.java
    public InscriptionDTO mapInscriptionToDTO(Inscription ins) {
        InscriptionDTO dto = new InscriptionDTO();
        dto.setId(ins.getId());
        dto.setFormation(mapFormationToDTO(ins.getFormation()));
        dto.setEnseignant(mapEnseignantToDTO(ins.getEnseignant()));
        dto.setEtat(ins.getEtat().toString());
        dto.setDateDemande(ins.getDateDemande());
        return dto;
    }

}
