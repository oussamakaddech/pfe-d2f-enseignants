# syntax=docker/dockerfile:1.4

# Base image builder
FROM eclipse-temurin:17-jdk-alpine AS builder

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik bouzayani <seddik.bouzayani@esprit.tn>"

# Workdir
WORKDIR /opt/app

# Utilities needed for Windows -> Unix line endings
RUN apk add --no-cache dos2unix

# Copy Maven Wrapper
COPY .mvn/ .mvn

# Copy Maven Wrapper script && pom.xml
COPY mvnw pom.xml ./

# Fix mvnw & permissions
RUN dos2unix mvnw && \
    chmod u+x mvnw

# Resolves all project dependencies offline and keep cache   
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B dependency:go-offline

# Copy source code application
COPY ./src ./src

# Install the package to a local repository and keep cache
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B clean package -DskipTests

# Unpacking the jar file
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# Base image
FROM eclipse-temurin:17-jre-alpine

# Authors
LABEL Author="seddik bouzayani <seddik.bouzayani@esprit.tn>"
LABEL maintainer="seddik.bouzayani <seddik.bouzayani@esprit.tn>"

# Create user (Alpine-compatible)
RUN addgroup -g 2003 esprit && adduser -D -u 2003 -G esprit esprit

# Use user
USER esprit

# Path to unpacked jar from builder image
ARG DEPENDENCY=/opt/app/target/dependency

# Copy unpacked jar from builder image
COPY --from=builder ${DEPENDENCY}/BOOT-INF/lib /opt/app/lib
COPY --from=builder ${DEPENDENCY}/META-INF /opt/app/META-INF
COPY --from=builder ${DEPENDENCY}/BOOT-INF/classes /opt/app

# Run app when container starts (set correct main class for this project)
ENTRYPOINT ["java","-cp","/opt/app:/opt/app/lib/*","esprit.pfe.servicecertificat.ServiceCertificatApplication"]
