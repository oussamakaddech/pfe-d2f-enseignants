package esprit.pfe.serviceevaluation.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

public class DotEnvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        List<Path> candidates = List.of(
                Paths.get(".env"),
                Paths.get(".env.local"),
                Paths.get("..", ".env"),
                Paths.get("..", ".env.local")
        );

        List<PropertiesPropertySource> sources = new ArrayList<>();
        for (Path candidate : candidates) {
            Properties properties = loadIfPresent(candidate);
            if (!properties.isEmpty()) {
                sources.add(new PropertiesPropertySource("dotenv:" + candidate.toAbsolutePath().normalize(), properties));
            }
        }

        for (PropertiesPropertySource source : sources) {
            environment.getPropertySources().addLast(source);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private Properties loadIfPresent(Path path) {
        Properties properties = new Properties();
        if (!Files.exists(path)) {
            return properties;
        }

        try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            properties.load(reader);
        } catch (IOException ignored) {
            // Ignore unreadable local env files and continue with standard Spring sources.
        }
        return properties;
    }
}