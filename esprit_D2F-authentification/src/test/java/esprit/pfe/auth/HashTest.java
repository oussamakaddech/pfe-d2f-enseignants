package esprit.pfe.auth;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashTest {
    @Test
    public void printHash() {
        System.out.println("HASH_START=" + new BCryptPasswordEncoder().encode("admin") + "=HASH_END");
    }
}
