import { Injectable, Logger } from '@nestjs/common';
import { Context, createCommandGroupDecorator, Options, SlashCommandContext, Subcommand } from 'necord';
import { RoleSetDto } from '../options/roleSet.dto';
import { RoleGetDto } from '../options/roleGet.dto';
import { ColorService } from '../../color/color.service';
import { MongodbService } from '../../../mongodb/mongodb.service';
import { PermissionsBitField } from 'discord.js';
import { ButtonColorService } from '../../components/button-color/button-color.service';

const UtilsCommands = createCommandGroupDecorator({
  name: 'color',
  description: 'color',
});

@UtilsCommands()
@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly colorService: ColorService,
    private readonly mongoService: MongodbService,
    private readonly buttonColorService: ButtonColorService,
  ) {}

  @Subcommand({ name: 'create', description: 'Creates a color' })
  public async createColor(
    @Context() [interaction]: SlashCommandContext,
    @Options() { roleName, colorHex }: RoleSetDto,
  ) {
    const rgb = this.colorService.hexToRGB(colorHex);

    if (!rgb) {
      return interaction.reply({ content: `Invalid hex ${colorHex}, must be a #XXXXXX`, ephemeral: true });
    }

    const roles = await interaction.guild.roles.fetch();
    if (roles.find((role) => role.name === roleName)) {
      return interaction.reply({ content: 'There already exists a role with that name', ephemeral: true });
    }

    let createdRole: any;

    try {
      createdRole = await interaction.guild.roles.create({
        name: roleName,
        color: rgb,
        reason: `${interaction.user.username} wanted this color`,
      });

      if (!createdRole) {
        return interaction.reply({ content: 'There was an error creating the role', ephemeral: true });
      }

      await this.mongoService.saveRole(
        { name: interaction.guild.name, ID: interaction.guild.id },
        { name: roleName, ID: createdRole.id, hex: colorHex },
        { name: interaction.user.username, ID: interaction.user.id },
      );

      return interaction.reply({ content: `Role created successfully (${roleName}, ${colorHex})`, ephemeral: true });
    } catch (error) {
      this.logger.error('Error creating or saving role:', error);

      if (createdRole) {
        try {
          await createdRole.delete();
          this.logger.log('Rolled back creation of role:', createdRole.id);
        } catch (deleteError) {
          this.logger.error('Error deleting created role:', deleteError);
        }
      }

      return interaction.reply({ content: 'Failed to create role', ephemeral: true });
    }
  }

  @Subcommand({ name: 'remove', description: 'Remove color from user' })
  public async removeRole(@Context() [interaction]: SlashCommandContext, @Options() { roleName }: RoleGetDto) {
    try {
      const member = await interaction.guild.members.fetch(interaction.member.user.id);
      const roleToRemove = member.roles.cache.find((role) => role.name === roleName);

      if (!roleToRemove) {
        return interaction.reply({ content: 'Role not found', ephemeral: true });
      }

      await member.roles.remove(roleToRemove);

      interaction.reply({ content: 'Role removed successfully', ephemeral: true });
    } catch (error) {
      console.error('Error removing role:', error);
      interaction.reply({ content: 'Failed to remove role', ephemeral: true });
    }
  }

  @Subcommand({ name: 'list', description: 'Retuns a color list of this server' })
  public async listRole(@Context() [interaction]: SlashCommandContext) {
    const roles = await this.mongoService.getRolesByGuildID(interaction.guild.id);
    const sliceLength = 30;
    const slicedRoles = roles.slice(0, sliceLength);

    return this.buttonColorService.handleInteraction(interaction, slicedRoles, sliceLength);
  }

  @Subcommand({ name: 'get', description: 'Choose a color to get' })
  public async getRole(@Context() [interaction]: SlashCommandContext, @Options() { roleName }: RoleGetDto) {
    try {
      const guildID = interaction.guild.id;
      const memberID = interaction.user.id;
      const member = await interaction.guild.members.fetch(memberID);
      const result = await this.mongoService.getRoleAndUserByName(guildID, roleName);

      if (!result) {
        return interaction.reply({ content: `Role not found: ${roleName}`, ephemeral: true });
      }
      const { role } = result;
      const roleToGet = await interaction.guild.roles.fetch(role.ID);
      await member.roles.add(roleToGet);
      await interaction.reply({ content: 'Role added to user successfully', ephemeral: true });
    } catch (error) {
      console.error('Error in getRole:', error);
      await interaction.reply({ content: 'An error occurred while adding the role.', ephemeral: true });
    }
  }

  @Subcommand({ name: 'delete', description: 'Deletes color from server' })
  public async deleteRole(@Context() [interaction]: SlashCommandContext, @Options() { roleName }: RoleGetDto) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);

      const { role } = await this.mongoService.getRoleAndUserByName(interaction.guild.id, roleName);

      if (!role) {
        return interaction.reply({ content: `Role not found: ${role.name}`, ephemeral: true });
      }

      if (!member.permissions.has(PermissionsBitField.Flags.Administrator) || interaction.user.id === role.ID) {
        return interaction.reply({
          content: `You don't have the necessary permissions to delete roles.`,
          ephemeral: true,
        });
      }

      const roleDiscord = await interaction.guild.roles.fetch(role.ID);

      await roleDiscord.delete();

      await this.mongoService.deleteRoleByName(interaction.guild.id, roleName);

      return interaction.reply({ content: `Role '${roleName}' deleted successfully.`, ephemeral: true });
    } catch (err) {
      console.error('Error deleting role:', err);
      return interaction.reply({
        content: `An error occurred while deleting the role '${roleName}'.`,
        ephemeral: true,
      });
    }
  }
}
