FROM node:16.10.0-alpine

LABEL \
    name="racepoint/proxy" \
    version="0.2.0" 

ARG BK_HTTP_PROXY
ARG BK_HTTPS_PROXY
ARG HTTP_PROXY=${BK_HTTP_PROXY}
ARG HTTPS_PROXY=${BK_HTTPS_PROXY}

COPY . /rp/
WORKDIR /rp/

RUN npm install

EXPOSE 80/tcp
EXPOSE 8080/tcp
EXPOSE 443/tcp
EXPOSE 8443/tcp

CMD node build/index.js