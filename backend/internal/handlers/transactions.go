package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"fintechapp/backend/internal/middleware"
	"fintechapp/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionHandler struct {
	DB *pgxpool.Pool
}

type transactionRequest struct {
	Type     string  `json:"type"`
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"` // ISO 4217, defaults to "USD"
	Category string  `json:"category"`
	Note     string  `json:"note"`
	Date     string  `json:"date"` // ISO 8601
}

func (h *TransactionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	typeFilter := r.URL.Query().Get("type")
	monthFilter := r.URL.Query().Get("month") // YYYY-MM

	query := `SELECT id, user_id, type, amount, currency, category, note, date, created_at
	          FROM transactions WHERE user_id = $1`
	args := []any{userID}

	if typeFilter != "" {
		args = append(args, typeFilter)
		query += ` AND type = $` + strconv.Itoa(len(args))
	}
	if monthFilter != "" {
		args = append(args, monthFilter)
		query += ` AND to_char(date, 'YYYY-MM') = $` + strconv.Itoa(len(args))
	}
	query += ` ORDER BY date DESC`

	rows, err := h.DB.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query transactions")
		return
	}
	defer rows.Close()

	txns := []models.Transaction{}
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Currency, &t.Category, &t.Note, &t.Date, &t.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan transaction")
			return
		}
		txns = append(txns, t)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read transactions")
		return
	}

	writeJSON(w, http.StatusOK, txns)
}

func (h *TransactionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req transactionRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Type != "income" && req.Type != "expense" {
		writeError(w, http.StatusBadRequest, "type must be 'income' or 'expense'")
		return
	}
	if req.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "amount must be positive")
		return
	}
	if req.Category == "" {
		writeError(w, http.StatusBadRequest, "category is required")
		return
	}

	date, err := time.Parse(time.RFC3339, req.Date)
	if err != nil {
		date = time.Now()
	}

	currency := req.Currency
	if currency == "" {
		currency = "USD"
	}

	var t models.Transaction
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO transactions (user_id, type, amount, currency, category, note, date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, user_id, type, amount, currency, category, note, date, created_at`,
		userID, req.Type, req.Amount, currency, req.Category, req.Note, date,
	).Scan(&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Currency, &t.Category, &t.Note, &t.Date, &t.CreatedAt)
	if err != nil {
		if writeDBError(w, err) {
			return
		}
		log.Printf("create transaction: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to create transaction")
		return
	}

	writeJSON(w, http.StatusCreated, t)
}

func (h *TransactionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid transaction id")
		return
	}

	var req transactionRequest
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Type != "income" && req.Type != "expense" {
		writeError(w, http.StatusBadRequest, "type must be 'income' or 'expense'")
		return
	}
	if req.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "amount must be positive")
		return
	}

	date, err := time.Parse(time.RFC3339, req.Date)
	if err != nil {
		date = time.Now()
	}

	updCurrency := req.Currency
	if updCurrency == "" {
		updCurrency = "USD"
	}

	var t models.Transaction
	err = h.DB.QueryRow(r.Context(),
		`UPDATE transactions SET type=$1, amount=$2, currency=$3, category=$4, note=$5, date=$6
		 WHERE id=$7 AND user_id=$8
		 RETURNING id, user_id, type, amount, currency, category, note, date, created_at`,
		req.Type, req.Amount, updCurrency, req.Category, req.Note, date, id, userID,
	).Scan(&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Currency, &t.Category, &t.Note, &t.Date, &t.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	writeJSON(w, http.StatusOK, t)
}

func (h *TransactionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid transaction id")
		return
	}

	tag, err := h.DB.Exec(r.Context(),
		`DELETE FROM transactions WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
