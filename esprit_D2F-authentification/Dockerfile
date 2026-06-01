# ============================================================
# Stage 1 — Builder : compile le projet Maven
# ============================================================
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /opt/app

# Install shared d2f-common-security library (not in Maven Central — local module)
COPY esprit_D2F-common-security/ /tmp/d2f-common-security/
RUN --mount=type=cache,target=/root/.m2 \
    cd /tmp/d2f-common-security && \
    dos2unix mvnw && chmod u+x mvnw && \
    ./mvnw install -DskipTests

# Copy Maven Wrapper
COPY esprit_D2F-authentification/.mvn/ .mvn/
COPY esprit_D2F-authentification/mvnw esprit_D2F-authentification/pom.xml ./

# Fix line endings & permissions
RUN dos2unix mvnw && chmod u+x mvnw

# Resolve dependencies (cached layer)
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline

# Copy source code
COPY esprit_D2F-authentification/src ./src

# Build the fat JAR (skip tests — already run in CI)
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean package -DskipTests

# ============================================================
# Stage 2 — Runtime : image légère JRE-only
# ============================================================
FROM eclipse-temurin:17-jre-alpine

LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# --- Utilisateur non-root (UID 2003) ---
RUN addgroup -g 2003 esprit && \
    adduser -G esprit -u 2003 -D esprit

# --- Dépendances runtime (curl pour HEALTHCHECK) ---
RUN apk add --no-cache curl

# --- Répertoire de l'application ---
WORKDIR /app

# --- Copie du JAR depuis le builder ---
ARG JAR_FILE=target/*.jar
COPY --from=builder /opt/app/${JAR_FILE} /app/app.jar

# --- Propriété du répertoire à l'utilisateur esprit ---
RUN chown -R esprit:esprit /app

# --- Bascule vers l'utilisateur non-root ---
USER esprit

# --- Variables d'environnement ---
ENV JAVA_OPTS=""

# --- Port exposé ---
EXPOSE 8085

# --- Healthcheck via curl sur Actuator ---
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -sf http://localhost:8085/actuator/health || exit 1

# --- Démarrage : JSON array strict, pas de wildcard ---
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
