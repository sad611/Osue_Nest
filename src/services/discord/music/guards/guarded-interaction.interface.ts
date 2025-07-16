import { Player } from 'lavalink-client/dist/types';
import { ChatInputCommandInteraction, CacheType, VoiceBasedChannel } from "discord.js";

export interface GuardedInteraction extends ChatInputCommandInteraction<CacheType> {
  memberVoiceChannel?: VoiceBasedChannel;  
  guildPlayer?: Player;
}