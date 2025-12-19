import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { IssuesModule } from './issues/issues.module';

@Module({
  imports: [PrismaModule, IssuesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
