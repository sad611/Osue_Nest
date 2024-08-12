import { Injectable, Logger } from '@nestjs/common';
import { createCommandGroupDecorator } from 'necord';
import { InjectModel } from '@nestjs/mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { Model } from 'mongoose';

@Injectable()
export class MongodbService {
  private readonly logger = new Logger(MongodbService.name);

  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
  ) {}

  async saveRole(
    guild: { name: string; ID: string },
    role: { name: string; ID: string; hex: string },
    user: { name: string; ID: string },
  ): Promise<Role> {
    const createdRole = new this.roleModel({ guild, role, user });
    return createdRole.save();
  }

  async saveMessage(
    guild: { name: string; ID: string },
    message: { name: string; ID: string; hex: string },
    roles: { name: string; ID: string },
  ) {
    const createdMessage = new this.messageModel({ guild, message, roles})
    return createdMessage.save();
  }

  async getRolesByGuildID(guildID: string): Promise<Role[] | null> {
    return await this.roleModel.find({ 'guild.ID': guildID }).exec();
  }

  async getRoleAndUserByName(guildID: string, roleName: string): Promise<any | null> {
    const result = await this.roleModel
      .findOne({ 'guild.ID': guildID, 'role.name': roleName }, { role: 1, user: 1 })
      .exec();
    return result ? { role: result.role, user: result.user } : null;
  }

  async deleteRoleByName(guildID: string, roleName: string) {
    return this.roleModel.deleteOne({ 'guild.ID': guildID, 'role.name': roleName });
  }
}
