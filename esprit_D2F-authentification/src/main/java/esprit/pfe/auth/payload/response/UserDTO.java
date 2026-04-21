package esprit.pfe.auth.payload.response;

import esprit.pfe.auth.Entities.User;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private String id;
    private String userName;
    private String firsName;
    private String lastName;
    private String phoneNumber;
    private String email;
    private String role;
    private Boolean status;

    public UserDTO(User user) {
        this.id = user.getId();
        this.userName = user.getUsername();
        this.firsName = user.getFirstName();
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
    }
}
