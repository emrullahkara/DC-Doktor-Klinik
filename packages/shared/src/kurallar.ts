import { IZINLER, type Izin } from './izinler';
import { HEKIM_MESLEKLERI, SAGLIK_MESLEKLERI, type Meslek } from './meslekler';
import { ROLLER, type RolKodu } from './roller';

/**
 * Kilitli yasal kural: bir izin, kişinin mesleği gereği ona verilebilir mi?
 * Rol şablonları ne derse desin bu kontrol her zaman uygulanır.
 */
export function izinMeslegeUygunMu(izin: Izin, meslek: Meslek): boolean {
  switch (IZINLER[izin].seviye) {
    case 'hekim':
      return HEKIM_MESLEKLERI.has(meslek);
    case 'saglik':
      return SAGLIK_MESLEKLERI.has(meslek);
    case 'serbest':
      return true;
  }
}

export type AtamaUygunlugu =
  | { uygun: true }
  | { uygun: false; neden: 'MESLEK_UYGUN_DEGIL'; mesaj: string };

/** Bir rol, bu mesleğe sahip kişiye atanabilir mi? */
export function rolAtanabilirMi(rol: RolKodu, meslek: Meslek): AtamaUygunlugu {
  const tanim = ROLLER[rol];
  const meslekler: readonly Meslek[] | undefined = 'meslekler' in tanim ? tanim.meslekler : undefined;
  if (meslekler && !meslekler.includes(meslek)) {
    return {
      uygun: false,
      neden: 'MESLEK_UYGUN_DEGIL',
      mesaj: `“${tanim.ad}” rolü bu mesleğe atanamaz.`,
    };
  }
  return { uygun: true };
}

/** Rolün herhangi bir tıbbi (sağlık/hekim seviyeli) izni var mı? */
export function saglikRoluMu(rol: RolKodu): boolean {
  return ROLLER[rol].izinler.some((izin) => IZINLER[izin].seviye !== 'serbest');
}

/**
 * Bir rolü başkasına atayabilmek için atayanın sahip olması gereken izin.
 * - Mesul müdürü kurum sahibi atar (yasal gerçeklik: işleten atar, Bakanlığa bildirir).
 * - Diğer sağlık rollerini mesul müdür onaylar.
 * - İdari roller kullanıcı yönetimi yetkisiyle atanır.
 */
export function atamaIcinGerekenIzin(rol: RolKodu): Izin {
  if (rol === 'mesul_mudur') return 'mesul.mudur.ata';
  if (saglikRoluMu(rol)) return 'yetki.saglik.onayla';
  return 'kullanici.yonet';
}

export interface RolAtamasi {
  rolKodu: RolKodu;
  /** null: işletmedeki tüm şubelerde geçerli */
  subeId: string | null;
}

/**
 * Kişinin belirli bir şube bağlamındaki etkin izinleri.
 * `subeId` null ise yalnızca tüm şubelerde geçerli atamalar sayılır.
 */
export function etkinIzinler(atamalar: readonly RolAtamasi[], meslek: Meslek, subeId: string | null): Set<Izin> {
  const sonuc = new Set<Izin>();
  for (const atama of atamalar) {
    if (atama.subeId !== null && atama.subeId !== subeId) continue;
    if (!rolAtanabilirMi(atama.rolKodu, meslek).uygun) continue;
    for (const izin of ROLLER[atama.rolKodu].izinler) {
      if (izinMeslegeUygunMu(izin, meslek)) sonuc.add(izin);
    }
  }
  return sonuc;
}
