# Base image builder
FROM eclipse-temurin:17-jdk-alpine as builder

LABEL Author="D2F Team"
LABEL maintainer="D2F Team"

WORKDIR /opt/app

# Copy Maven Wrapper
COPY .mvn/ .mvn

# Copy Maven Wrapper script && pom.xml
COPY mvnw pom.xml ./

# Fix mvnw
RUN dos2unix mvnw && \
    chmod u+x mvnw

# Resolves all project dependencies offline and keep cache
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline

# Copy source code application
COPY ./src ./src

# Install the package to a local repository and keep cache
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean install -DskipTests

# Unpacking the jar file
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# Base image
FROM eclipse-temurin:17-jre-alpine

LABEL Author="D2F Team"
LABEL maintainer="D2F Team"

# Create user
RUN addgroup -g 2009 esprit ; adduser  --ingroup esprit --disabled-password --uid 2009 esprit

# Use user
USER esprit

# Path to unpacked jar from builder image
ARG DEPENDENCY=/opt/app/target/dependency

# Copy unpacked jar from builder image
COPY --from=builder ${DEPENDENCY}/BOOT-INF/lib /opt/app/lib
COPY --from=builder ${DEPENDENCY}/META-INF /opt/app/META-INF
COPY --from=builder ${DEPENDENCY}/BOOT-INF/classes /opt/app

# Expose port
EXPOSE 8089

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -q --spider http://localhost:8089/actuator/health || exit 1

# Run app when container starts
ENTRYPOINT ["java","-cp","opt/app:opt/app/lib/*","esprit.pfe.serviceanalyse.ServiceAnalyseApplication"]