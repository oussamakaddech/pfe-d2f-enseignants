# Base image builder
FROM eclipse-temurin:17-jdk-alpine as builder

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# Workdir
WORKDIR /opt/app

# Copy both modules so the shared auth artifact can be installed first
COPY esprit_D2F-authentification/ esprit_D2F-authentification/
COPY esprit_D2F-besoin-formation/ esprit_D2F-besoin-formation/

# Install the shared auth module into the local Maven repo
RUN cd esprit_D2F-authentification && dos2unix mvnw && \
  chmod u+x mvnw && \
  ./mvnw clean install -DskipTests

# Build the besoin-formation service from its own directory
WORKDIR /opt/app/esprit_D2F-besoin-formation

# Copy Maven Wrapper
COPY esprit_D2F-besoin-formation/.mvn/ .mvn/
COPY esprit_D2F-besoin-formation/mvnw ./
COPY esprit_D2F-besoin-formation/pom.xml ./

# Fix mvnw &
RUN dos2unix mvnw && \
  chmod u+x mvnw

# Resolves all project dependencies offline and keep cache
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline

# Copy source code application
COPY esprit_D2F-besoin-formation/src ./src

# Install the package to a local repository and keep cache
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean install -DskipTests

# Unpacking the jar file
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# Base image
FROM eclipse-temurin:17-jre-alpine

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# Create user
RUN addgroup -g 2003 esprit ; adduser  --ingroup esprit --disabled-password --uid 2003 esprit

# Use user
USER esprit

# Path to unpacked jar from builder image
ARG DEPENDENCY=/opt/app/esprit_D2F-besoin-formation/target/dependency

# Copy unpacked jar from builder image
COPY --from=builder ${DEPENDENCY}/BOOT-INF/lib /opt/app/lib
COPY --from=builder ${DEPENDENCY}/META-INF /opt/app/META-INF
COPY --from=builder ${DEPENDENCY}/BOOT-INF/classes /opt/app

# Expose port
EXPOSE 8004

# Healthcheck — vérifie que Spring Boot Actuator répond (conformité DSI §2.1)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -q --spider http://localhost:8004/actuator/health || exit 1

# Run app when container starts
ENTRYPOINT ["java","-cp","opt/app:opt/app/lib/*","tn.esprit.d2f.BesoinsFormationApplication"]
