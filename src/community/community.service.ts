import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Community } from './entities/community.entity';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createPost(createCommunityDto: CreateCommunityDto, userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('유저를 찾을 수 없습니다.');
    }

    const post = this.communityRepository.create({
      ...createCommunityDto,
      user,
    });

    return this.communityRepository.save(post);
  }

  async findAll() {
    return await this.communityRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: number) {
    const result = await this.communityRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (result) {
      result.view += 1;
      await this.communityRepository.save(result);
    }
    return result;
  }

  async updatePost(
    id: number,
    updateCommunityDto: UpdateCommunityDto,
    userId: string,
  ) {
    const updateResult = await this.communityRepository
    .createQueryBuilder()
    .update()
    .set(updateCommunityDto)
    .where('id = :id', { id })
    .andWhere('userId = :userId', { userId })
    .andWhere('deletedAt IS NULL')
    .execute();

    if (updateResult.affected === 0) {
      throw new NotFoundException(
        '게시글을 찾을 수 없거나 본인이 작성한 게시글만 수정할 수 있습니다.',
      );
    }

    return {
      message: '게시글이 성공적으로 수정되었습니다.',
    };
  }

  async deletePost(id: number, userId: string) {
    const deleteResult = await this.communityRepository
    .createQueryBuilder()
    .softDelete()
    .where('id = :id', { id })
    .andWhere('userId = :userId', { userId })
    .andWhere('deletedAt IS NULL')
    .execute();

    if (deleteResult.affected === 0) {
      throw new NotFoundException(
        '게시글을 찾을 수 없거나 본인이 작성한 게시글만 삭제할 수 있습니다.',
      );
    }

    return { message: '게시글이 성공적으로 삭제되었습니다.' };
  }
}
