FROM node:16.10.0-alpine

LABEL \
    name="race-point/racer" \
    version="0.2.0" 

# update the repos to get modern chromium
RUN echo "https://dl-cdn.alpinelinux.org/alpine/v3.14/community" >> /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.14/main/" >> /etc/apk/repositories

RUN apk upgrade && \
    apk add --no-cache dbus chromium chromium-chromedriver bash curl dnsmasq
#apk add --no-cache dbus chromium chromium-chromedriver
#dbus-daemon --system

COPY . /rp/
WORKDIR /rp/

# RUN dbus-daemon --system
RUN npm install
RUN npm install -g lighthouse
RUN chmod +x update-dns.sh 
# && ./update-dns.sh
# RUN dnsmasq

EXPOSE 3000/tcp

CMD dbus-daemon --system && \
    ./update-dns.sh && \
    dnsmasq && \
    node build/index.js