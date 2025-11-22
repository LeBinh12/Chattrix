# Clean Architecture in Chattrix

This repository is being refactored incrementally to follow Clean Architecture:

- Domain: core entities and interfaces, independent of frameworks.
  - `internal/domain/*`
- Use cases: application orchestration, pure business rules.
  - `internal/usecase/*`
- Adapters: framework and IO code (HTTP, DB, security, etc.).
  - `internal/adapter/http/*`
  - `internal/adapter/repository/*`
  - `internal/adapter/security/*`
- Bootstrap: wiring and configuration (under `internal/app` for now).

## Current Migration Status

- User Login flow migrated:
  - Domain: `internal/domain/user`
  - Use case: `internal/usecase/user/login.go`
  - Adapters:
    - HTTP: `internal/adapter/http/user/login.go`
    - Mongo repository: `internal/adapter/repository/mongo/user/repository.go`
    - Security: bcrypt and JWT in `internal/adapter/security/*`
  - Route: `POST /v1/users/login` now uses the new handler.

Other modules (user profile, status, chat, friend, group, message) will be migrated progressively following the same pattern.

## Migration Guidelines

1. Define domain entities and repository/service interfaces in `internal/domain/<module>`.
2. Implement use cases in `internal/usecase/<module>` consuming only domain interfaces.
3. Implement adapters for persistence/HTTP/security in `internal/adapter/...` implementing domain interfaces.
4. Wire handlers to usecases via DI (temporarily inline in handlers; move to a central bootstrap container next).
5. Replace route endpoints to call the new HTTP adapters.

## Notes

- Keep domain free of framework dependencies (no `gin`, `mongo`, or external packages).
- Adapters map between external representations (bson/json) and domain entities.
- Prefer small interfaces close to their consumers.
