import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery, ApiTags, ApiParam } from '@nestjs/swagger';
import { CampingCronHandler } from './camping.cron.provider';
import { CampingParamDto } from './dto/find-camping-param.dto';
import { ICampingService } from './interface/camping.service.interface';
import { CampingJwtAuthGuard, CampingUserRequest } from './guard/camping.jwt.guard';

@ApiTags('Camping')
@Controller('campings')
export class CampingController {
  constructor(
    @Inject('ICampingService')
    private readonly campingService: ICampingService,
    private readonly campingCron: CampingCronHandler,
  ) {}
  @Get()
  async handler() {
    return await this.campingCron.handleCron();
  }
  @Get('map')
  @UseGuards(CampingJwtAuthGuard)
  @ApiOperation({
    summary: '근처 캠핑장 찾기',
    description: '위도(lat)와 경도(lon)를 기준으로 근처 캠핑장을 검색합니다.',
  })
  @ApiQuery({
    name: 'lat',
    description: '위도 값',
    example: 37.5665,
    required: true,
  })
  @ApiQuery({
    name: 'lon',
    description: '경도 값',
    example: 126.9780,
    required: true,
  })
  @ApiResponse({ status: 200, description: '근처 캠핑장 목록을 반환합니다.' })
  async findNearbyCamping(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
    @Req() req?: CampingUserRequest
  ) {
    const userId = req?.user?.sub;
    if(!userId){
      return await this.campingService.findNearbyCamping(lon, lat);
    }
    return await this.campingService.findNearbyCamping(lon, lat, userId);
  }
  @Get('lists')
  @UseGuards(CampingJwtAuthGuard)
  @ApiOperation({
    summary: '캠핑장 목록 검색',
    description: '지역(region) 및 카테고리(category)에 따라 캠핑장 목록을 검색합니다.',
  })
  @ApiQuery({
    name: 'limit',
    description: '최대 조회 수',
    example: 10,
    required: true,
  })
  @ApiQuery({
    name: 'cursor',
    description: '커서 기반 검색용',
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'region',
    description: '캠핑장의 지역 (선택 사항)',
    example: '서울시',
    required: false,
  })
  @ApiQuery({
    name: 'category',
    description: '캠핑장의 카테고리 (선택 사항)',
    example: '펫',
    required: false,
  })
  @ApiResponse({ status: 200, description: '캠핑장 목록을 반환합니다.' })
  async findCamping(
    @Query('limit') limit: number,
    @Query('cursor') cursor?:number,
    @Query('region') region?: string,
    @Query('category') category?: string,
    @Req() req?: CampingUserRequest,
  ) {
    const userId = req?.user?.sub;
    if (!userId) {
      return await this.campingService.findAllWithDetails(limit, cursor, region, category);
    }
    return await this.campingService.findAllWithDetails(limit, cursor,region, category, userId);
  }
  @Get('/lists/:contentId')
  @ApiOperation({
    summary: '특정 캠핑장 세부 정보',
    description: '캠핑장 ID(contentId)를 기준으로 세부 정보를 검색합니다.',
  })
  @ApiParam({
    name: 'contentId',
    description: '캠핑장의 고유 ID',
    example: '100000',
    required: true,
  })
  @ApiResponse({ status: 200, description: '특정 캠핑장의 세부 정보를 반환합니다.' })
  async findOnecamping(@Param() paramDto: CampingParamDto) {
    return await this.campingService.findOne(paramDto);
  }
}
