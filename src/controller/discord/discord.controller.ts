import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { useQueue } from 'discord-player';
import { Client, Guild } from 'discord.js';
import { DiscordService } from '../../services/discord/discord.service';
import { MusicService } from '../../services/discord/music/music.service';
import { PlayerManager } from '@necord/lavalink';
import { Http2ServerResponse } from 'http2';

@Controller('discord')
export class DiscordController {
  constructor(
    private musicService: MusicService,
    private playerManager: PlayerManager,
    private client: Client,
    private discordService: DiscordService,
  ) {}

  @Get('user')
  getUser(): string {
    return 'something';
  }

  @Get('guilds')
  async getGuilds(@Query('memberID') memberID: string) {
    console.log(memberID);
    return this.client.guilds.cache.filter((guild: Guild) => guild.members.cache.has(memberID));
  }

  @Get('queue')
  async getQueue(@Query('guildID') guildID: string) {
    if (!guildID) {
      throw new BadRequestException('guildID query parameter is required.');
    }

    let guild;
    try {
      guild = await this.client.guilds.fetch(guildID);
    } catch (error) {
      throw new NotFoundException('Guild not found.');
    }

    const player = this.playerManager.get(guildID);
    if (!player) {
      throw new NotFoundException('Player not found for the specified guild.');
    }

    return {
      current: { track: player.queue.current, time: player.lastPosition },
      previousTrack: player.queue.previous[0],
      repeatMode: player.repeatMode,
      playing: player.playing,
      tracks: player.queue.tracks ?? [],
    };
  }

  @Post('player/move')
  async moveTrack(@Body() data: { guildID: string; position: { from: number; to: number } }) {
    const { guildID, position } = data;

    if (!guildID || !position) {
      throw new BadRequestException('guildID and position query parameter is required.');
    }

    const player = this.playerManager.get(guildID);
    if (!player) {
      throw new NotFoundException('Player not found for the specified guild.');
    }

    try {
      const track = player.queue.tracks.at(position.from);
      player.queue.tracks.splice(position.to, 0, track);
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException('Failed to move track.');
    }
  }

  @Post('player/skip-back')
  async skipBack(@Body() data: { guildID: string }) {
    const { guildID } = data;

    if (!guildID) {
      throw new BadRequestException('guildID query parameter is required.');
    }

    const player = this.playerManager.get(guildID);
    if (!player) {
      throw new NotFoundException('Player not found for the specified guild.');
    }

    const previousTrack = player.queue.previous[0];
    if (!previousTrack) {
      throw new BadRequestException('No previous track available to skip back to.');
    }

    player.queue.tracks.unshift(previousTrack);

    player.skip(0, false);

    return { statuscode: HttpStatus.OK, message: 'Previous track added to the queue.' };
  }

  @Post('player/skip-track')
  async skipTrack(@Body() data: { guildID: string }) {
    const { guildID } = data;

    if (!guildID) {
      throw new BadRequestException('guildID query parameter is required.');
    }

    const player = this.playerManager.get(guildID);
    if (!player) {
      throw new NotFoundException('Player not found for the specified guild.');
    }

    if (!player.queue.current) {
      throw new BadRequestException('No track currently playing.');
    }

    player.skip(0, false);

    return { statuscode: HttpStatus.OK, message: 'Track skipped.' };
  }

  @Post('player/shuffle')
  async shuffle(@Body() data: { guildID: string }) {
    const { guildID } = data;

    if (!guildID) {
      throw new BadRequestException('guildID query parameter is required.');
    }

    const player = this.playerManager.get(guildID);
    if (!player) {
      throw new NotFoundException('Player not found for the specified guild.');
    }

    await player.queue.shuffle();

    return { statuscode: HttpStatus.OK, message: 'Track skipped.' };
  }

  @Post('aniver')
  async runAniverJob() {
    await this.discordService.aniverJob();
    return {
      statusCode: HttpStatus.OK,
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
