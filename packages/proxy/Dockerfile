FROM node:16.10.0-alpine

LABEL \
    name="racepoint/proxy" \
    version="0.2.0" 

COPY . /rp/
WORKDIR /rp/

RUN npm install

EXPOSE 80/tcp
EXPOSE 8080/tcp
EXPOSE 443/tcp
EXPOSE 8443/tcp

# CMD NODE_DEBUG=http,http2 node build/index.js
CMD node build/index.js