# Base image builder
FROM eclipse-temurin:17-jdk-alpine as builder

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# Workdir
WORKDIR /opt/app

# Install shared d2f-common-security library (not in Maven Central — local module)
COPY esprit_D2F-common-security/ /tmp/d2f-common-security/
RUN --mount=type=cache,target=/root/.m2 \
    cd /tmp/d2f-common-security && \
    dos2unix mvnw && chmod u+x mvnw && \
    ./mvnw install -DskipTests

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
ARG DEPENDENCY=/opt/app/target/dependency

# Copy unpacked jar from builder image
COPY --from=builder ${DEPENDENCY}/BOOT-INF/lib /opt/app/lib
COPY --from=builder ${DEPENDENCY}/META-INF /opt/app/META-INF
COPY --from=builder ${DEPENDENCY}/BOOT-INF/classes /opt/app

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -q --spider http://localhost:8088/actuator/health || exit 1

ENTRYPOINT ["java","-cp","opt/app:opt/app/lib/*","esprit.pfe.serviceformation.ServiceFormationApplication"]
