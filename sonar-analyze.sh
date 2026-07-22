#!/bin/sh
set -e
PROJECT_KEY=$1
PROJECT_DIR=$2
cd "$PROJECT_DIR
mvn sonar:sonar \
  -Dsonar.host.url=http://sonarqube:9000 \
  -Dsonar.token=sqa_db72a6775d92f4e072c0b877e0f9e252181fbe2f \
  -Dsonar.qualitygate.wait=true \
  2>&1
echo "DONE: "$PROJECT_KEY"
