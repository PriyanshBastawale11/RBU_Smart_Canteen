-- Reset sequences to avoid primary key conflicts
SELECT setval('hibernate_sequence', (SELECT MAX(id) FROM users) + 1);
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1);

-- If the above doesn't work, try this alternative:
-- ALTER SEQUENCE users_id_seq RESTART WITH 1000;
