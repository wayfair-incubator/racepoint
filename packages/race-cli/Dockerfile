FROM node:16.10.0-alpine

LABEL \
  name="racepoint/race-cli" \
  version="0.0.0" 

# COPY . /rp/
COPY . /rp/
WORKDIR /rp/

# Create default logs directory
RUN mkdir -p results

RUN npm install
RUN npm install -g 