package esprit.pfe.serviceformation.dto;

import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Up;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO d'entrée pour la création / mise à jour d'un enseignant.
 *
 * <p>Remplace l'exposition directe de l'entité JPA {@code Enseignant} en
 * {@code @RequestBody} (anti mass-assignment : le client ne peut plus écrire les
 * colonnes d'audit ni manipuler les associations au-delà de upId/deptId).
 *
 * <p>La validation stricte (@NotBlank/@Email) n'est appliquée qu'à la création
 * (POST + {@code @Valid}). La mise à jour (PUT) reste partielle/null-safe.
 */
@Getter
@Setter
public class EnseignantRequest {

    // Optionnel : auto-généré (E00001…) côté service s'il est absent.
    private String id;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100)
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 30)
    private String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format d'email invalide")
    @Size(max = 255)
    private String mail;

    @Size(max = 50)
    private String type;

    @Size(max = 50)
    private String etat;

    @Size(max = 50)
    private String cup;

    @Size(max = 50)
    private String chefDepartement;

    @Size(max = 100)
    private String grade;

    @Size(max = 150)
    private String specialite;

    @Size(max = 30)
    private String telephone;

    @Size(max = 500)
    private String photoUrl;

    /** Identifiant du compte (auth.users) à rattacher — optionnel. */
    @Size(max = 36)
    private String userId;

    /** Identifiants des associations (résolus en références côté entité). */
    private String upId;
    private String deptId;

    /** Construit une entité {@link Enseignant} à partir du DTO (mapping contrôlé). */
    public Enseignant toEntity() {
        Enseignant e = new Enseignant();
        e.setId(id);
        e.setNom(nom);
        e.setPrenom(prenom);
        e.setMail(mail);
        e.setType(type);
        e.setEtat(etat);
        e.setCup(cup);
        e.setChefDepartement(chefDepartement);
        e.setGrade(grade);
        e.setSpecialite(specialite);
        e.setTelephone(telephone);
        e.setPhotoUrl(photoUrl);
        e.setUserId(userId);
        if (upId != null && !upId.isBlank()) {
            Up up = new Up();
            up.setId(upId);
            e.setUp(up);
        }
        if (deptId != null && !deptId.isBlank()) {
            Dept dept = new Dept();
            dept.setId(deptId);
            e.setDept(dept);
        }
        return e;
    }
}
