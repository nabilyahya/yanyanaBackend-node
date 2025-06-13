import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { PlacesModule } from './places/places.module';
import { GeoModule } from './geo/geo.module';
import { PhotosModule } from './photos/photos.module';
import { CategoriesModule } from './categories/categories.module';
import { ReviewsModule } from './reviews/reviews.module';
import { Area } from './area/entities/area.entity';
import { AreasModule } from './area/area.module';
import { GeonamesModule } from './geonames/geonames.module';
import { MapModule } from './map/map.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      name: 'default', // هذا هو الاتصال الرئيسي
      type: 'postgres',
      host: process.env.APP_DB_HOST,
      port: parseInt(process.env.APP_DB_PORT || '5432', 10),
      username: process.env.APP_DB_USERNAME,
      password: process.env.APP_DB_PASSWORD,
      database: process.env.APP_DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    // الاتصال بقاعدة البيانات الجغرافية
    // TypeOrmModule.forRoot({
    //   name: 'geo',
    //   type: 'postgres',
    //   host: process.env.GEO_DB_HOST,
    //   port: parseInt(process.env.GEO_DB_PORT || '5432', 10),
    //   username: process.env.GEO_DB_USERNAME,
    //   password: process.env.GEO_DB_PASSWORD,
    //   database: process.env.GEO_DB_NAME,
    //   autoLoadEntities: true,
    //   synchronize: true,
    // }),

    UsersModule,
    AreasModule,
    MapModule,
    PlacesModule,
    GeoModule,
    PhotosModule,
    CategoriesModule,
    ReviewsModule,
    GeonamesModule,
  ],
})
export class AppModule {}
