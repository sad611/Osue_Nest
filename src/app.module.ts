import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppService } from './services/app.service';
import { DiscordModule } from './modules/discord/discord.module';
import { MongodbModule } from './modules/mongodb/mongodb.module';
import { NecordLavalinkModule } from '@necord/lavalink';
import { AppUpdate } from './app.update';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DiscordModule, MongodbModule,
  NecordLavalinkModule.forRoot({
    nodes: [
      {
        authorization: 'senha',
        host: 'localhost',
        port: 2333,
        id: 'main_node'
      }
    ]

  })
  ],

  providers: [AppService, AppUpdate],

  controllers: [],
})


export class AppModule {
}
