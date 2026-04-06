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

type BudgetHandler struct {
	DB *pgxpool.Pool
}

type budgetRequest struct {
	Category string  `json:"category"`
	Limit    float64 `json:"limit"`
	Month    string  `json:"month"` // YYYY-MM
	Currency string  `json:"currency"`
}

func (h *BudgetHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	month := r.URL.Query().Get("month")

	query := `SELECT id, user_id, category, "limit", month, currency FROM budgets WHERE user_id = $1`
	args := []any{userID}
	if month != "" {
		args = append(args, month)
		query += ` AND month = $2`
	}
	query += ` ORDER BY month DESC, category`

	rows, err := h.DB.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query budgets")
		return
	}
	defer rows.Close()

	budgets := []models.Budget{}
	for rows.Next() {
		var b models.Budget
		var cur sql.NullString
		if err := rows.Scan(&b.ID, &b.UserID, &b.Category, &b.Limit, &b.Month, &cur); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan budget")
			return
		}
		if cur.Valid {
			b.Currency = cur.String
		}
		budgets = append(budgets, b)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read budgets")
		return
	}

	writeJSON(w, http.StatusOK, budgets)
}

func (h *BudgetHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req budgetRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Category == "" || req.Limit <= 0 || req.Month == "" {
		writeError(w, http.StatusBadRequest, "category, limit, and month are required")
		return
	}

	var b models.Budget
	var cur sql.NullString
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO budgets (user_id, category, "limit", month, currency)
		 VALUES ($1, $2, $3, $4, NULLIF(TRIM($5), ''))
		 RETURNING id, user_id, category, "limit", month, currency`,
		userID, req.Category, req.Limit, req.Month, req.Currency,
	).Scan(&b.ID, &b.UserID, &b.Category, &b.Limit, &b.Month, &cur)
	if err != nil {
		writeError(w, http.StatusConflict, "budget already exists for this category and month")
		return
	}
	if cur.Valid {
		b.Currency = cur.String
	}

	writeJSON(w, http.StatusCreated, b)
}

func (h *BudgetHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid budget id")
		return
	}

	var req struct {
		Limit float64 `json:"limit"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Limit <= 0 {
		writeError(w, http.StatusBadRequest, "limit must be positive")
		return
	}

	var b models.Budget
	var cur sql.NullString
	err = h.DB.QueryRow(r.Context(),
		`UPDATE budgets SET "limit"=$1 WHERE id=$2 AND user_id=$3
		 RETURNING id, user_id, category, "limit", month, currency`,
		req.Limit, id, userID,
	).Scan(&b.ID, &b.UserID, &b.Category, &b.Limit, &b.Month, &cur)
	if err != nil {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}
	if cur.Valid {
		b.Currency = cur.String
	}

	writeJSON(w, http.StatusOK, b)
}

func (h *BudgetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid budget id")
		return
	}

	tag, err := h.DB.Exec(r.Context(),
		`DELETE FROM budgets WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "budget not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
