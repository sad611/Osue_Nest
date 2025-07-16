import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { CronJob } from 'cron';
import { Player, useMainPlayer } from 'discord-player';
import { ChannelType, Client, GuildBasedChannel, GuildMember, TextChannel, VoiceChannel } from 'discord.js';
import * as fs from 'fs';
import { Context, ContextOf, On, Once } from 'necord';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { PlayerManager } from '@necord/lavalink';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  public constructor(
    private client: Client,
    private httpService: HttpService,
    private readonly playerManager: PlayerManager,
  ) {}

  // findAll(): Observable<AxiosResponse<any[]>> {
  //   return this.httpService.get('http://localhost:4200/example/user');
  // }

  public async aniverJob() {
    try {
      const data = JSON.parse(fs.readFileSync('src/json/Undergrounds.json', 'utf8'));
      const date = new Date();
      const guildID = '636913623582769172';
      const channelID = '753413520606887967';
      const aniverRoleID = '674452167251329025';

      const guild = await this.client.guilds.fetch(guildID);
      const channel = (await this.client.channels.fetch(channelID)) as TextChannel;

      const candidates = data.filter((element: { aniverDay: number; aniverMonth: number }) => {
        return element.aniverDay === date.getDate() && element.aniverMonth === date.getMonth();
      });

      const aniverMembers: GuildMember[] = [];

      for (const candidate of candidates) {
        try {
          const discordUser = await guild.members.fetch(candidate.userID);
          aniverMembers.push(discordUser);
        } catch (error) {
          console.error(`Error fetching member with ID ${candidate.userID}:`, error);
        }
      }

      const exAniversariantes = Array.from(guild.roles.cache.get(aniverRoleID).members.values());
      const membersToRemove = exAniversariantes.filter((member) => !aniverMembers.includes(member));
      const membersToAdd = aniverMembers.filter((member) => !exAniversariantes.includes(member));

      await Promise.all([
        membersToRemove.map((member) => member.roles.remove(aniverRoleID)),
        membersToAdd.map((member) => member.roles.add(aniverRoleID)),
      ]);

      if (membersToAdd.length > 0) {
        await channel.send({ content: `@everyone Hoje é aniversário do(a) ${aniverMembers}!!! Feliz versário 🥳` });
      }
    } catch (error) {
      this.logger.error(`Failed to read JSON file: ${error.message}`);
      return null;
    }
  }

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);

    const job = new CronJob('0 0 * * *', () => {
      this.aniverJob();
    });
    job.start();

    const job2 = new CronJob('10 9,21 * * *', () => {
      this.noveEDeis()
    });
    job2.start();
  }

  async noveEDeis() {
    const guild = await this.client.guilds.fetch('636913623582769172');
    const channels = await guild.channels.fetch();
    const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice);

    const mostPopulated = voiceChannels.reduce((maxChannel, currentChannel) => {
      return currentChannel.members.size > (maxChannel?.members.size || 0) ? currentChannel : maxChannel;
    }, null) as VoiceChannel | null;

    if (!mostPopulated || mostPopulated.members.size === 0) {
      console.log('No populated voice channels found.');
      return null;
    }

    let player = this.playerManager.get(guild.id);

    if (player) {
      await player.destroy();
    }

    player = this.playerManager.create({
      guildId: guild.id,
      textChannelId: '636916754588631083',
      voiceChannelId: mostPopulated.id,
      selfDeaf: true,
      selfMute: false,
      volume: 100,
    });

    const res = await player.search(
      {
        query: 'https://www.youtube.com/shorts/LaOUyEVLn50?feature=share',
        source: 'youtube',
      },
      this.client.user,
    );

    player.queue.add(res.tracks[0]);
    await player.connect()
    player.play().then(async () => {
      const destroyTimeout = setTimeout(async () => {
        await player.destroy();
      }, 18000);
    });
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('messageCreate')
  public onMessage(@Context() [message]: ContextOf<'messageCreate'>) {
    if (message.author.bot) return;
    const channel = message.channel as TextChannel;
    this.logger.log(`{${message.guild.name}}[${channel.name}](${message.author.username}): ${message.content}`);
  }
}
