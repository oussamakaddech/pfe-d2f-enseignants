package esprit.pfe.serviceformation.Services;

import esprit.pfe.serviceformation.DTO.EnseignantDTO;
import esprit.pfe.serviceformation.DTO.SeanceDTO;
import esprit.pfe.serviceformation.Entities.Enseignant;
import esprit.pfe.serviceformation.Entities.SeanceFormation;
import esprit.pfe.serviceformation.Repositories.EnseignantRepository;
import esprit.pfe.serviceformation.Repositories.SeanceFormationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Time;
import java.util.*;

@Service
public class SeanceService {

    @Autowired
    private SeanceFormationRepository seanceRepo;

    @Autowired
    private EnseignantRepository enseignantRepo;

    private boolean canSchedule(
            String userId,
            Date date,
            Time debut,
            Time fin,
            boolean isAnimateur,
            Long ignoreSeanceId
    ) {
        // 1) Charger via le repo la liste existante
        List<SeanceFormation> existantes = isAnimateur
                ? seanceRepo.findByAnimateurAndDate(userId, date)
                : seanceRepo.findByParticipantAndDate(userId, date);

        // 2) Construire un TreeMap<heureDébut, heureFin>
        TreeMap<Time, Time> calendar = new TreeMap<>();
        for (SeanceFormation s : existantes) {
            // si c'est la même séance en update, on ignore
            if (ignoreSeanceId != null && ignoreSeanceId.equals(s.getIdSeance())) {
                continue;
            }
            calendar.put(s.getHeureDebut(), s.getHeureFin());
        }

        // 3) Test « voisin du bas »
        Map.Entry<Time, Time> prev = calendar.floorEntry(debut);
        if (prev != null && prev.getValue().after(debut)) {
            return false;
        }
        // 4) Test « voisin du haut »
        Map.Entry<Time, Time> next = calendar.ceilingEntry(debut);
        if (next != null && next.getKey().before(fin)) {
            return false;
        }
        return true;
    }

    /**
     * CREATE
     * Vérifie pour chaque enseignant (animateur ou participant) qu'il n'y a pas de chevauchement.
     * Sauvegarde la séance et renvoie un SeanceDTO.
     */

    public SeanceDTO createSeance(SeanceDTO dto) {
        SeanceFormation entity = mapDtoToEntity(dto);
        Date date = entity.getDateSeance();
        Time debut = entity.getHeureDebut();
        Time fin   = entity.getHeureFin();

        // 1) Animateurs : on bloque la création si l'un d'eux n'est pas libre
        for (Enseignant anim : entity.getAnimateurs()) {
            if (!canSchedule(anim.getId(), date, debut, fin, true, null)) {
                throw new IllegalArgumentException(
                        "Conflit de planning pour l’animateur id=" + anim.getId());
            }
        }

        // 2) Participants : on filtre uniquement ceux de vrais libres
        List<Enseignant> filteredParticipants = entity.getParticipants().stream()
                .filter(p -> canSchedule(p.getId(), date, debut, fin, false, null))
                .toList();
        entity.setParticipants(filteredParticipants);

        // 3) Sauvegarde
        SeanceFormation saved = seanceRepo.save(entity);
        return mapEntityToDto(saved);
    }

    /* public SeanceDTO createSeance(SeanceDTO dto) {
        // Convertir DTO -> Entity
        SeanceFormation entity = mapDtoToEntity(dto);

        // Vérifier conflit pour chaque animateur
        if (entity.getAnimateurs() != null) {
            for (Enseignant e : entity.getAnimateurs()) {
                if (seanceRepo.existsSeanceConflict(e.getId(),
                        entity.getDateSeance(), entity.getHeureDebut(), entity.getHeureFin())) {
                    throw new IllegalArgumentException("Conflit horaire pour l'enseignant (animateur) " + e.getId());
                }
            }
        }
        // Vérifier conflit pour chaque participant
        if (entity.getParticipants() != null) {
            for (Enseignant e : entity.getParticipants()) {
                if (seanceRepo.existsSeanceConflict(e.getId(),
                        entity.getDateSeance(), entity.getHeureDebut(), entity.getHeureFin())) {
                    throw new IllegalArgumentException("Conflit horaire pour l'enseignant (participant) " + e.getId());
                }
            }
        }

        SeanceFormation saved = seanceRepo.save(entity);
        return mapEntityToDto(saved);
    }*/

