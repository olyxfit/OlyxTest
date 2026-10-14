#!/bin/bash

docker build -t olyx-test:latest .
docker image tag olyx-test:latest registry.hamdocker.ir/olyxfit/olyx-test:latest
docker push registry.hamdocker.ir/olyxfit/olyx-test:latest