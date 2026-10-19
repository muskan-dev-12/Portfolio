#!/usr/bin/env bash
# Docker compose ke bina: ek command me MySQL + portfolio dono start.
# Chalane ka tareeka:  bash start.sh
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo ".env nahi mili. Pehle: cp .env.example .env  (phir bharo)"; exit 1; }
set -a; source .env; set +a

docker network inspect portfolio-net >/dev/null 2>&1 || docker network create portfolio-net >/dev/null
docker volume inspect portfolio-dbdata >/dev/null 2>&1 || docker volume create portfolio-dbdata >/dev/null

if docker ps -a --format '{{.Names}}' | grep -qx portfolio-mysql; then
  if [ "$(docker inspect -f '{{index .Config.Labels "app"}}' portfolio-mysql)" != "portfolio-auth" ]; then
    echo "Purana portfolio-mysql container hai. Pehle chalao: docker rm -f portfolio-app portfolio-mysql"
    exit 1
  fi
  docker start portfolio-mysql >/dev/null
else
  docker run -d --name portfolio-mysql --label app=portfolio-auth \
    --network portfolio-net --restart unless-stopped \
    -e MYSQL_ROOT_PASSWORD="$DB_ROOT_PASS" -e MYSQL_DATABASE=portfolio \
    -e MYSQL_USER=portfolio_app -e MYSQL_PASSWORD="$DB_PASS" \
    -v portfolio-dbdata:/var/lib/mysql \
    -v "$PWD/schema.sql":/docker-entrypoint-initdb.d/schema.sql:ro \
    mysql:8.4 >/dev/null
fi

echo "MySQL ready hone ka wait kar raha hoon..."
until docker exec portfolio-mysql mysqladmin ping -h 127.0.0.1 --silent 2>/dev/null; do sleep 2; done

docker build -t muskan-portfolio:2.0 .
docker rm -f portfolio-app >/dev/null 2>&1 || true
docker run -d --name portfolio-app --network portfolio-net --restart unless-stopped \
  -p 127.0.0.1:8080:3000 \
  -e PORT=3000 -e COOKIE_SECURE="${COOKIE_SECURE:-false}" \
  -e DB_HOST=portfolio-mysql -e DB_USER=portfolio_app -e DB_PASS="$DB_PASS" -e DB_NAME=portfolio \
  -e JWT_SECRET="$JWT_SECRET" \
  -v "$PWD/private":/app/private:ro \
  muskan-portfolio:2.0 >/dev/null

echo "Ho gaya: http://localhost:8080   |   logs: docker logs -f portfolio-app"
