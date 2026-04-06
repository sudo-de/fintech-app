package handlers

// Stored users.balance (opening / manual adjustment) plus all-time net from transactions.

const sqlComputedBalanceFromUsersU = `u.balance + COALESCE((
	SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
	FROM transactions t
	WHERE t.user_id = u.id
), 0)`

// For INSERT ... RETURNING / UPDATE ... RETURNING on users (row columns: id, balance, …).
const sqlComputedBalanceReturning = `balance + COALESCE((
	SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
	FROM transactions t
	WHERE t.user_id = id
), 0)`
