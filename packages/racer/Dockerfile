FROM node:16.10.0-alpine

LABEL \
    name="race-point/racer" \
    version="0.2.0" 

# update the repos to get modern chromium
RUN echo "https://dl-cdn.alpinelinux.org/alpine/v3.14/community" >> /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.14/main/" >> /etc/apk/repositories

RUN apk upgrade && \
    apk add chromium

COPY . /rp/
WORKDIR /rp/

RUN npm install
RUN npm install -g lighthouse

CMD tail -f /dev/null