    /**
     * READ ALL
     */
    public List<SeanceDTO> getAllSeances() {
        List<SeanceFormation> entities = seanceRepo.findAll();
        List<SeanceDTO> dtos = new ArrayList<>();
        for (SeanceFormation s : entities) {
            dtos.add(mapEntityToDto(s));
        }
        return dtos;
    }

    /**
     * READ BY ID
     */
    public SeanceDTO getSeanceById(Long id) {
        SeanceFormation entity = seanceRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Séance introuvable avec l'id : " + id));
        return mapEntityToDto(entity);
    }

    /**
     * UPDATE
     * On charge la séance existante, on met à jour les champs, on vérifie les conflits
     * en ignorant la séance elle-même.
     */

    public SeanceDTO updateSeance(Long id, SeanceDTO dto) {
        SeanceFormation existing = seanceRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Séance introuvable id=" + id));

        // 1) Appliquer les modifications de date et horaires
        existing.setDateSeance(dto.getDateSeance());
        existing.setHeureDebut(dto.getHeureDebut());
        existing.setHeureFin(dto.getHeureFin());
        existing.setSalle(dto.getSalle());

        // 2) Reconstruire animateurs depuis DTO
        List<Enseignant> newAnim = dto.getAnimateurs().stream()
                .map(eDto -> mapDtoToEnseignant(eDto))
                .toList();
        existing.setAnimateurs(newAnim);

        // 3) Bloquer si animateur en conflit (en ignorant cette séance)
        Date date = existing.getDateSeance();
        Time debut = existing.getHeureDebut();
        Time fin   = existing.getHeureFin();
        for (Enseignant anim : newAnim) {
            if (!canSchedule(anim.getId(), date, debut, fin, true, id)) {
                throw new IllegalArgumentException(
                        "Conflit de planning pour l’animateur id=" + anim.getId());
            }
        }

        // 4) Filtrer participants
        List<Enseignant> newPart = dto.getParticipants().stream()
                .map(eDto -> mapDtoToEnseignant(eDto))
                .filter(p -> canSchedule(p.getId(), date, debut, fin, false, id))
                .toList();
        existing.setParticipants(newPart);

        // 5) Sauvegarde finale
        SeanceFormation saved = seanceRepo.save(existing);
        return mapEntityToDto(saved);
    }

   /* public SeanceDTO updateSeance(Long id, SeanceDTO dto) {
        SeanceFormation existing = seanceRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Séance introuvable avec l'id : " + id));

        // Mettre à jour la date, heure, salle
        existing.setDateSeance(dto.getDateSeance());
        existing.setHeureDebut(dto.getHeureDebut());
        existing.setHeureFin(dto.getHeureFin());
        existing.setSalle(dto.getSalle());

        // Reconstruire animateurs et participants
        List<Enseignant> animateurs = new ArrayList<>();
        if (dto.getAnimateurs() != null) {
            for (EnseignantDTO eDto : dto.getAnimateurs()) {
                Enseignant e = mapDtoToEnseignant(eDto);
                animateurs.add(e);
            }
        }
        existing.getAnimateurs().clear();
        existing.getAnimateurs().addAll(animateurs);

        List<Enseignant> participants = new ArrayList<>();
        if (dto.getParticipants() != null) {
            for (EnseignantDTO eDto : dto.getParticipants()) {
                Enseignant e = mapDtoToEnseignant(eDto);
                participants.add(e);
            }
        }
        existing.getParticipants().clear();
        existing.getParticipants().addAll(participants);

        // Vérifier conflits en ignorant la séance actuelle
        // Animateurs
        for (Enseignant e : existing.getAnimateurs()) {
            boolean conflict = seanceRepo.existsSeanceConflictIgnoringSelf(
                    e.getId(),
                    existing.getDateSeance(),
                    existing.getHeureDebut(),
                    existing.getHeureFin(),
                    existing.getIdSeance()
            );
            if (conflict) {
                throw new IllegalArgumentException("Conflit horaire pour l'enseignant (animateur) " + e.getId());
            }
        }
        // Participants
        for (Enseignant e : existing.getParticipants()) {
            boolean conflict = seanceRepo.existsSeanceConflictIgnoringSelf(
                    e.getId(),
                    existing.getDateSeance(),
                    existing.getHeureDebut(),
                    existing.getHeureFin(),
                    existing.getIdSeance()
            );
            if (conflict) {
                throw new IllegalArgumentException("Conflit horaire pour l'enseignant (participant) " + e.getId());
            }
        }

        SeanceFormation saved = seanceRepo.save(existing);
        return mapEntityToDto(saved);
    }*/

