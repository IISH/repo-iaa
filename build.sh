#!/bin/bash

version=$(git rev-parse master)
tag=$(git describe --tags)
tag='latest'
#echo "<!-- ${tag} ${version} -->" > views/version.pug
docker build --tag="registry.diginfra.net/lwo/iaa:${tag}" .
#docker push registry.diginfra.net/lwo/iaa:${tag}
docker push registry.diginfra.net/lwo/iaa:${tag}
