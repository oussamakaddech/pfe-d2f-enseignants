# 📋 Guide de Configuration des Tests - D2F Platform

> **Date** : 25 Avril 2026
> **Objectif** : Configuration des tests et de la couverture de code avec JaCoCo

---

## 📊 Table des Matières

1. [Configuration JaCoCo](#configuration-jacoco)
2. [Tests Backend](#tests-backend)
3. [Tests Frontend](#tests-frontend)
4. [Couverture de Code](#couverture-de-code)
5. [Intégration SonarQube](#intégration-sonarqube)

---

## Configuration JaCoCo

### 1. Ajouter la dépendance JaCoCo dans `pom.xml`

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.jacoco</groupId>
            <artifactId>jacoco-maven-plugin</artifactId>
            <version>0.8.11</version>
            <executions>
                <execution>
                    <id>prepare-agent</id>
                    <goals>
                        <goal>prepare-agent</goal>
                    </goals>
                </execution>
                <execution>
                    <id>report</id>
                    <phase>test</phase>
                    <goals>
                        <goal>report</goal>
                    </goals>
                </execution>
                <execution>
                    <id>jacoco-check</id>
                    <goals>
                        <goal>check</goal>
                    </goals>
                    <configuration>
                        <rules>
                            <rule>
                                <element>PACKAGE</element>
                                <limits>
                                    <limit>
                                        <counter>LINE</counter>
                                        <value>COVEREDRATIO</value>
                                        <minimum>0.70</minimum>
                                    </limit>
                                </limits>
                            </rule>
                        </rules>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### 2. Exécuter les tests avec JaCoCo

```bash
mvn clean test jacoco:report
```

### 3. Voir le rapport

Le rapport est généré dans `target/site/jacoco/index.html`

---

## Tests Backend

### Structure des Tests

```
src/test/java/esprit/
├── controller/      # Tests des contrôleurs
├── service/         # Tests des services
├── repository/      # Tests des repositories
└── integration/     # Tests d'intégration
```

### Exemple de Test de Contrôleur

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FormationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FormationService formationService;

    @Test
    void getAllFormations_ShouldReturnOk() throws Exception {
        // Given
        List<Formation> formations = Arrays.asList(
            new Formation(1L, "Formation 1", "Description 1"),
            new Formation(2L, "Formation 2", "Description 2")
        );
        when(formationService.getAllFormations()).thenReturn(formations);

        // When & Then
        mockMvc.perform(get("/api/formations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].id", is(1)))
            .andExpect(jsonPath("$[0].titre", is("Formation 1")));
    }
}
```

### Exemple de Test de Service

```java
@SpringBootTest
@ActiveProfiles("test")
class FormationServiceTest {

    @Autowired
    private FormationService formationService;

    @MockBean
    private FormationRepository formationRepository;

    @Test
    void createFormation_ShouldReturnSavedFormation() {
        // Given
        Formation formation = new Formation(null, "Nouvelle Formation", "Description");
        Formation savedFormation = new Formation(1L, "Nouvelle Formation", "Description");

        when(formationRepository.save(any(Formation.class))).thenReturn(savedFormation);

        // When
        Formation result = formationService.createFormation(formation);

        // Then
        assertNotNull(result.getId());
        assertEquals("Nouvelle Formation", result.getTitre());
        verify(formationRepository, times(1)).save(any(Formation.class));
    }
}
```

### Exemple de Test de Repository

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class FormationRepositoryTest {

    @Autowired
    private FormationRepository formationRepository;

    @Test
    void findById_ShouldReturnFormation() {
        // Given
        Formation formation = new Formation(1L, "Formation 1", "Description 1");
        formationRepository.save(formation);

        // When
        Optional<Formation> result = formationRepository.findById(1L);

        // Then
        assertTrue(result.isPresent());
        assertEquals("Formation 1", result.get().getTitre());
    }
}
```

---

## Tests Frontend

### Structure des Tests

```
src/
├── components/      # Tests des composants
├── pages/          # Tests des pages
└── __tests__/      # Tests utilitaires
```

### Exemple de Test de Composant

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import FormationList from './FormationList';

describe('FormationList', () => {
  const mockFormations = [
    { id: 1, titre: 'Formation 1', description: 'Description 1' },
    { id: 2, titre: 'Formation 2', description: 'Description 2' }
  ];

  it('should render formations', () => {
    render(<FormationList formations={mockFormations} />);

    expect(screen.getByText('Formation 1')).toBeInTheDocument();
    expect(screen.getByText('Formation 2')).toBeInTheDocument();
  });

  it('should handle click on formation', () => {
    const handleClick = jest.fn();
    render(<FormationList formations={mockFormations} onClick={handleClick} />);

    fireEvent.click(screen.getByText('Formation 1'));
    expect(handleClick).toHaveBeenCalledWith(1);
  });
});
```

### Exemple de Test d'API

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { fetchFormations } from './api/formations';

const server = setupServer(
  rest.get('/api/formations', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, titre: 'Formation 1', description: 'Description 1' }
      ])
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchFormations', () => {
  it('should fetch formations', async () => {
    const formations = await fetchFormations();

    expect(formations).toHaveLength(1);
    expect(formations[0].titre).toBe('Formation 1');
  });
});
```

---

## Couverture de Code

### Objectifs de Couverture

| Type de Test | Couverture Minimale |
|-------------|-------------------|
| Services Critiques (Auth, Formation) | 80% |
| Services Standards (Competence, Evaluation) | 70% |
| Services Secondaires (Besoin, Certificat) | 60% |
| Frontend | 70% |

### Vérifier la Couverture

```bash
# Backend
mvn clean test jacoco:report

# Frontend
npm test -- --coverage
```

### Rapports JaCoCo

- **HTML** : `target/site/jacoco/index.html`
- **XML** : `target/site/jacoco/jacoco.xml`
- **CSV** : `target/site/jacoco/jacoco.csv`

---

## Intégration SonarQube

### Configuration SonarQube

Voir `sonar-project.properties` dans chaque service.

### Exécuter l'analyse SonarQube

```bash
# Backend
mvn sonar:sonar   -Dsonar.projectKey=d2f_formation   -Dsonar.host.url=http://localhost:9000   -Dsonar.login=YOUR_TOKEN

# Frontend
sonar-scanner   -Dsonar.projectKey=d2f_webapp   -Dsonar.host.url=http://localhost:9000   -Dsonar.login=YOUR_TOKEN
```

### Quality Gates

Les Quality Gates sont configurés dans SonarQube avec les seuils suivants :

- **Coverage on New Code** : ≥ 70%
- **Duplicated Lines on New Code** : ≤ 3%
- **Maintainability Rating** : A
- **Reliability Rating** : A
- **Security Rating** : A

---

## 🚀 Commandes Utiles

```bash
# Exécuter tous les tests
mvn test

# Exécuter les tests avec couverture
mvn test jacoco:report

# Exécuter un test spécifique
mvn test -Dtest=FormationServiceTest

# Exécuter les tests frontend
npm test

# Exécuter les tests frontend avec couverture
npm test -- --coverage

# Analyser avec SonarQube
mvn sonar:sonar
```

---

## 📚 Ressources

- [JaCoCo Documentation](https://www.jacoco.org/jacoco/trunk/doc/)
- [Spring Boot Testing](https://spring.io/guides/gs/testing-web/)
- [React Testing Library](https://testing-library.com/react)
- [SonarQube Documentation](https://docs.sonarqube.org/)

---

**Fin du Guide de Configuration des Tests**
