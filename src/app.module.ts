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
// import { GeoModule } from './geo/geo.module'; // وحدة للقاعدة الجغرافية

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // الاتصال بقاعدة بيانات التطبيق الرئيسية
    TypeOrmModule.forRoot({
      name: 'default', // هذا هو الاتصال الرئيسي
      type: 'postgres',
      host: process.env.APP_DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.APP_DB_USERNAME,
      password: process.env.APP_DB_PASSWORD,
      database: process.env.APP_DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    // الاتصال بقاعدة البيانات الجغرافية
    TypeOrmModule.forRoot({
      name: 'geo', // اسم مخصص للاتصال الجغرافي
      type: 'postgres',
      host: process.env.GEO_DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.GEO_DB_USERNAME,
      password: process.env.GEO_DB_PASSWORD,
      database: process.env.GEO_DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    UsersModule,
    PlacesModule,
    GeoModule,
    PhotosModule,
    CategoriesModule,
    ReviewsModule,
    UsersModule,
    AreasModule,
    GeonamesModule,
    MapModule,
  ],
})
export class AppModule {}
