import { Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';

const EmbedColor = {
  Success: 0x00fa9a,
  Error: 0xff2a16,
  Warning: 0xffd700,
  Info: 0x0099ff,
};

type EmbedInit = ConstructorParameters<typeof EmbedBuilder>[0];

@Injectable()
export class EmbedService extends EmbedBuilder {
  public Error(data?: EmbedInit) {
    return EmbedService.create(data).setColor(EmbedColor.Error);
  }

  public Success(data?: EmbedInit) {
    return EmbedService.create(data).setColor(EmbedColor.Success);
  }

  public Warning(data?: EmbedInit) {
    return EmbedService.create(data).setColor(EmbedColor.Warning);
  }

  public Info(data?: EmbedInit) {
    return EmbedService.create(data).setColor(EmbedColor.Info);
  }

  public static create(data?: EmbedInit) {
    return new EmbedService(data);
  }

  public withAuthor(author: any) {
    return this.setAuthor({
      name: author.username,
      iconURL: author.displayAvatarURL(),
    });
  }
}
