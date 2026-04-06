package handlers

import (
	"net/http"
	"time"

	"fintechapp/backend/internal/middleware"
	"fintechapp/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardHandler struct {
	DB *pgxpool.Pool
}

type DailySpend struct {
	Date   string  `json:"date"`
	Amount float64 `json:"amount"`
}

type CategorySpend struct {
	Category   string  `json:"category"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"`
}

type DashboardData struct {
	Balance        float64              `json:"balance"`
	Month          string               `json:"month"`
	Income         float64              `json:"income"`
	Expenses       float64              `json:"expenses"`
	NetSavings     float64              `json:"netSavings"`
	SavingsRate    float64              `json:"savingsRate"`
	TotalTxns      int                  `json:"totalTransactions"`
	WeeklySpending []DailySpend         `json:"weeklySpending"`
	TopCategories  []CategorySpend      `json:"topCategories"`
	RecentTxns     []models.Transaction `json:"recentTransactions"`
}

func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	ctx := r.Context()
	month := time.Now().Format("2006-01")

	data := DashboardData{
		Month:          month,
		WeeklySpending: []DailySpend{},
		TopCategories:  []CategorySpend{},
		RecentTxns:     []models.Transaction{},
	}

	// 1. Balance: stored opening/adjusted balance plus all-time net from transactions
	if err := h.DB.QueryRow(ctx,
		`SELECT `+sqlComputedBalanceFromUsersU+` FROM users u WHERE u.id = $1`,
		userID,
	).Scan(&data.Balance); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch balance")
		return
	}

	// 2. Monthly income, expenses, and transaction count
	if err := h.DB.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0),
			COUNT(*)
		FROM transactions
		WHERE user_id=$1
		  AND to_char(date AT TIME ZONE 'UTC', 'YYYY-MM') = $2
	`, userID, month).Scan(&data.Income, &data.Expenses, &data.TotalTxns); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch monthly totals")
		return
	}
	data.NetSavings = data.Income - data.Expenses
	if data.Income > 0 {
		data.SavingsRate = (data.NetSavings / data.Income) * 100
	}

	// 3. 7-day daily spending (fills zero for days with no transactions)
	weekRows, err := h.DB.Query(ctx, `
		SELECT gs.day::date, COALESCE(SUM(t.amount), 0)
		FROM generate_series(
			(NOW() - INTERVAL '6 days')::date,
			NOW()::date,
			'1 day'
		) AS gs(day)
		LEFT JOIN transactions t
			ON  t.user_id   = $1
			AND t.type      = 'expense'
			AND t.date::date = gs.day
		GROUP BY gs.day
		ORDER BY gs.day
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch weekly spending")
		return
	}
	defer weekRows.Close()
	for weekRows.Next() {
		var d DailySpend
		var day time.Time
		if err := weekRows.Scan(&day, &d.Amount); err != nil {
			continue
		}
		d.Date = day.Format("2006-01-02")
		data.WeeklySpending = append(data.WeeklySpending, d)
	}

	// 4. Top spending categories this month
	catRows, err := h.DB.Query(ctx, `
		SELECT category, SUM(amount) AS total
		FROM transactions
		WHERE user_id=$1
		  AND type='expense'
		  AND to_char(date AT TIME ZONE 'UTC', 'YYYY-MM') = $2
		GROUP BY category
		ORDER BY total DESC
		LIMIT 5
	`, userID, month)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch top categories")
		return
	}
	defer catRows.Close()
	for catRows.Next() {
		var c CategorySpend
		if err := catRows.Scan(&c.Category, &c.Amount); err != nil {
			continue
		}
		if data.Expenses > 0 {
			c.Percentage = (c.Amount / data.Expenses) * 100
		}
		data.TopCategories = append(data.TopCategories, c)
	}

	// 5. Recent transactions (latest 5)
	txnRows, err := h.DB.Query(ctx, `
		SELECT id, user_id, type, amount, currency, category, note, date, created_at
		FROM transactions
		WHERE user_id=$1
		ORDER BY date DESC
		LIMIT 5
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch recent transactions")
		return
	}
	defer txnRows.Close()
	for txnRows.Next() {
		var t models.Transaction
		if err := txnRows.Scan(
			&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Currency,
			&t.Category, &t.Note, &t.Date, &t.CreatedAt,
		); err != nil {
			continue
		}
		data.RecentTxns = append(data.RecentTxns, t)
	}

	writeJSON(w, http.StatusOK, data)
}
