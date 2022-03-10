FROM node:16.10.0-alpine

LABEL \
    name="racepoint-proxy" \
    version="0.2.0" 

COPY . /rp/
WORKDIR /rp/

RUN npm install

EXPOSE 80/tcp
EXPOSE 8080/tcp
EXPOSE 443/tcp
EXPOSE 8443/tcp

CMD node build/index.js