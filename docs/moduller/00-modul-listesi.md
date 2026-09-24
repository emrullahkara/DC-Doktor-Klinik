# 04 — Modüller: Genel Bakış

| Kod | Modül | Kısa Açıklama | Muayenehane | Poliklinik / Tıp Mrk. | Diş | Estetik | Veteriner | Evde Sağlık |
|---|---|---|---|---|---|---|---|---|
| HAS | Hasta Yönetimi | Kayıt, kimlik doğrulama, aile/vasi, portal | ● | ● | ● | ● | ● (Sahip+Hayvan) | ● |
| RAN | Randevu ve Kabul | Takvim, online randevu, bekleme, kabul | ● | ● | ● | ● | ● | ● (ziyaret planı) |
| EHR | Klinik Kayıt | Muayene, tanı, istem, reçete, rapor, epikriz | ● | ● | ● | ● | ● | ● |
| ONM | Onam ve Belge | Onam şablonları, dijital imza, belge arşivi | ● | ● | ● | ● | ● | ● |
| LAB | Laboratuvar / Görüntüleme | İstem, numune, sonuç, PACS/dış lab | ○ | ● | ● (röntgen) | ○ | ● | ○ |
| DIS | Diş Modülü | Odontogram, tedavi planı, protez lab | — | — | ● | — | ○ (hayvan diş) | — |
| EST | Estetik Modülü | Seans, paket, foto karşılaştırma, lot takibi | — | ○ | ○ | ● | — | — |
| VET | Veteriner Modülü | Tür/ırk, aşı karnesi, yatılı, pansiyon, pet-shop | — | — | — | — | ● | — |
| EVS | Evde Sağlık Modülü | Rota, GPS check-in, mobil, çevrimdışı | — | ○ | — | — | ○ (mobil vet) | ● |
| PER | Personel ve İK | Özlük, belge, sözleşme, izin, performans | ● (basit) | ● | ● | ● | ● | ● |
| NOB | Nöbet ve Vardiya | Planlama, puantaj, takas, fazla mesai | — | ● | ● | ● | ● | ● |
| STK | Stok ve İlaç | Depo, SKT, lot, soğuk zincir, narkotik, İTS/ÜTS | ○ | ● | ● | ● | ● | ● |
| CIH | Cihaz ve Bakım | Envanter, kalibrasyon, arıza, bakım sözleşmesi | ○ | ● | ● | ● | ● | ● |
| STE | Sterilizasyon | Set takibi, çevrim, indikatör | — | ● | ● | ● | ● | ○ |
| FIN | Finans | Fiyat, tahsilat, fatura, kasa, gider, hakediş | ● | ● | ● | ● | ● | ● |
| SGK | SGK / MEDULA | Provizyon, fatura dönemi, iade takibi | ○ | ● (anlaşmalı ise) | ○ | — | — | ○ |
| SIG | Özel Sigorta / Kurumsal | Anlaşmalı kurum, provizyon, fatura | ○ | ● | ● | ○ | ○ (pet sigorta) | ● |
| KAL | Kalite ve Hasta Güvenliği | SKS, olay bildirimi, DÖF, iç denetim | ○ | ● | ● | ● | ○ | ● |
| ENF | Enfeksiyon Kontrol | Sürveyans, el hijyeni, izolasyon | — | ● | ● | ● | ● | ● |
| ISG | İş Sağlığı ve Güvenliği | Risk analizi, kaza, periyodik muayene, eğitim | ○ | ● | ● | ● | ● | ● |
| ATK | Tıbbi Atık | Atık kaydı, teslim, beyan | ● | ● | ● | ● | ● | ● |
| RAD | Radyasyon Güvenliği | Lisans, dozimetre, cihaz testleri | — | ○ | ● | ○ | ○ | — |
| CRM | İletişim ve CRM | SMS/e-posta/WhatsApp, hatırlatma, anket, şikâyet | ● | ● | ● | ● | ● | ● |
| TUR | Sağlık Turizmi | Yabancı hasta, tercüman, aracı kurum, döviz | — | ○ | ○ | ○ | — | — |
| KVK | KVKK Yönetimi | Rıza yönetimi, başvuru, envanter, imha | ● | ● | ● | ● | ● | ● |
| RAP | Raporlama | Yönetim, finans, klinik, resmî raporlar | ● | ● | ● | ● | ● | ● |
| ENT | Entegrasyon Merkezi | e-Nabız/USS, MEDULA, e-Reçete, İTS, ÜTS, e-Fatura, banka, muhasebe | ● | ● | ● | ● | ● (TOB sistemleri) | ● |
| DOK | Doküman Yönetimi | Prosedür, talimat, form sürüm kontrolü | ○ | ● | ● | ● | ● | ● |
| GRV | Görev ve İç İletişim | Görev atama, iç mesajlaşma, duyuru, vardiya devri | ○ | ● | ● | ● | ● | ● |

● = varsayılan açık, ○ = opsiyonel, — = uygulanamaz

## Modüller Arası Ana Akış (Örnek: Ayakta Hasta)

```
Randevu (RAN) → Kabul + Kimlik + KVKK aydınlatma/rıza (HAS/KVK)
   → Provizyon (SGK/SIG) → Ön değerlendirme/vital (EHR - hemşire)
   → Muayene, tanı, istem (EHR) → Tetkik (LAB) → Onam (ONM)
   → İşlem + malzeme/ilaç tüketimi (EHR→STK, ÜTS/İTS bildirimi)
   → Reçete / Rapor (EHR → e-Reçete / e-Rapor) → e-Nabız/USS gönderimi (ENT)
   → Fatura + Tahsilat (FIN) → Hekim hakedişi (FIN/PER)
   → Kontrol randevusu + hatırlatma + memnuniyet anketi (CRM)
```

Detaylar için ilgili modül dokümanlarına bakınız.
