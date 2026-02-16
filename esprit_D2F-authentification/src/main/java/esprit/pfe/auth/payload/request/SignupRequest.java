package esprit.pfe.auth.payload.request;

///////import javax.validation.constraints.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequest {
    private String id;
    @NotBlank
    @Size(min = 3, max = 20)
    private String username;

    private String firstName;

    private String lastName;

    private String phoneNumber;
 
    @NotBlank
    @Size(max = 50)
    @Email
    private String email;
    
    private String role;
    
    @NotBlank
    @Size(min = 6, max = 40)
    private String password;

}
