package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Balance   float64   `json:"balance"`
	CreatedAt time.Time `json:"createdAt"`
}

type Transaction struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"userId"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	Currency  string    `json:"currency"`
	Category  string    `json:"category"`
	Note      string    `json:"note"`
	Date      time.Time `json:"date"`
	CreatedAt time.Time `json:"createdAt"`
}

type SavingsGoal struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"userId"`
	Name         string    `json:"name"`
	TargetAmount float64   `json:"targetAmount"`
	Month        string    `json:"month"`
	Currency  string    `json:"currency,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type Budget struct {
	ID       uuid.UUID `json:"id"`
	UserID   uuid.UUID `json:"userId"`
	Category string    `json:"category"`
	Limit    float64   `json:"limit"`
	Month    string    `json:"month"`
	Currency string    `json:"currency,omitempty"`
}

type NoSpendChallenge struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"userId"`
	StartDate    time.Time `json:"startDate"`
	DurationDays int       `json:"durationDays"`
	IsActive     bool      `json:"isActive"`
}
