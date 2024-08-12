import { Controller, Get, Post, Query } from '@nestjs/common';
import { useQueue } from 'discord-player';
import { Client, Guild } from 'discord.js';
import { DiscordService } from '../../services/discord/discord.service';
import { MusicService } from '../../services/discord/music/music.service';

@Controller('discord')
export class DiscordController {
  constructor(
    private musicService: MusicService,
    private client: Client,
    private discordService: DiscordService,
  ) {}

  @Get('user')
  getUser(): string {
    return 'something';
  }

  @Get('guilds')
  async getGuilds(@Query('memberID') memberID: string) {
    // Log guilds with member presence

    // this.client.guilds.cache.filter((guild) => {
    //   guild.members.cache.has(memberID)}).forEach((guild) => {
    //     console.log(guild)
    //   })
    // await this.client.guilds.fetch('636913623582769172').then(res => console.log(res))
    return this.client.guilds.cache.filter((guild: Guild) => guild.members.cache.has(memberID));
  }

  @Get('queue')
  async getQueue(@Query('guildID') guildID: string) {
    const guild = await this.client.guilds.fetch(guildID);
    const queue = useQueue(guild);
    if (queue === null) return { currentTrack: '', tracks: [] };
    return { currentTrack: queue.currentTrack, tracks: queue.tracks };
  }

  @Post('aniver')
  async runAniverJob() {
    await this.discordService.aniverJob();
    return {
      statusCode: 200,
      message: 'Executado',
    };
  }

  // @Get('queue')
  // async getQueue(@Query('guildID') guildID: string): Promise<QueueDto> {
  //   if (!guildID) {
  //     throw new Error('guildID is required');
  //   }
  //   const guild: Guild = await this.client.guilds.fetch(guildID);
  //   if (!guild) {
  //     throw new Error('Guild not found');
  //   }

  //   const queue = this.musicService.getQueue(guild);

  //   if (!queue) {
  //     throw new Error('Queue not found');
  //   }

  //   const queueDto: QueueDto = {
  //     guildId: guild.id,
  //     tracks: queue.tracks.map((track) => ({
  //       title: track.title,
  //     })),
  //   };

  //   return queueDto;
  // }

  // @Post('queue/add')
  // async addToQueue(
  //   @Body() { guildID }: { guildID: string }, // Extract guildID from the body
  //   @Query('query') query: string, // Extract title from the query string
  // ): Promise<string> {
  //   try {
  //     if (!guildID) {
  //       throw new Error('guildID is required');
  //     }

  //     const guild: Guild = await this.client.guilds.fetch(guildID);
  //     if (!guild) {
  //       throw new Error('Guild not found');
  //     }

  //     const queue = this.musicService.getQueue(guild);

  //     if (!queue) {
  //       throw new Error('Queue not found');
  //     }
  //     this.musicService.addToQueue(queue, guild, query);

  //     return 'Track added to queue successfully';
  //   } catch (error) {
  //     return 'There was an error, possibly missing Body and params'; // Return error message to client
  //   }
  // }
}
