# Use OpenJDK 17 as base image
FROM openjdk:17-jdk-slim

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml first to cache dependencies
COPY mvnw pom.xml ./
COPY .mvn .mvn

# Copy the source code
COPY src ./src

# Make Maven wrapper executable
RUN chmod +x ./mvnw

# Build the application (skip tests to save time)
RUN ./mvnw clean package -DskipTests

# Expose the port from environment variable (Render sets $PORT)
ENV PORT 10000
EXPOSE $PORT

# Run the Spring Boot app
CMD ["sh", "-c", "java -jar target/rbu-smart-canteen-0.0.1-SNAPSHOT.jar --server.port=$PORT"]
