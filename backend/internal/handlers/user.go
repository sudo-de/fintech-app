package handlers

import (
	"net/http"

	"fintechapp/backend/internal/middleware"
	"fintechapp/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserHandler struct {
	DB *pgxpool.Pool
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var user models.User
	err := h.DB.QueryRow(r.Context(),
		`SELECT u.id, u.name, u.email, `+sqlComputedBalanceFromUsersU+`, u.created_at FROM users u WHERE u.id = $1`, userID,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Balance, &user.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	var user models.User
	err := h.DB.QueryRow(r.Context(),
		`UPDATE users SET name=$1, email=COALESCE(NULLIF($2,''), email)
		 WHERE id=$3
		 RETURNING id, name, email, `+sqlComputedBalanceReturning+`, created_at`,
		req.Name, req.Email, userID,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Balance, &user.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) SetBalance(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req struct {
		Balance float64 `json:"balance"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var user models.User
	err := h.DB.QueryRow(r.Context(),
		`UPDATE users SET balance=$1 WHERE id=$2
		 RETURNING id, name, email, `+sqlComputedBalanceReturning+`, created_at`,
		req.Balance, userID,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Balance, &user.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update balance")
		return
	}

	writeJSON(w, http.StatusOK, user)
}
