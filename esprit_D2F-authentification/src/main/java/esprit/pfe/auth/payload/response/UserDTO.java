package esprit.pfe.auth.payload.response;

import esprit.pfe.auth.entities.User;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private String id;
    private String userName;
    private String firsName;   // kept for backwards compatibility
    private String firstName;  // correct field name
    private String lastName;
    private String phoneNumber;
    private String email;
    private String role;
    private Boolean status;
    /** true si le compte est archivé (soft-deleted). Renseigné pour la vue admin. */
    private Boolean deleted;

    public UserDTO(User user) {
        this.id = user.getId();
        this.userName = user.getUsername();
        this.firsName = user.getFirstName();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.phoneNumber = user.getPhoneNumber();
        this.email = user.getEmail();
        // Handle case where user might not have roles
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            this.role = user.getRoles().stream().findFirst()
                    .map(r -> r.getName().name())
                    .orElse("USER");
        } else {
            this.role = "USER";
        }
        this.status = user.getDisabled();
        this.deleted = user.getDeletedAt() != null;
    }
}
