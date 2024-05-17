import { Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';

interface BirthdayDate {
  month: number;
  day: number;
}

@Injectable()
export class BirthdayService {
  getNumberOfDays(birthday: BirthdayDate, birthdayPerson: string): string {
    const today = new Date();
    const oneDay = 1000 * 60 * 60 * 24;

    const currentYearBirthday = new Date(today.getFullYear(), birthday.month, birthday.day);

    if (currentYearBirthday < today) {
      currentYearBirthday.setFullYear(currentYearBirthday.getFullYear() + 1);
    }

    const diffInTime = currentYearBirthday.getTime() - today.getTime();

    let diffInDays = Math.floor(diffInTime / oneDay);
    diffInDays = Math.abs(diffInDays);

    if (diffInDays === 0) {
      return `Aniversário do(a) ${birthdayPerson} é hoje!!!🥳`;
    }

    return diffInDays > 1
      ? `remainingm ${diffInDays} dias pro aniversário do(a) ${birthdayPerson}!!! 🥳`
      : `remaining ${diffInDays} dia pro aniversário do(a) ${birthdayPerson}!!! 🥳`;
  }

  async nextBirthdaysEmbed(jason: any): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder().setTitle('Próximos Aniversários 🥳🎉').setColor('#0099ff');
    const today = new Date();
    const Datas = jason
      .map(({ userName, aniverMonth, aniverDay }) => {
        const date = new Date(today.getFullYear(), aniverMonth, aniverDay);
        return { name: userName, date: date };
      })
      .filter(({ name }) => name !== undefined)
      .map(({ name, date }) => {
        let dif = date.getTime() - today.getTime();
        let time = dif / (1000 * 3600 * 24);

        if (time < 0) {
          time = time + 365;
        }
        return { name, time };
      })
      .sort((a: { time: number }, b: { time: number }) => a.time - b.time)
      .slice(0, 5);

    const valor = Datas.map(({ name, time }: { name: string; time: number }, index: number) => {
      return `${index + 1} - ${name} ${Math.ceil(time)} ${Math.ceil(time) === 1 ? 'dia' : 'dias'}`;
    }).join('\n');

    embed.setDescription(valor);
    return embed;
  }
}
