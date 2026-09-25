-- Entra profile image URLs can exceed 512 characters.
ALTER TABLE users
  MODIFY photo_path VARCHAR(2048) NULL DEFAULT NULL;
