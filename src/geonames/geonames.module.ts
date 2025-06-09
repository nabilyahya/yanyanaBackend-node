import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeonamesService } from './geonames.service';
import { GeonamesController } from './geonames.controller';

@Module({
  imports: [HttpModule],
  providers: [GeonamesService],
  controllers: [GeonamesController],
  exports: [GeonamesService],
})
export class GeonamesModule {}
