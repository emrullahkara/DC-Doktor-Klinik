import { aramaMetni, kimlikNoMaskele, tcKimlikNoGecerliMi, uyariGorulebilirMi, yabanciKimlikNoGecerliMi } from './hasta';
import { etkinIzinler } from './kurallar';

describe('tcKimlikNoGecerliMi', () => {
  it('algoritmaya uyan numarayı kabul eder', () => {
    expect(tcKimlikNoGecerliMi('10000000146')).toBe(true);
  });

  it('hatalı kontrol hanesi, eksik hane, 0 ile başlama ve harf reddedilir', () => {
    expect(tcKimlikNoGecerliMi('10000000147')).toBe(false);
    expect(tcKimlikNoGecerliMi('1000000014')).toBe(false);
    expect(tcKimlikNoGecerliMi('01000000146')).toBe(false);
    expect(tcKimlikNoGecerliMi('1000000014a')).toBe(false);
  });

  it('yabancı kimlik numarası 99 ile başlamalı ve aynı algoritmaya uymalı', () => {
    // 99 ile başlayan ve algoritmayı sağlayan bir numara üret
    const ilk9 = '991234567';
    const h = [...ilk9].map(Number);
    const onuncu = ((((h[0]! + h[2]! + h[4]! + h[6]! + h[8]!) * 7 - (h[1]! + h[3]! + h[5]! + h[7]!)) % 10) + 10) % 10;
    const onbirinci = (h.reduce((a, b) => a + b, 0) + onuncu) % 10;
    const no = `${ilk9}${onuncu}${onbirinci}`;
    expect(yabanciKimlikNoGecerliMi(no)).toBe(true);
    expect(yabanciKimlikNoGecerliMi('10000000146')).toBe(false);
  });
});

describe('yardımcılar', () => {
  it('kimlik numarası maskelenir', () => {
    expect(kimlikNoMaskele('10000000146')).toBe('100******46');
    expect(kimlikNoMaskele('U123')).toBe('****');
  });

  it('arama metni Türkçe karakterlerden bağımsızdır', () => {
    expect(aramaMetni('İLKER', 'IŞIK', null)).toBe('ilker isik');
    expect(aramaMetni('ILKER isik')).toBe(aramaMetni('İlker Işık'));
    expect(aramaMetni('Gül  Çağlar')).toBe('gul caglar');
  });
});

describe('uyarı görünürlüğü', () => {
  it('alerji uyarısını sekreter görmez, hemşire görür', () => {
    const sekreter = etkinIzinler([{ rolKodu: 'sekreter', subeId: null }], 'idari', null);
    const hemsire = etkinIzinler([{ rolKodu: 'hemsire', subeId: null }], 'hemsire', null);
    expect(uyariGorulebilirMi('alerji', sekreter)).toBe(false);
    expect(uyariGorulebilirMi('alerji', hemsire)).toBe(true);
  });

  it('ödeme sorununu sekreter görür, hemşire görmez; şiddet geçmişini ikisi de görür', () => {
    const sekreter = etkinIzinler([{ rolKodu: 'sekreter', subeId: null }], 'idari', null);
    const hemsire = etkinIzinler([{ rolKodu: 'hemsire', subeId: null }], 'hemsire', null);
    expect(uyariGorulebilirMi('odeme_sorunu', sekreter)).toBe(true);
    expect(uyariGorulebilirMi('odeme_sorunu', hemsire)).toBe(false);
    expect(uyariGorulebilirMi('siddet_gecmisi', sekreter)).toBe(true);
    expect(uyariGorulebilirMi('siddet_gecmisi', hemsire)).toBe(true);
  });
});
