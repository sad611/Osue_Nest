import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongodbService } from '../../services/mongodb/mongodb.service';
import { RoleService } from '../../services/discord/interaction/roles/role.service';
import { Role, RoleSchema } from '../../services/mongodb/schemas/role.schema';
import { Message, MessageSchema } from '../../services/mongodb/schemas/message.schema';
import { ColorService } from '../../services/discord/color/color.service';
import { CanvasService } from '../../services/discord/canvas/canvas.service';
import { ButtonColorService } from '../../services/discord/components/button-color/button-color.service';
import { ReactionService } from '../../services/discord/reaction/reaction.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }, { name: Message.name, schema: MessageSchema }]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGO_URI'),
      }),
    }),
  ],
  providers: [MongodbService, RoleService, ColorService, CanvasService, ButtonColorService, ReactionService,  ],
  exports: [MongodbService],
})
export class MongodbModule {}