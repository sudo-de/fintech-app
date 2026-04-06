package handlers

import (
	"net/http"
	"time"

	"fintechapp/backend/internal/middleware"
	"fintechapp/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ChallengeHandler struct {
	DB *pgxpool.Pool
}

type challengeRequest struct {
	StartDate    string `json:"startDate"`
	DurationDays int    `json:"durationDays"`
	IsActive     bool   `json:"isActive"`
}

func (h *ChallengeHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var c models.NoSpendChallenge
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, user_id, start_date, duration_days, is_active
		 FROM no_spend_challenges WHERE user_id = $1`,
		userID,
	).Scan(&c.ID, &c.UserID, &c.StartDate, &c.DurationDays, &c.IsActive)
	if err != nil {
		writeJSON(w, http.StatusOK, nil)
		return
	}

	writeJSON(w, http.StatusOK, c)
}

func (h *ChallengeHandler) Set(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req challengeRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.DurationDays < 1 || req.DurationDays > 30 {
		writeError(w, http.StatusBadRequest, "durationDays must be between 1 and 30")
		return
	}

	startDate, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		startDate = time.Now()
	}

	var c models.NoSpendChallenge
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO no_spend_challenges (user_id, start_date, duration_days, is_active)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id) DO UPDATE
		   SET start_date=$2, duration_days=$3, is_active=$4
		 RETURNING id, user_id, start_date, duration_days, is_active`,
		userID, startDate, req.DurationDays, req.IsActive,
	).Scan(&c.ID, &c.UserID, &c.StartDate, &c.DurationDays, &c.IsActive)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save challenge")
		return
	}

	writeJSON(w, http.StatusOK, c)
}

func (h *ChallengeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	h.DB.Exec(r.Context(),
		`DELETE FROM no_spend_challenges WHERE user_id=$1`, userID)

	w.WriteHeader(http.StatusNoContent)
}
