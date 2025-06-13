import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeonamesService {
  private readonly geoNamesUrl = 'http://api.geonames.org';
  private readonly username = 'nabilyahya';

  constructor(private readonly httpService: HttpService) {}

  async getCountries(): Promise<any[]> {
    const url = `${this.geoNamesUrl}/countryInfoJSON`;
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          params: { username: this.username },
        }),
      );

      if (!response.data || !response.data.geonames) {
        throw new Error('GeoNames API returned no data.');
      }

      return response.data.geonames;
    } catch (error) {
      console.error(
        'Error in getCountries():',
        error?.response?.data || error.message,
      );
      throw new Error('Failed to fetch countries from GeoNames API');
    }
  }
  async getCities(countryCode: string): Promise<any[]> {
    const url = `${this.geoNamesUrl}/searchJSON`;
    const response: AxiosResponse = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          username: this.username,
          country: countryCode,
          featureClass: 'P',
          maxRows: 1000,
        },
      }),
    );
    return response.data.geonames;
  }

  async getDistricts(cityName: string, countryCode: string): Promise<any[]> {
    const url = `${this.geoNamesUrl}/searchJSON`;
    const response: AxiosResponse = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          username: this.username,
          country: countryCode,
          q: cityName,
          featureClass: 'A',
          maxRows: 1000,
        },
      }),
    );
    return response.data.geonames;
  }
}
