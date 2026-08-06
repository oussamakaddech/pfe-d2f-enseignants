# =============================================================================
# Dockerfile — notification-service
# Multi-stage build : builder (JDK 17) → runtime (JRE 17 Alpine)
# =============================================================================

# ── Stage 1 : Build ───────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

WORKDIR /opt/build

RUN apk add --no-cache dos2unix

# Install shared d2f-common-security library (non publiée sur Maven Central)
COPY esprit_D2F-common-security/ /tmp/d2f-common-security/
RUN --mount=type=cache,target=/root/.m2 \
    cd /tmp/d2f-common-security && \
    dos2unix mvnw && chmod +x mvnw && \
    ./mvnw install -DskipTests -q

# Copy the service sources
WORKDIR /opt/build/esprit_D2F-notification
COPY esprit_D2F-notification/pom.xml        ./
COPY esprit_D2F-notification/src/           src/

# Copy Maven Wrapper
COPY esprit_D2F-notification/.mvn/  .mvn/
COPY esprit_D2F-notification/mvnw   ./
RUN dos2unix mvnw && chmod +x mvnw

# Resolve dependencies (cached layer)
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline -q

# Build & package
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean package -Dmaven.test.skip=true -q

# Unpack layered jar for optimal Docker layer caching
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# ── Stage 2 : Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

RUN addgroup -g 2003 -S esprit && \
    adduser -u 2003 -S esprit -G esprit

# Copy layered jar from builder
ARG DEPENDENCY=/opt/build/esprit_D2F-notification/target/dependency
COPY --from=builder --chown=esprit:esprit ${DEPENDENCY}/BOOT-INF/lib  /opt/app/lib
COPY --from=builder --chown=esprit:esprit ${DEPENDENCY}/META-INF       /opt/app/META-INF
COPY --from=builder --chown=esprit:esprit ${DEPENDENCY}/BOOT-INF/classes /opt/app

RUN apk add --no-cache curl

USER esprit

WORKDIR /opt/app

EXPOSE 8009

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -sf http://localhost:8009/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-cp", "/opt/app:/opt/app/lib/*", \
  "tn.esprit.d2f.NotificationServiceApplication"]
