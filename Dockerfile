FROM node:alpine3.11
LABEL Description="iaa server" Version="1.0.11"

COPY . /home/node

RUN rm -rf /home/node/.git

WORKDIR /home/node

EXPOSE 3000

ENV NODE_ENV=production \
    CONFIG_FILE="./config.json"

USER node

CMD ["/usr/local/bin/node", "/home/node/bin/www"]
