package esprit.pfe.auth.payload.request;

import lombok.Data;

@Data
public class EditProfileRequest {

    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
}
