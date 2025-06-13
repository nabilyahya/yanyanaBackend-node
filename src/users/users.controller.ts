import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateUserAddressDto } from './dtos/UpdateUserAddressDto';
import { RequestWithUser } from 'src/common/types/request-with-user';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id); // ✅ تحويل id إلى رقم
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto); // ✅ تحويل id إلى رقم
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id); // ✅ تحويل id إلى رقم
  }
  @Post('address')
  updateAddress(
    @Body() dto: UpdateUserAddressDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.updateAddress(req.user.id, dto);
  }
}
