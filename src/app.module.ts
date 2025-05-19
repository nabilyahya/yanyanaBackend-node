import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlacesModule } from './places/places.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotosModule } from './photos/photos.module';
import { CategoriesModule } from './categories/categories.module';
import { AreasModule } from './area/area.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    AreasModule,
    PlacesModule,
    PhotosModule,
    CategoriesModule,
    ReviewsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/places_db',
    ),
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
