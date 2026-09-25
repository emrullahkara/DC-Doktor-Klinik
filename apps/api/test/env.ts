// Testler ayrı bir veritabanında çalışır (scripts/db-init.sql ile oluşturulur).
process.env.TEST_DATABASE_URL ??= 'postgres://dc_app:dc_app_parola@localhost:5432/dc_klinik_test';
process.env.TEST_MIGRATION_DATABASE_URL ??= 'postgres://dc_owner:dc_owner_parola@localhost:5432/dc_klinik_test';
