import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PlacesService } from '../places.service';
import { PlacesController } from '../places.controller';

// Mock data
const mockPlaces = [
  {
    _id: '663d8ef4d80f1e7a4c8d7b12',
    name: 'مطعم المدينة',
    rate: 4.5,
    description: 'مطعم يقدم المأكولات التركية الأصيلة',
    websiteUrl: 'https://restaurant.com',
    phoneNumber: '+90 555 555 5555',
    category: 'categoryId123',
    photos: ['photo_reference_1', 'photo_reference_2'],
    address: 'areaId123',
    approved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock PlacesService
const mockPlacesService = {
  getPlacesByAreaAndCategory: jest.fn(),
};

describe('PlacesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      controllers: [PlacesController],
      providers: [
        {
          provide: PlacesService,
          useValue: mockPlacesService,
        },
        {
          provide: getModelToken('Place'),
          useValue: {},
        },
        {
          provide: getModelToken('Area'),
          useValue: {},
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /places/by-area/:country/:city/:district/:categoryId', () => {
    // تحديد ما ستُعيده الدالة mocked
    mockPlacesService.getPlacesByAreaAndCategory.mockResolvedValue(mockPlaces);

    return request(app.getHttpServer())
      .get('/places/by-area/turkey/bursa/osmangazi/categoryId123')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toEqual('مطعم المدينة');
        expect(res.body[0].category).toEqual('categoryId123');
      });
  });
});
