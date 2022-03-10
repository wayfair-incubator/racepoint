FROM node:16.10.0-alpine

LABEL \
  name="racepoint/race-cli" \
  version="0.0.0" 

# update the repos to get modern chromium
# RUN echo "https://dl-cdn.alpinelinux.org/alpine/v3.14/community" >> /etc/apk/repositories && \
#   echo "https://dl-cdn.alpinelinux.org/alpine/v3.14/main/" >> /etc/apk/repositories

# RUN apk upgrade && \
#   apk add --no-cache dbus chromium chromium-chromedriver bash curl dnsmasq
# #apk add --no-cache dbus chromium chromium-chromedriver
# #dbus-daemon --system

# COPY . /rp/
COPY . /rp/
WORKDIR /rp/

# RUN dbus-daemon --system
RUN yarn install
RUN yarn install -g 