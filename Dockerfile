FROM registry.access.redhat.com/ubi8/nodejs-16:1 as web-builder

WORKDIR /opt/app-root

COPY --chown=default Makefile Makefile
COPY --chown=default web web
COPY mocks mocks

RUN NPM_INSTALL=ci make build-frontend

FROM registry.access.redhat.com/ubi8/go-toolset:1.17 as go-builder

WORKDIR /opt/app-root

COPY .git .git
COPY go.mod go.mod
COPY go.sum go.sum
COPY vendor/ vendor/
COPY Makefile Makefile
COPY cmd/ cmd/
COPY pkg/ pkg/

RUN make build-backend

FROM registry.access.redhat.com/ubi8/ubi-minimal:8.6

COPY --from=web-builder /opt/app-root/web/dist ./web/dist
COPY --from=go-builder /opt/app-root/plugin-backend ./

ENTRYPOINT ["./plugin-backend"]
