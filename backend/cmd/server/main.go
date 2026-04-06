package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fintechapp/backend/internal/db"
	"fintechapp/backend/internal/handlers"
	"fintechapp/backend/internal/middleware"
	"fintechapp/backend/migrations"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present
	_ = godotenv.Load()

	databaseURL := mustEnv("DATABASE_URL")
	jwtSecret := mustEnv("JWT_SECRET")
	port := getEnv("PORT", "8080")
	corsOrigins := getEnv("CORS_ORIGINS", "*")

	// Run migrations
	runMigrations(databaseURL)

	// Connect to DB
	ctx := context.Background()
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Handlers
	authH := &handlers.AuthHandler{DB: pool, JWTSecret: jwtSecret}
	txH := &handlers.TransactionHandler{DB: pool}
	goalH := &handlers.GoalHandler{DB: pool}
	budgetH := &handlers.BudgetHandler{DB: pool}
	challengeH := &handlers.ChallengeHandler{DB: pool}
	userH := &handlers.UserHandler{DB: pool}
	dashH := &handlers.DashboardHandler{DB: pool}

	// Router
	r := chi.NewRouter()
	r.Use(middleware.CORS(corsOrigins))
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RealIP)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Public routes
	r.Post("/auth/register", authH.Register)
	r.Post("/auth/login", authH.Login)

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(jwtSecret))

		r.Get("/api/dashboard", dashH.Get)

		r.Get("/api/user", userH.GetProfile)
		r.Put("/api/user/profile", userH.UpdateProfile)
		r.Put("/api/user/balance", userH.SetBalance)

		r.Get("/api/transactions", txH.List)
		r.Post("/api/transactions", txH.Create)
		r.Put("/api/transactions/{id}", txH.Update)
		r.Delete("/api/transactions/{id}", txH.Delete)

		r.Get("/api/goals", goalH.List)
		r.Post("/api/goals", goalH.Create)
		r.Delete("/api/goals/{id}", goalH.Delete)

		r.Get("/api/budgets", budgetH.List)
		r.Post("/api/budgets", budgetH.Create)
		r.Put("/api/budgets/{id}", budgetH.Update)
		r.Delete("/api/budgets/{id}", budgetH.Delete)

		r.Get("/api/challenge", challengeH.Get)
		r.Post("/api/challenge", challengeH.Set)
		r.Delete("/api/challenge", challengeH.Delete)
	})

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("shutting down server...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("shutdown error: %v", err)
		}
	}()

	log.Printf("server listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
	log.Println("server stopped")
}

func runMigrations(databaseURL string) {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		log.Fatalf("failed to load migrations: %v", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", src, databaseURL)
	if err != nil {
		log.Fatalf("failed to create migrator: %v", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("migration failed: %v", err)
	}
	log.Println("migrations applied")
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required environment variable: %s", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
