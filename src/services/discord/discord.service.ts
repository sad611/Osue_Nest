import { Injectable, Logger } from '@nestjs/common';
import { Player, useMainPlayer } from 'discord-player';
import { Client, GuildMember, TextChannel } from 'discord.js';
import { LavalinkManager } from 'lavalink-client/dist/types';
import { Once, Context, ContextOf, On } from 'necord';
import { CronJob } from 'cron';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private player: Player;

  public constructor(private client: Client) {
    this.player = useMainPlayer();
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

private async aniverJob() {
  try {
    const data = JSON.parse(fs.readFileSync('src/json/Undergrounds.json', 'utf8'));
    const date = new Date();
    const guildID = '636913623582769172';
    const channelID = '636916754588631083';
    const aniverRoleID = '674452167251329025';

    const guild = await this.client.guilds.fetch(guildID);
    const channel = await this.client.channels.fetch(channelID) as TextChannel;

    const candidates = data.filter((element: { aniverDay: number; aniverMonth: number }) => {
      return element.aniverDay === date.getDate() && element.aniverMonth === date.getMonth();
    });

    const aniverMembers: GuildMember[] = await Promise.all(candidates.map(async (candidate) => {
      try {
        return await guild.members.fetch(candidate.userID);
      } catch (error) {
        console.error(`Error fetching member with ID ${candidate.userID}:`, error);
        return null;
      }
    }));

    const exAniversariantes = Array.from(guild.roles.cache.get(aniverRoleID).members.values());
    const membersToRemove = exAniversariantes.filter(member => !aniverMembers.includes(member));
    const membersToAdd = aniverMembers.filter(member => !exAniversariantes.includes(member));

    await Promise.all([
      membersToRemove.map(member => member.roles.remove(aniverRoleID)),
      membersToAdd.map(member => member.roles.add(aniverRoleID))
    ]);

    if (membersToAdd.length > 0) {
      await channel.send({ content: 'ebaaa' });
    }
  } catch (error) {
    this.logger.error(`Failed to read JSON file: ${error.message}`);
    return null;
  }
}


  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    await this.player.extractors.loadDefault();
    this.logger.log(`Bot logged in as ${client.user.username}`);

    const job = new CronJob('0 0 * * *', () => {
      this.aniverJob();
    });

    job.start();
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
