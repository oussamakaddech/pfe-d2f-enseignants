package esprit.pfe.serviceformation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Requête combinée « compte + fiche enseignant » : permet de créer en UN SEUL
 * appel le compte (service auth) puis la fiche enseignant rattachée (service
 * formation), via orchestration côté formation.
 *
 * <p>Regroupe les champs d'identité/identifiants du compte et les champs métier
 * du profil enseignant. Le rôle est passé en paramètre de requête (pas dans le
 * corps), comme pour {@code create-account}.
 */
@Getter
@Setter
public class EnseignantWithAccountRequest {

    // ── Compte (auth) ───────────────────────────────────────────────────────
    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    @Size(min = 3, max = 20)
    private String username;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, max = 72)
    private String password;

    // ── Identité (partagée compte + fiche) ────────────────────────────────────
    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format d'email invalide")
    private String email;

    @NotBlank(message = "Le téléphone est obligatoire")
    private String phoneNumber;

    // ── Profil enseignant (formation) ─────────────────────────────────────────
    private String type;
    private String etat;
    private String cup;
    private String chefDepartement;
    private String grade;
    private String specialite;
    private String upId;
    private String deptId;

    /** Construit le payload de création de compte (auth). */
    public AccountCreationRequest toAccountRequest() {
        return AccountCreationRequest.builder()
                .username(username)
                .password(password)
                .firstName(firstName)
                .lastName(lastName)
                .phoneNumber(phoneNumber)
                .email(email)
                .build();
    }

    /** Construit le DTO de création de fiche enseignant, rattachée au compte. */
    public EnseignantRequest toEnseignantRequest(String userId) {
        EnseignantRequest req = new EnseignantRequest();
        req.setNom(lastName);
        req.setPrenom(firstName);
        req.setMail(email);
        req.setTelephone(phoneNumber);
        req.setType(type);
        req.setEtat(etat);
        req.setCup(cup);
        req.setChefDepartement(chefDepartement);
        req.setGrade(grade);
        req.setSpecialite(specialite);
        req.setUpId(upId);
        req.setDeptId(deptId);
        req.setUserId(userId);
        return req;
    }
}
