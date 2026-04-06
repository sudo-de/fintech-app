package handlers

import (
	"database/sql"
	"net/http"

	"fintechapp/backend/internal/middleware"
	"fintechapp/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GoalHandler struct {
	DB *pgxpool.Pool
}

type goalRequest struct {
	Name         string  `json:"name"`
	TargetAmount float64 `json:"targetAmount"`
	Month        string  `json:"month"` // YYYY-MM
	Currency     string  `json:"currency"`
}

func (h *GoalHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	month := r.URL.Query().Get("month")

	query := `SELECT id, user_id, name, target_amount, month, currency, created_at
	          FROM savings_goals WHERE user_id = $1`
	args := []any{userID}
	if month != "" {
		args = append(args, month)
		query += ` AND month = $2`
	}
	query += ` ORDER BY created_at DESC`

	rows, err := h.DB.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query goals")
		return
	}
	defer rows.Close()

	goals := []models.SavingsGoal{}
	for rows.Next() {
		var g models.SavingsGoal
		var cur sql.NullString
		if err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.TargetAmount, &g.Month, &cur, &g.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan goal")
			return
		}
		if cur.Valid {
			g.Currency = cur.String
		}
		goals = append(goals, g)
	}

	writeJSON(w, http.StatusOK, goals)
}

func (h *GoalHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req goalRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" || req.TargetAmount <= 0 || req.Month == "" {
		writeError(w, http.StatusBadRequest, "name, targetAmount, and month are required")
		return
	}

	var g models.SavingsGoal
	var cur sql.NullString
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO savings_goals (user_id, name, target_amount, month, currency)
		 VALUES ($1, $2, $3, $4, NULLIF(TRIM($5), ''))
		 RETURNING id, user_id, name, target_amount, month, currency, created_at`,
		userID, req.Name, req.TargetAmount, req.Month, req.Currency,
	).Scan(&g.ID, &g.UserID, &g.Name, &g.TargetAmount, &g.Month, &cur, &g.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create goal")
		return
	}
	if cur.Valid {
		g.Currency = cur.String
	}

	writeJSON(w, http.StatusCreated, g)
}

func (h *GoalHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	tag, err := h.DB.Exec(r.Context(),
		`DELETE FROM savings_goals WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "goal not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
