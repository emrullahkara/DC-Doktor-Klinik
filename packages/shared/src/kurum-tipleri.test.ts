import { CEKIRDEK_MODULLER, profilBirlestir, subelereAyir } from './kurum-tipleri';

describe('profilBirlestir', () => {
  it('çekirdek modüller her profilde bulunur', () => {
    const profil = profilBirlestir(['fizik_danismanlik']);
    for (const modul of CEKIRDEK_MODULLER) expect(profil.moduller).toContain(modul);
  });

  it('birden fazla tip tekrarsız birleşir', () => {
    const profil = profilBirlestir(['tip_merkezi', 'dis', 'tip_merkezi']);
    expect(profil.kurumTipleri).toEqual(['tip_merkezi', 'dis']);
    expect(profil.moduller).toContain('Diş şeması (odontogram)');
    expect(profil.moduller).toContain('Laboratuvar ve görüntüleme');
    expect(profil.belgeler.filter((b) => b === 'Malpraktis sigortası')).toHaveLength(1);
    expect(profil.entegrasyonlar.filter((e) => e === 'e-Nabız / USS')).toHaveLength(1);
  });
});

describe('subelereAyir', () => {
  it('yalnızca insan sağlığı tipleri tek şubede kalır', () => {
    expect(subelereAyir(['tip_merkezi', 'estetik'])).toEqual([['tip_merkezi', 'estetik']]);
  });

  it('veteriner ile insan sağlığı ayrı şubelere ayrılır', () => {
    expect(subelereAyir(['tip_merkezi', 'veteriner', 'estetik'])).toEqual([['tip_merkezi', 'estetik'], ['veteriner']]);
  });

  it('boş seçim boş liste döner', () => {
    expect(subelereAyir([])).toEqual([]);
  });
});
