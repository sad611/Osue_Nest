
import { Module } from "@nestjs/common";
import {
  BitFieldResolvable,
  GatewayIntentsString,
  IntentsBitField,
  Partials,
} from "discord.js";
import { NecordModule } from "necord";
import { ConfigService } from "@nestjs/config";
import { InteractionService } from "../../services/discord/interaction/interaction.service"
import { BirthdayService } from "../../services/discord/interaction/birthday/birthday.service";
import { MusicService } from "../../services/discord/music/music.service";
import { DiscordService } from "../../services/discord/discord.service";
import { LavalinkManager } from "lavalink-client";
import { LavalinkModule } from "../lavalink/lavalink.module";
import { EmbedService } from "../../services/discord/embed/embed.service";
import { EmbedInteractionService } from "../../services/discord/embed/embed-interaction/embed-interaction.service";

@Module({
  imports: [
    NecordModule.forRootAsync({
      inject: [ConfigService],
       useFactory: (config: ConfigService) => ({
        token: config.get("DISCORD_BOT_TOKEN"),
        intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<
          GatewayIntentsString,
          number
        >,
        partials: [
          Partials.Channel,
          Partials.Message,
          Partials.GuildMember,
          Partials.GuildScheduledEvent,
          Partials.Reaction,
          Partials.ThreadMember,
          Partials.User,
        ],
        lavalink: LavalinkManager
      }),
    }),
    LavalinkModule
  ],
  providers: [DiscordService, InteractionService, BirthdayService, MusicService, EmbedService, EmbedInteractionService],
  exports: [InteractionService],
})
export class DiscordModule {}

