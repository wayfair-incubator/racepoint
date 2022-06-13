FROM node:16.10.0-alpine

LABEL \
  name="racepoint/race-cli" \
  version="0.0.0" 

# COPY . /rp/
COPY . /rp/
WORKDIR /rp/

# Create default results & flows directories
RUN mkdir -p results
RUN mkdir -p flows

RUN npm install
RUN npm install -g 