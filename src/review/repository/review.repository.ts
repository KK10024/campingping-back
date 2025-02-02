import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Review } from "../entities/review.entity";
import { CreateReviewDto } from "../dto/create-review.dto";
import { User } from "src/user/entities/user.entity";
import { FindReviewParam } from "../dto/param-review.dto";
import { updateReviewDto } from "../dto/update-review.dto";


@Injectable()
export class ReviewRepository {
     private readonly repository: Repository<Review>;
    constructor(private readonly dataSource: DataSource) {
        this.repository = this.dataSource.getRepository(Review);
    }
    async findOne(id: number) {
        return await this.repository.findOne({
            where: {id}, 
            relations: ['user']
        });
    }
    async createReview(createReviewDto: CreateReviewDto, user: User): Promise<Review> {
        const { content , scope, contentId} = createReviewDto;
        const newReview = this.repository.create({content, scope, user, contentId});
        return await this.repository.save(newReview);
    }
    async getReview(contentId: string){
        const result = await this.repository.find({
            where: {contentId}, 
            relations: ['user']
        });
        return result;
    }
    async updateReview(reviewId: number, userId: string, updateReviewDto: updateReviewDto) {
        const updateResult = await this.repository
          .createQueryBuilder()
          .update(Review)
          .set(updateReviewDto)
          .where('id = :reviewId AND deletedAt IS NULL AND user.id = :userId', { reviewId, userId })
          .execute();
    
        return updateResult;
      }
    async deleteReview(id: number, userId: string) {
        return await this.repository
        .createQueryBuilder('review')
        .softDelete()
        .where('id = :id', { id })
        .andWhere('userId = :userId', { userId })
        .andWhere('deletedAt IS NULL')
        .execute();
    }
}