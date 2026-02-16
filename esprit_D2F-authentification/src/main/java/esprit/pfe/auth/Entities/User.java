package esprit.pfe.auth.Entities;

import jakarta.persistence.*;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;


import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(	name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "username"),
                @UniqueConstraint(columnNames = "email")
        })
@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class User {
    @Id
    @Column(length = 36)                // UUID ou ID enseignant
    private String id;

    @NotBlank
    @Size(max = 20)
    private String username;
    @NotBlank
    private String firstName;
    @NotBlank
    private String lastName;
    @NotBlank
    private String phoneNumber;

    private Boolean disabled = false;

    private String discount;
    private Boolean hasSubscription = false;
    @NotBlank
    @Size(max = 50)
    @Email
    private String email;

    @NotBlank
    @Size(max = 120)
    private String password;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();


    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_devices", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "device_id")
    private Set<String> deviceIds = new HashSet<>();

    @PrePersist
    public void ensureId() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
    public User(String username, String firstName, String lastName, String phoneNumber, String email, String password) {
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.password = password;
    }
    public User(String customerName, String customerEmail) {
        this.username=customerName;
        this.email=customerEmail;
    }
    public String getUserRole(){
        return this.getRoles().stream().toList().get(0).getName().toString();
    }


}
