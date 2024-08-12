import { Injectable, Logger } from '@nestjs/common';
import { Context, createCommandGroupDecorator, SlashCommandContext, Subcommand } from 'necord';
import { MenuService } from '../components/menu/menu.service';
import { MongodbService } from '../../mongodb/mongodb.service';
import { Role } from 'discord.js';

const UtilsCommands = createCommandGroupDecorator({
  name: 'reaction',
  description: 'reaction',
});
@UtilsCommands()
@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);
  constructor(private menuService: MenuService, private mongoService: MongodbService) {}

  @Subcommand({ name: 'register', description: 'Register a message to listen for reactions' })
  public async registerMessage(@Context() [interaction]: SlashCommandContext) {
    // try {
    //   const roles = await interaction.guild.roles.fetch();
    //   const rolesArray = Array.from(roles.values());

    //   rolesArray.map((role: Role) => console.log(role.name, role.id))
    //   const selectMenu = this.menuService.createMessageRoleSelectMenu(rolesArray);


    //   // interaction.reply({
    //   //   content: `Roles: ${rolesArray.map((role) => role.name).join(', ')}`,
    //   //   components: [selectMenu],
    //   //   ephemeral: true,
    //   // });
    // } catch (error) {
    //   this.logger.error('Failed to fetch or process roles', error);
    //   interaction.reply({
    //     content: 'An error occurred while processing roles.',
    //     ephemeral: true,
    //   });
    // }
  }
}
