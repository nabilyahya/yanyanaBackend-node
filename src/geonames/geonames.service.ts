import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeonamesService {
  private readonly logger = new Logger(GeonamesService.name);

  private readonly geoNamesUrl = 'http://api.geonames.org';
  // يُفضّل ضبطها من env: GEONAMES_USER
  private readonly username = process.env.GEONAMES_USER || 'nabilyahya';

  constructor(private readonly http: HttpService) {}

  private strip(s?: string): string {
    return (s ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private async get<T = any>(path: string, params: Record<string, any>) {
    const url = `${this.geoNamesUrl}/${path}`;
    const t0 = Date.now();
    this.logger.debug(`HTTP GET ${url} params=${JSON.stringify(params)}`);
    try {
      const res: AxiosResponse<T> = await firstValueFrom(
        this.http.get(url, { params: { username: this.username, ...params } }),
      );
      const ms = Date.now() - t0;
      const size = (() => {
        try {
          return JSON.stringify(res.data).length;
        } catch {
          return 0;
        }
      })();
      this.logger.debug(`HTTP ${res.status} ${url} (${ms}ms) size≈${size}B`);
      return res;
    } catch (err: any) {
      const ms = Date.now() - t0;
      this.logger.error(
        `HTTP ERROR ${url} (${ms}ms): ${err?.response?.status} ${JSON.stringify(
          err?.response?.data ?? err?.message,
        )}`,
      );
      throw err;
    }
  }

  // ========== موجودة ==========
  async getCountries(): Promise<any[]> {
    this.logger.log('getCountries() called');
    const res = await this.get('countryInfoJSON', {});
    const list = (res.data as any)?.geonames ?? [];
    this.logger.log(`getCountries(): ${list.length} countries`);
    return list;
  }

  async getCities(countryCode: string): Promise<any[]> {
    this.logger.log(`getCities(country=${countryCode})`);
    const res = await this.get('searchJSON', {
      country: countryCode,
      featureClass: 'P', // أماكن مأهولة بالسكان
      maxRows: 1000,
    });
    const list = (res.data as any)?.geonames ?? [];
    this.logger.log(`getCities(): ${list.length} cities`);
    return list;
  }

  async getDistricts(cityName: string, countryCode: string): Promise<any[]> {
    this.logger.log(`getDistricts(city=${cityName}, country=${countryCode})`);
    const res = await this.get('searchJSON', {
      country: countryCode,
      q: cityName,
      featureClass: 'A', // تقسيمات إدارية
      maxRows: 1000,
    });
    const list = (res.data as any)?.geonames ?? [];
    this.logger.log(`getDistricts(): ${list.length} admin areas`);
    return list;
  }

  /**
   * يحاول إيجاد الإحداثيات اعتماداً على:
   *  - ADM2 (district) أولاً إن توفر
   *  - ثم ADM1 (province)
   *  - ثم بحث عام كـ fallback
   *
   * يرجّع: { lat, lng, source: 'ADM2'|'ADM1'|'SEARCH', ... }
   */
  async resolveCoordsByArea(opts: {
    countryCode: string; // مثل TR
    province: string; // مثال: Bursa
    district?: string; // مثال: Osmangazi (اختياري)
  }): Promise<{
    lat: number;
    lng: number;
    source: 'ADM2' | 'ADM1' | 'SEARCH';
    geonameId?: number;
    name?: string;
    adminName1?: string;
    rawCount: number;
    note?: string;
  }> {
    const { countryCode, province, district } = opts;
    const pStr = this.strip(province);
    const dStr = this.strip(district);

    this.logger.log(
      `resolveCoordsByArea(country=${countryCode}, province=${province}, district=${district ?? '-'})`,
    );

    // 1) ADM2 إذا district موجود
    if (district) {
      const res2 = await this.get('searchJSON', {
        country: countryCode,
        featureClass: 'A',
        featureCode: 'ADM2',
        q: district,
        maxRows: 50,
      });
      const list2 = (res2.data as any)?.geonames ?? [];
      this.logger.debug(`ADM2 candidates: ${list2.length}`);

      const candidates = list2.filter((g: any) => {
        const a1 = this.strip(g.adminName1);
        const nm = this.strip(g.name);
        return (
          (nm.includes(dStr!) || this.strip(g.toponymName).includes(dStr!)) &&
          a1.includes(pStr)
        );
      });

      this.logger.debug(`ADM2 filtered by province/name: ${candidates.length}`);

      const pick = candidates[0] ?? list2[0];
      if (pick) {
        const lat = parseFloat(pick.lat);
        const lng = parseFloat(pick.lng);
        this.logger.log(
          `resolveCoordsByArea → ADM2 hit: ${pick.name} / ${pick.adminName1} (id=${pick.geonameId}) lat=${lat} lng=${lng}`,
        );
        return {
          lat,
          lng,
          source: 'ADM2',
          geonameId: pick.geonameId,
          name: pick.name,
          adminName1: pick.adminName1,
          rawCount: list2.length,
        };
      }
      this.logger.warn('No ADM2 match; falling back to ADM1…');
    }

    // 2) ADM1 (المحافظة)
    const res1 = await this.get('searchJSON', {
      country: countryCode,
      featureClass: 'A',
      featureCode: 'ADM1',
      q: province,
      maxRows: 50,
    });
    const list1 = (res1.data as any)?.geonames ?? [];
    this.logger.debug(`ADM1 candidates: ${list1.length}`);

    const provinceCand =
      list1.find((g: any) => {
        const nm = this.strip(g.name);
        return nm === pStr || nm.includes(pStr);
      }) ?? list1[0];

    if (provinceCand) {
      const lat = parseFloat(provinceCand.lat);
      const lng = parseFloat(provinceCand.lng);
      this.logger.log(
        `resolveCoordsByArea → ADM1 hit: ${provinceCand.name} (id=${provinceCand.geonameId}) lat=${lat} lng=${lng}`,
      );
      return {
        lat,
        lng,
        source: 'ADM1',
        geonameId: provinceCand.geonameId,
        name: provinceCand.name,
        adminName1: provinceCand.adminName1,
        rawCount: list1.length,
      };
    }

    // 3) بحث عام كـ fallback أخير
    const resF = await this.get('searchJSON', {
      country: countryCode,
      q: district || province,
      maxRows: 10,
    });
    const listF = (resF.data as any)?.geonames ?? [];
    const pickF = listF[0];
    if (pickF) {
      const lat = parseFloat(pickF.lat);
      const lng = parseFloat(pickF.lng);
      this.logger.warn(
        `resolveCoordsByArea → SEARCH fallback: ${pickF.name} (id=${pickF.geonameId}) lat=${lat} lng=${lng}`,
      );
      return {
        lat,
        lng,
        source: 'SEARCH',
        geonameId: pickF.geonameId,
        name: pickF.name,
        adminName1: pickF.adminName1,
        rawCount: listF.length,
        note: 'Used broad search fallback',
      };
    }

    this.logger.error('resolveCoordsByArea → no match found at all');
    throw new Error('No matching area found');
  }
}
