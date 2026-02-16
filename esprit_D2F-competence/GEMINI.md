# Project Overview

This is a Spring Boot microservice for managing competencies within the ESPRIT ecosystem. It provides a complete solution for handling competencies, including their relationships with domains, levels, and knowledge, through a microservices architecture and ActiveMQ messaging.

**Key Technologies:**

*   **Backend:** Java 17, Spring Boot 3.4.2, Spring Data JPA, PostgreSQL
*   **Messaging:** ActiveMQ/Artemis for asynchronous communication via JMS
*   **API:** REST APIs with Spring Web
*   **Build:** Apache Maven

**Architecture:**

The project follows a classic microservice architecture. The Competence service manages competencies and communicates with other services (Domaine, Niveau, Savoir) to retrieve related information. It uses Feign clients for synchronous communication and ActiveMQ for asynchronous messaging, particularly for assigning knowledge to competencies. The JMS queues `competence.affect.queue` and `savoir.affect.queue` are used for this purpose.

# Building and Running

## Prerequisites

*   Java 17
*   Apache Maven
*   PostgreSQL
*   ActiveMQ

## Building the Project

To build the project, run the following command from the root directory:

```bash
./mvnw clean install
```

## Running the Project

To run the project, you can use the following command:

```bash
./mvnw spring-boot:run
```

The application will start on port `8001` by default.

## Configuration

The application's configuration is located in the `src/main/resources/application.properties` file. This file contains the database connection details, ActiveMQ broker URL, and other settings.

# Docker

To build the Docker image, run the following command from the root directory:

```bash
docker build -t competence-service .
```

To run the Docker container, use the following command:

```bash
docker run -p 8001:8001 competence-service
```

# CI/CD

The project uses Drone CI for continuous integration and deployment. The pipeline is defined in the `.drone-qa.yml` file and is triggered on push events to branches matching `release/*`.

**Pipeline Steps:**

1.  **Build and Publish:** Builds a Docker image and pushes it to a private registry.
2.  **Compose Deploy:** Connects to a server via SSH, updates a `docker-compose.yml` file with the new image tag, and deploys the application using `docker compose up -d`.
3.  **Notifications:** Sends email notifications on pipeline success or failure.

# Development Conventions

## Code Style

The project uses the standard Java code style. Lombok is used to reduce boilerplate code, so annotations like `@Data`, `@AllArgsConstructor`, and `@NoArgsConstructor` are common.

## API Endpoints

The REST API endpoints are defined in the `src/main/java/tn/esprit/d2f/controller` package. The main controllers are:

*   `CompetenceController`: Manages competencies, including CRUD operations and assignments.
*   `UserCompetenceController`: Manages the relationship between users and competencies.

## Service Layer

The business logic is implemented in the `src/main/java/tn/esprit/d2f/service` package. The `CompetenceServiceImpl` class contains the core business logic for managing competencies.

## Data Access

The project uses Spring Data JPA for data access. The repositories are defined in the `src/main/java/tn/esprit/d2f/repository` package.
