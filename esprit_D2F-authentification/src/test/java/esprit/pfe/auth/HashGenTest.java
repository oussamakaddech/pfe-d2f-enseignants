package esprit.pfe.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashGenTest {
    @Test
    public void generateHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("admin");
        System.out.println("==HASH_START==" + hash + "==HASH_END==");
    }
}
