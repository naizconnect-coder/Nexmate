ALTER TABLE users
  ADD COLUMN entra_oid VARCHAR(64) NULL AFTER id,
  ADD COLUMN email VARCHAR(255) NULL AFTER entra_oid;

ALTER TABLE users
  MODIFY COLUMN entra_oid VARCHAR(64) NOT NULL,
  ADD UNIQUE KEY uk_users_entra_oid (entra_oid),
  ADD KEY idx_users_email (email);
