import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Review } from "./entities/review.entity";

@Module({
  imports:[
    TypeOrmModule.forFeature([Review]),
  ],
  controllers: [],
  providers: [],
})
export class ReviewModule {}