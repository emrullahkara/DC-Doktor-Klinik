-- Yerel geliştirme / test için roller ve veritabanları.
-- dc_owner: tabloların sahibi, migration'ları çalıştırır.
-- dc_app:   uygulamanın bağlandığı kullanıcı; RLS politikalarına tabidir.
CREATE ROLE dc_owner LOGIN PASSWORD 'dc_owner_parola';
CREATE ROLE dc_app LOGIN PASSWORD 'dc_app_parola';
CREATE DATABASE dc_klinik OWNER dc_owner;
CREATE DATABASE dc_klinik_test OWNER dc_owner;
