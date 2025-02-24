import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'necord';
import { OnLavalinkManager, OnNodeManager, LavalinkManagerContextOf, NodeManagerContextOf } from '@necord/lavalink';

@Injectable()
export class AppUpdate {
    private readonly logger = new Logger(AppUpdate.name);

    @OnNodeManager('connect')
    public onReady(@Context() [node]: NodeManagerContextOf<'connect'>) {
        this.logger.log(`Node: ${node.options.id} Connected`);
    }

    @OnLavalinkManager('playerCreate')
    public onPlayerCreate(@Context() [player]: LavalinkManagerContextOf<'playerCreate'>) {
        this.logger.log(`Player created at ${player.guildId}`);
    }
}