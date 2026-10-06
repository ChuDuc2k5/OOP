import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { BackendService } from './backend.service';

@Module({ controllers: [AppController], providers: [BackendService] })
export class AppModule {}

