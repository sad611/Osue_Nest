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

  public constructor(private client: Client, private httpService: HttpService) {

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
