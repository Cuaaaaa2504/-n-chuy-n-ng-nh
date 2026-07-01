import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpCodeController } from './otp-code.controller';
import { OtpCodeService } from './otp-code.service';
import { OtpCode } from '../entities/otp-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OtpCode])],
  controllers: [OtpCodeController],
  providers: [OtpCodeService],
  exports: [OtpCodeService],
})
export class OtpCodeModule {}
