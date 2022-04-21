FROM node:alpine3.11
LABEL Description="iaa server" Version="0.0.11"

COPY . /home/node

RUN rm -rf /home/node/.git

WORKDIR /home/node

EXPOSE 3000

ENV NODE_ENV=production \
    CONFIG_FILE="./config.json"

HEALTHCHECK --interval=1m --timeout=3s \
    CMD /usr/bin/wget --spider --header='Content-Type: application/json' --header 'Connection: close' 'http://localhost:3000/ping' || exit 1

USER node

CMD ["/usr/local/bin/node", "/home/node/bin/www"]
