INSERT INTO users (username, email, password_hash, display_name, status_type, status_message)
VALUES
('matt', 'matt@example.com', '$2a$10$KkOOd8z0VfTK38aNQIn2W.2aQ9IJg2/otPk9qWhQf8mNbzSvY0jXG', 'Matt', 'online', 'Grinding Fortnite'),
('sara', 'sara@example.com', '$2a$10$KkOOd8z0VfTK38aNQIn2W.2aQ9IJg2/otPk9qWhQf8mNbzSvY0jXG', 'Sara', 'idle', 'Doing homework')
ON CONFLICT DO NOTHING;
