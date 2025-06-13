export class UpdateUserAddressDto {
  city: string;
  district: string;
  street?: string;
  addressDetails?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
}
