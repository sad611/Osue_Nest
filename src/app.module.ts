import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppService } from './services/app.service';
import { DiscordModule } from './modules/discord/discord.module';
import { MongodbModule } from './modules/mongodb/mongodb.module';
import { GraphqlModule } from './modules/graphql/graphql.module';


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DiscordModule, MongodbModule, GraphqlModule],

  providers: [AppService],
})
export class AppModule {
}
