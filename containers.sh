docker container run --name phpmyadmin `
-d `
-p 8080:80 `
-e PMA_ARBITRARY=1 `
--network mysql-net `
phpmyadmin:5.2.0-apache



docker container run --name mysql8 `
-e MYSQL_USER=example-user `
-e MYSQL_PASSWORD=user-password `
-e MYSQL_ROOT_PASSWORD=root-secret-password `
-e MYSQL_DATABASE=world-db `
--volume mysql-data:/var/lib/mysql `
-dp 8000:3306 `
--network mysql-net `
mysql:8.0.31-debian

docker container run `
--name nest-app `
-w /app `
-p 5000:3000 `
-v ${pwd}:/app `
node:18-alpine3.17 `
sh -c "yarn install && yarn start:dev"

docker container run \
--name nest-app \
-w /app \
-p 5000:3000 \
-v "$(pwd)":/app \
node:18-alpine3.17 \
sh -c "yarn install && yarn start:dev"

docker container run \
-d \
--name postgres-db-prueba \
-e POSTGRES_PASSWORD=123456 \
-v postgres-prueba:/var/lib/postgresql/data \
postgres:13


docker container run \
--name pgAdmin \
-dp 8080:80
-e PGADMIN_DEFAULT_EMAIL=superman@google.com \
-e PGADMIN_DEFAULT_PASSWORD=123456
dpage/pgadmin4:6.17