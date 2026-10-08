FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S pms && adduser -S pms -G pms
COPY --from=build /workspace/target/pms-hotel-backend-0.0.1-SNAPSHOT.jar app.jar
RUN chown pms:pms app.jar

USER pms
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
