VERSION ?= $(shell git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD)
IMAGE_PREFIX ?= mdnwebdocs
IMAGE_NAME ?= kumascript
IMAGE ?= ${IMAGE_PREFIX}/${IMAGE_NAME}\:${VERSION}
MOUNT_DIR ?= $(shell pwd)
APP_DIR ?= /app
PORT ?= 9080
DOCKER_RUN_ARGS ?= -v ${MOUNT_DIR}\:${APP_DIR} -w ${APP_DIR}
DOCKER_PORT_ARGS ?= -p "${PORT}:${PORT}"

run:
	docker run ${DOCKER_RUN_ARGS} ${DOCKER_PORT_ARGS} ${IMAGE} node run.js

local-tests:
	npm run test
	npm run lint
	npm run lint-json

test:
	docker run ${DOCKER_RUN_ARGS} ${IMAGE} \
	  /node_modules/.bin/jest -w1

lint:
	docker run ${DOCKER_RUN_ARGS} ${IMAGE} \
	  /node_modules/.bin/eslint *.js src tests

lint-json:
	docker run ${DOCKER_RUN_ARGS} ${IMAGE} \
	  /node_modules/.bin/jsonlint -q *.json `find src macros tests -name '*.json'`


bash:
	docker run -it ${DOCKER_RUN_ARGS} ${IMAGE} bash

shrinkwrap:
	docker run -it -v ${MOUNT_DIR}\:${APP_DIR} -w / -u root ${IMAGE} \
	    bash -c "npm shrinkwrap && cp npm-shrinkwrap.json ${APP_DIR}"

src/parser.js: src/parser.pegjs
	./node_modules/.bin/pegjs src/parser.pegjs

.PHONY: run local-tests test test-macros lint lint-macros bash shrinkwrap
