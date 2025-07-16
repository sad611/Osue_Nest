import { PlayerManager } from '@necord/lavalink';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { EmbedService } from '../../embed/embed.service';
import { MusicCommandPreconditionsOptions, MUSIC_PRECONDITIONS_KEY } from './music.preconditions.decorator';
import { SlashCommandContext } from 'necord';
import { MessageFlags, VoiceBasedChannel } from 'discord.js';

import { Player } from 'lavalink-client/dist/types';

type PreconditionContext = {
  player?: Player;
  voiceChannel?: VoiceBasedChannel;
};

type PreconditionCheck = {
  key: keyof MusicCommandPreconditionsOptions;
  validate: (ctx: PreconditionContext) => boolean;
  message: string;
};

@Injectable()
export class MusicCommandGuard implements CanActivate {
  private readonly logger = new Logger(MusicCommandGuard.name);

  private readonly preconditionChecks: PreconditionCheck[] = [
    {
      key: 'requiresVoiceChannel',
      validate: ({ voiceChannel }) => !voiceChannel,
      message: 'You must be in a voice channel to use this command.',
    },
    {
      key: 'requiresSameVoiceChannel',
      validate: ({ player, voiceChannel }) =>
        !voiceChannel || (player?.voiceChannelId && player.voiceChannelId !== voiceChannel.id),
      message: 'You must be in the same voice channel as the bot.',
    },
    {
      key: 'requiresPlayer',
      validate: ({ player }) => !player,
      message: `There's no player for this guild. Use '/music play' to start a player.`,
    },
    {
      key: 'requiresPlayerPlaying',
      validate: ({ player }) => !player || !player.playing,
      message: 'The player is not currently playing.',
    },
    {
      key: 'requiresPlayerPaused',
      validate: ({ player }) => !player || !player.paused,
      message: 'The player is not paused.',
    },
    {
      key: 'requiresPlayerNotPaused',
      validate: ({ player }) => !player || player.paused,
      message: 'The player is already paused.',
    },
    {
      key: 'requiresQueueNotEmpty',
      validate: ({ player }) => !player || player.queue.tracks.length === 0,
      message: 'The queue is empty.',
    },
    {
      key: 'requiresCurrentTrack',
      validate: ({ player }) => !player || !player.queue.current,
      message: 'There is no current track playing.',
    },
  ];

  private readonly conditionsMap: Record<keyof MusicCommandPreconditionsOptions, PreconditionCheck>;

  constructor(
    private readonly reflector: Reflector,
    private readonly playerManager: PlayerManager,
    private readonly embedService: EmbedService,
  ) {
    this.conditionsMap = this.preconditionChecks.reduce(
      (map, check) => {
        map[check.key] = check;
        return map;
      },
      {} as Record<keyof MusicCommandPreconditionsOptions, PreconditionCheck>,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const preconditions = this.reflector.get<MusicCommandPreconditionsOptions>(
      MUSIC_PRECONDITIONS_KEY,
      context.getHandler(),
    );

    if (!preconditions) {
      return true;
    }

    const [interaction] = context.getArgByIndex(0) as SlashCommandContext;

    if (!interaction?.isChatInputCommand()) {
      return false;
    }

    const replyType = preconditions.replyType || 'ephemeral';

    if (replyType && !interaction.deferred && !interaction.replied) {
      try {
        if (replyType === 'public') {
          await interaction.deferReply();
        } else {
          await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }
      } catch (error) {
        this.logger.error('Failed to defer reply in guard. The command will fail.', error);
        return false;
      }
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;
    const player = this.playerManager.get(interaction.guild.id);

    const checkContext: PreconditionContext = { voiceChannel, player };

    (interaction as any).guildPlayer = player;
    (interaction as any).memberVoiceChannel = voiceChannel;

    // if (preconditions.requiresPlayerContext) {
    //   if (!checkContext.voiceChannel) {
    //     throw new ForbiddenException('You must be in a voice channel.');
    //   }
    //   if (checkContext.player && checkContext.player.voiceChannel !== checkContext.voiceChannel) {
    //     throw new ForbiddenException('You must be in the same voice channel as the bot.');
    //   }
    // }

    for (const key of Object.keys(preconditions) as (keyof MusicCommandPreconditionsOptions)[]) {
      
      const check = this.conditionsMap[key];
      if (check && check.validate(checkContext)) {
        throw new ForbiddenException(check.message);
      }
    }

    // for (const check of this.preconditionChecks) {
    //   console.log(preconditions[check.key]);
    //   if (preconditions[check.key] && check.validate(checkContext)) {
    //     throw new ForbiddenException(check.message);
    //   }
    // }
    return true;
  }
}
