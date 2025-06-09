import { Controller, Get, Param } from '@nestjs/common';
import { GeonamesService } from './geonames.service';

@Controller('locations')
export class GeonamesController {
  constructor(private readonly geoService: GeonamesService) {}

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
}
