import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { CronJob } from 'cron';
import { Player, useMainPlayer } from 'discord-player';
import { Client, GuildMember, TextChannel } from 'discord.js';
import * as fs from 'fs';
import { Context, ContextOf, On, Once } from 'necord';
import { YoutubeiExtractor } from 'discord-player-youtubei';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private player: Player;
  private queue;

  public constructor(private client: Client, private httpService: HttpService) {
    this.player = useMainPlayer();
  }

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
    await this.player.extractors.register(YoutubeiExtractor, {
      streamOptions: { useClient: 'iOS' },
      authentication:
        'access_token=ya29.a0AcM612w5nCMtPGBii9evxkiWgATPrWjg73fhlBwZySDEcmQAS1I7Xc7NxQBEWwXMYe_FC8SPSu6j2lMELfYBeLX7z7FeTZw7EjxcAb5zxLX7DJUO6vxo99ga01lXoqjuitf73IdCTpn8aO-aLNbPsy6rcaNW6YJhe-bHUl05BmL9peslaCgYKAQgSARMSFQHGX2MiI8LV7XvAyfE-i0kHG2pmlQ0183; refresh_token=1//0h5fbDZoxL2ctCgYIARAAGBESNwF-L9IrlPAnnCvhJWVkQlgTmYjVkfw6kSyBAFrlpoJLedUhkGpRDuRL0S7Dn0ndnl7vL9kW4tA; scope=https://www.googleapis.com/auth/youtube-paid-content https://www.googleapis.com/auth/youtube; token_type=Bearer; expiry_date=2024-08-04T19:36:28.004Z',
    });

    await this.player.extractors.loadDefault(function (ext) { return ext !== 'YouTubeExtractor' });

    // this.findAll().subscribe(({data}) => console.log(data))

    this.logger.log(`Bot logged in as ${client.user.username}`);

    const job = new CronJob('0 3 * * *', () => {
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
    if (message.author.bot) return;
    const channel = message.channel as TextChannel;
    this.logger.log(`{${message.guild.name}}[${channel.name}](${message.author.username}): ${message.content}`);
  }
}
