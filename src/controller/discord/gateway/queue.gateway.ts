import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsResponse,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { GuildQueue, useQueue } from 'discord-player';
import { QueueJson } from '../../../services/discord/music/music-event/music-event.service'
import { Client } from 'discord.js';
// IMPORTANT FIX THE CLIENT IDDDD
// IMPORTANT FIX THE CLIENT IDDDD
// IMPORTANT FIX THE CLIENT IDDDD
// IMPORTANT FIX THE CLIENT IDDDD
// IMPORTANT FIX THE CLIENT IDDDD
@WebSocketGateway(4000, {
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class QueueUpdatesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor() {}

  handleConnection(client: Socket, ...args: any[]) {
    console.log('Client Connected: ', client.id)

    // client.once('message', (message: string) => {
    //   const data = JSON.parse(message);
    //   const clientID = data.clientID;
    //   this.clientService.addClient(clientID, client);
    //   console.log('Added client ID: ', clientID)
    // });
  }

  @SubscribeMessage('message')
  handleEvent(@MessageBody() data: any): string {
    return `recebido: ${data.guild}`;
  }

  @SubscribeMessage('getQueue')
  async handleGetQueue(@MessageBody() data: any) {
    // const guild = await this.client.guilds.fetch(data.guild)
    // const queue = useQueue(guild)
    // console.log('null? ', queue)
    // if (queue === null) return {currentTrack: '', tracks: []}
    // return { currentTrack: queue.currentTrack, tracks: queue.tracks };
  }

  handleDisconnect(client: Socket, ...args: any[]) {
    console.log('Client disconnected:', client.id);
  }

  emitQueueUpdate(queueUpdate: any) {
    this.server.emit('queueUpdate', queueUpdate);
  }

  emitMessage(type: string, message: any) {
    console.log('mandando');
    this.server.emit('queue', { type: type, message: message });
  }
  
  queueUpdate(id: string, queue: QueueJson) {
    this.server.emit(`queueUpdate:${id}`, queue)
  }
}
