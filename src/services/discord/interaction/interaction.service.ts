import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext, Options } from 'necord';
import { MemberDto } from './options/string.dto';
import { BirthdayService } from './birthday/birthday.service';

import * as fs from 'fs';

@Injectable()
export class InteractionService {
  private readonly aniverJson : any;
  constructor(private birthdayService : BirthdayService) {
    try {
      const rawdata = fs.readFileSync('./src/json/Undergrounds.json', 'utf8');
      this.aniverJson = JSON.parse(rawdata);
    } catch (error) {
      console.error('Error reading JSON file:', error);
    }
  }

  @SlashCommand({
    name: 'aniver',
    description: 'Dias para o aniversário',
  })
  public async aniver(@Context() [interaction]: SlashCommandContext, @Options() { memberName } : MemberDto) {
    const member = this.aniverJson.find((e : {userName: string}) => e.userName === memberName)
    if (!member) return interaction.reply({ content: "Não existe essa pessoa 😥" });
    const message = this.birthdayService.getNumberOfDays({ month: member.aniverMonth, day: member.aniverDay }, memberName);
    return interaction.reply({ content: message, });
  }

  @SlashCommand({
    name: 'proxaniver',
    description: 'Dias para o aniversário',
  })
  public async proxAniver(@Context() [interaction]: SlashCommandContext) {
    const birthdayEmbed = await this.birthdayService.nextBirthdaysEmbed(this.aniverJson);
    interaction.reply({ embeds: [birthdayEmbed]}); 
  }

}
