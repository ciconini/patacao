import { Global, Module } from '@nestjs/common';
import { Logger } from './logger/logger.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [Logger],
  exports: [Logger],
})
export class SharedModule {}

