import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { GeonamesService } from './geonames.service';

@Controller('locations')
export class GeonamesController {
  private readonly logger = new Logger(GeonamesController.name);

  constructor(private readonly geoService: GeonamesService) {}

  // ========== موجودة ==========
  @Get('countries')
  getCountries() {
    return this.geoService.getCountries();
  }

  @Get('cities/:countryCode')
  getCities(@Param('countryCode') countryCode: string) {
    return this.geoService.getCities(countryCode);
  }

  @Get('districts/:countryCode/:cityName')
  getDistricts(
    @Param('countryCode') countryCode: string,
    @Param('cityName') cityName: string,
  ) {
    return this.geoService.getDistricts(cityName, countryCode);
  }

  // ========== جديدة: إرجاع الإحداثيات بحسب المحافظة/المنطقة ==========
  // يدعم countryCode=TR أو country=Türkiye/Turkey للتوافق
  @Get('coords-by-area')
  async coordsByArea(
    @Query('countryCode') countryCode?: string, // TR
    @Query('country') countryAlt?: string, // Türkiye / Turkey (اختياري)
    @Query('province') province?: string, // مثال: Bursa
    @Query('district') district?: string, // مثال: Osmangazi (اختياري)
    @Query('street') street?: string, // غير مستخدم حالياً (للّوجز فقط)
  ) {
    const rawCountry = (countryCode ?? countryAlt ?? '').trim();
    const prov = (province ?? '').trim();
    const dist = (district ?? '').trim();
    const streetLog = (street ?? '').trim();

    this.logger.log(
      `coords-by-area called with country=${rawCountry} province=${prov} district=${dist} street=${streetLog}`,
    );

    if (!rawCountry || !prov) {
      this.logger.warn(
        'Missing required query params (country/countryCode, province)',
      );
      throw new BadRequestException(
        'country (or countryCode) and province are required',
      );
    }

    // تطبيع بارامتر الدولة: نقبل Türkiye / Turkey / TR
    const normalize = (s: string) =>
      s
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    let cc = rawCountry;
    const n = normalize(rawCountry);
    if (rawCountry.length > 2) {
      // اسم دولة وليس كود
      if (n === 'TURKIYE' || n === 'TURKEY') cc = 'TR';
    } else {
      // كود مكوّن من حرفين
      cc = rawCountry.toUpperCase();
    }

    try {
      const result = await this.geoService.resolveCoordsByArea({
        countryCode: cc,
        province: prov,
        district: dist || undefined,
      });

      this.logger.log(
        `Resolved -> lat=${result.lat}, lng=${result.lng}, source=${result.source}, name=${result.name ?? '-'}`,
      );

      return result;
    } catch (err: any) {
      this.logger.warn(
        `coords-by-area not found for country=${cc} province=${prov} district=${dist} :: ${err?.message ?? err}`,
      );
      throw new NotFoundException('No coordinates found for given area');
    }
  }
}
