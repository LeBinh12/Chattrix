package user

// User is the core domain entity for authentication and profile data.
// Keep it decoupled from persistence and transport concerns.
type User struct {
    ID       string
    Username string
    Email    string
    Password string // hashed password
}
