package tn.esprit.d2f.competence;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;

class CompetenceServiceApplicationTest {

    @Test
    void main() {
        try (MockedStatic<SpringApplication> mocked = Mockito.mockStatic(SpringApplication.class)) {
            mocked.when(() -> SpringApplication.run(CompetenceServiceApplication.class, new String[]{}))
                  .thenReturn(null);

            CompetenceServiceApplication.main(new String[]{});

            mocked.verify(() -> SpringApplication.run(CompetenceServiceApplication.class, new String[]{}));
        }
    }
}
