# Base image builder
FROM eclipse-temurin:17-jdk-alpine as builder

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# Workdir
WORKDIR /opt/app

# Install dos2unix for line-ending fixes on Alpine
RUN apk add --no-cache dos2unix

# Install shared d2f-common-security library (not in Maven Central — local module).
# NB : le contenu d'un cache BuildKit peut être purgé alors que la couche RUN
# reste "CACHED" — l'artefact est donc aussi copié hors du mount (couche image
# persistante) pour éviter un échec de résolution au build suivant.
COPY esprit_D2F-common-security/ /tmp/d2f-common-security/
RUN --mount=type=cache,target=/root/.m2 \
    cd /tmp/d2f-common-security && \
    dos2unix mvnw && chmod u+x mvnw && \
    ./mvnw install -DskipTests && \
    mkdir -p /opt/app/local-m2/repository && \
    cp -r /root/.m2/repository/esprit /opt/app/local-m2/repository/

# Copy Maven Wrapper
COPY esprit_D2F-formation/.mvn/ .mvn/

# Copy Maven Wrapper script && pom.xml
COPY esprit_D2F-formation/mvnw esprit_D2F-formation/pom.xml ./

# Fix mvnw &
RUN dos2unix mvnw && \
    chmod u+x mvnw

# Resolves all project dependencies offline and keep cache
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline

# Copy source code application
COPY esprit_D2F-formation/src ./src

# Install the package to a local repository and keep cache.
# Restaure d2f-common-security depuis la couche image (persistante) et force la
# re-résolution (-U) pour contourner l'échec négatif que Maven met en cache
# (resolver-status.properties) après une tentative ratée sur central.
RUN --mount=type=cache,target=/root/.m2 \
    if [ -d /opt/app/local-m2/repository/esprit ]; then \
        mkdir -p /root/.m2/repository && \
        cp -r /opt/app/local-m2/repository/esprit /root/.m2/repository/ ; \
    fi && \
    ./mvnw clean install -Dmaven.test.skip=true -U

# Unpacking the jar file
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# Base image
FROM eclipse-temurin:17-jre-alpine

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# Create user
RUN addgroup -g 2003 esprit ; adduser  --ingroup esprit --disabled-password --uid 2003 esprit

# Install curl for HEALTHCHECK
RUN apk add --no-cache curl

# Use user
USER esprit

# Path to unpacked jar from builder image
ARG DEPENDENCY=/opt/app/target/dependency

# Copy unpacked jar from builder image
COPY --from=builder ${DEPENDENCY}/BOOT-INF/lib /opt/app/lib
COPY --from=builder ${DEPENDENCY}/META-INF /opt/app/META-INF
COPY --from=builder ${DEPENDENCY}/BOOT-INF/classes /opt/app

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -sf http://localhost:8088/actuator/health || exit 1

ENTRYPOINT ["java","-cp","/opt/app:/opt/app/lib/*","esprit.pfe.serviceformation.ServiceFormationApplication"]
