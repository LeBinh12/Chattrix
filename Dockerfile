# Build Stage
FROM golang:alpine AS builder

WORKDIR /app

# Install git for fetch dependencies
RUN apk add --no-cache git

COPY go.mod go.sum ./
# If go.mod has a future version, we might need to ignore toolchain check or update it.
# Usually go mod download works.
RUN go mod download

COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server main.go

# Run Stage
FROM alpine:latest

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server .
# Copy optional config files if you have them (e.g. .env)
# COPY .env . 

# Expose port
EXPOSE 3000

CMD ["./server"]
