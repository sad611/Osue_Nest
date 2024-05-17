import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppService } from './services/app.service';
import { DiscordModule } from './modules/discord/discord.module';
import { MongodbModule } from './modules/mongodb/mongodb.module';


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DiscordModule, MongodbModule],

  providers: [AppService],
})
export class AppModule {
}