    /**
     * DELETE
     */
    public void deleteSeance(Long id) {
        SeanceFormation existing = seanceRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Séance introuvable avec l'id : " + id));
        // Retirer les relations ManyToMany
        if (existing.getAnimateurs() != null) {
            existing.getAnimateurs().clear();
        }
        if (existing.getParticipants() != null) {
            existing.getParticipants().clear();
        }
        seanceRepo.save(existing);
        seanceRepo.delete(existing);
    }

    //---------------------------------------------------------------------------------
    // Méthodes utilitaires de mapping
    //---------------------------------------------------------------------------------

    /**
     * Convertit un SeanceDTO en SeanceFormation (création).
     * Ici, on crée un nouvel objet SeanceFormation.
     */
    private SeanceFormation mapDtoToEntity(SeanceDTO dto) {
        SeanceFormation entity = new SeanceFormation();
        entity.setIdSeance(dto.getIdSeance());
        entity.setDateSeance(dto.getDateSeance());
        entity.setHeureDebut(dto.getHeureDebut());
        entity.setHeureFin(dto.getHeureFin());
        entity.setSalle(dto.getSalle());

        // Convertir animateurs
        List<Enseignant> animateurs = new ArrayList<>();
        if (dto.getAnimateurs() != null) {
            for (EnseignantDTO eDto : dto.getAnimateurs()) {
                Enseignant e = mapDtoToEnseignant(eDto);
                animateurs.add(e);
            }
        }
        entity.setAnimateurs(animateurs);

        // Convertir participants
        List<Enseignant> participants = new ArrayList<>();
        if (dto.getParticipants() != null) {
            for (EnseignantDTO eDto : dto.getParticipants()) {
                Enseignant e = mapDtoToEnseignant(eDto);
                participants.add(e);
            }
        }
        entity.setParticipants(participants);

        return entity;
    }

    /**
     * Convertit SeanceFormation -> SeanceDTO
     */
    private SeanceDTO mapEntityToDto(SeanceFormation entity) {
        SeanceDTO dto = new SeanceDTO();
        dto.setIdSeance(entity.getIdSeance());
        dto.setDateSeance(entity.getDateSeance());
        dto.setHeureDebut(entity.getHeureDebut());
        dto.setHeureFin(entity.getHeureFin());
        dto.setSalle(entity.getSalle());

        // Convertir animateurs
        List<EnseignantDTO> animDtos = new ArrayList<>();
        if (entity.getAnimateurs() != null) {
            for (Enseignant e : entity.getAnimateurs()) {
                animDtos.add(mapEnseignantToDto(e));
            }
        }
        dto.setAnimateurs(animDtos);

        // Convertir participants
        List<EnseignantDTO> partDtos = new ArrayList<>();
        if (entity.getParticipants() != null) {
            for (Enseignant e : entity.getParticipants()) {
                partDtos.add(mapEnseignantToDto(e));
            }
        }
        dto.setParticipants(partDtos);

        return dto;
    }

    /**
     * Convertit un EnseignantDTO -> Enseignant
     */
    private Enseignant mapDtoToEnseignant(EnseignantDTO eDto) {
        // Ici, on crée un nouvel objet Enseignant
        // (ou on pourrait faire un findById si on veut récupérer un enseignant existant)
        Enseignant e = new Enseignant();
        e.setId(eDto.getId());
        e.setNom(eDto.getNom());
        e.setPrenom(eDto.getPrenom());
        e.setMail(eDto.getMail());
        e.setType(eDto.getType());
        // upLibelle, deptLibelle ne sont pas des champs directs dans la classe Enseignant
        // on peut ignorer ou faire un find sur Up / Dept si besoin
        return e;
    }

    /**
     * Convertit un Enseignant -> EnseignantDTO
     */
    private EnseignantDTO mapEnseignantToDto(Enseignant e) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(e.getId());
        dto.setNom(e.getNom());
        dto.setPrenom(e.getPrenom());
        dto.setMail(e.getMail());
        dto.setType(e.getType());
        // upLibelle, deptLibelle peuvent être dérivés de e.getUp() et e.getDept()
        if (e.getUp() != null) {
            dto.setUpLibelle(e.getUp().getLibelle());
        }
        if (e.getDept() != null) {
            dto.setDeptLibelle(e.getDept().getLibelle());
        }
        return dto;
    }
}
