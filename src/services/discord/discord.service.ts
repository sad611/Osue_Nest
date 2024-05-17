import { Injectable, Logger } from '@nestjs/common';
import { Player, useMainPlayer } from 'discord-player';
import { Client } from 'discord.js';
import { LavalinkManager } from 'lavalink-client/dist/types';
import { Once, Context, ContextOf, On } from 'necord';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private player: Player;

  public constructor(private client: Client) {
    this.player = useMainPlayer()
    // this.player.events.on('playerStart', (queue, track) => {
    //   queue.metadata.channel.send(`Started playing **${track.title}**!`);
    // });
    // this.player.events.on('playerError', (queue, error) => {
    //   this.logger.log(error)
    // });
    // this.player.events.on('audioTrackAdd', (queue, track) => {
    //   this.logger.log(track.title)
    // });

  }

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    await this.player.extractors.loadDefault();
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('messageCreate')
  public onMessage(@Context() [message]: ContextOf<'messageCreate'>) {
    if (!message.author.bot) return;
    this.logger.log(`[${message.guild.name}](${message.author.username}): ${message.content}`);
  }
}
