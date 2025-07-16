// src/common/filters/forbidden-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, ForbiddenException, Logger } from '@nestjs/common';
import { ChatInputCommandInteraction } from 'discord.js';
import { EmbedService } from '../services/discord/embed/embed.service';

@Catch(ForbiddenException)
export class ForbiddenExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ForbiddenExceptionFilter');

  constructor(private readonly embedService: EmbedService) {} // Inject your embed service

  async catch(exception: ForbiddenException, host: ArgumentsHost) {
    const interaction = host.getArgByIndex(0)[0] as ChatInputCommandInteraction;

    const errorMessage = exception.message;

    if (!interaction || !interaction.followUp) {
      this.logger.error('Caught ForbiddenException but could not find a valid interaction');
      return;
    }
    
    this.logger.warn(
        `Guard denied command /${interaction.commandName} for ${interaction.user.tag}: ${errorMessage}`
    );

    try {
      await interaction.followUp({
        embeds: [this.embedService.Error({ title: errorMessage })],
        ephemeral: true,
      });
    } catch (e) {
      this.logger.error('Failed to send follow-up message in ForbiddenExceptionFilter', e);
    }
  }
}
