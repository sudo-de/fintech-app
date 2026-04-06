package handlers

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
)

// writeDBError maps known PostgreSQL errors to HTTP responses. Returns true if handled.
func writeDBError(w http.ResponseWriter, err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		// e.g. JWT user_id does not exist in this DB (switched API URL but kept local token)
		writeError(w, http.StatusUnauthorized, "Your account is not recognized on this server. Sign out and sign in again.")
		return true
	}
	return false
}
