import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface FlowExecutionEvent {
  type: 'flow_started' | 'flow_completed' | 'flow_failed' | 'step_started' | 'step_completed' | 'step_failed';
  runId: string;
  timestamp: Date;
  data: any;
}

export interface StepExecutionEvent extends FlowExecutionEvent {
  type: 'step_started' | 'step_completed' | 'step_failed';
  stepIndex: number;
  stepName: string;
}

export interface FlowProgressUpdate {
  runId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep?: number;
  status: 'running' | 'completed' | 'failed';
  progressPercentage: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/execution',
})
export class ExecutionEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ExecutionEventsGateway.name);
  private readonly connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    client.emit('connection_established', {
      message: 'Successfully connected to execution events',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe_to_run')
  handleSubscribeToRun(
    @MessageBody() data: { runId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { runId } = data;
    this.logger.log(`Client ${client.id} subscribing to run ${runId}`);

    // Join the client to a room for this specific run
    client.join(`run:${runId}`);

    client.emit('subscribed', {
      message: `Subscribed to updates for run ${runId}`,
      runId,
    });
  }

  @SubscribeMessage('unsubscribe_from_run')
  handleUnsubscribeFromRun(
    @MessageBody() data: { runId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { runId } = data;
    this.logger.log(`Client ${client.id} unsubscribing from run ${runId}`);

    client.leave(`run:${runId}`);

    client.emit('unsubscribed', {
      message: `Unsubscribed from updates for run ${runId}`,
      runId,
    });
  }

  // Methods to broadcast events to clients

  broadcastFlowStarted(runId: string, data: any) {
    const event: FlowExecutionEvent = {
      type: 'flow_started',
      runId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`run:${runId}`).emit('flow_event', event);
    this.logger.debug(`Broadcasted flow_started for run ${runId}`);
  }

  broadcastFlowCompleted(runId: string, data: any) {
    const event: FlowExecutionEvent = {
      type: 'flow_completed',
      runId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`run:${runId}`).emit('flow_event', event);
    this.logger.debug(`Broadcasted flow_completed for run ${runId}`);
  }

  broadcastFlowFailed(runId: string, data: any) {
    const event: FlowExecutionEvent = {
      type: 'flow_failed',
      runId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`run:${runId}`).emit('flow_event', event);
    this.logger.debug(`Broadcasted flow_failed for run ${runId}`);
  }

  broadcastStepStarted(runId: string, stepIndex: number, stepName: string, data: any) {
    const event: StepExecutionEvent = {
      type: 'step_started',
      runId,
      stepIndex,
      stepName,
      timestamp: new Date(),
      data,
    };

    this.server.to(`run:${runId}`).emit('step_event', event);
    this.logger.debug(`Broadcasted step_started for run ${runId}, step ${stepIndex}`);
  }

  broadcastStepCompleted(runId: string, stepIndex: number, stepName: string, data: any) {
    const event: StepExecutionEvent = {
      type: 'step_completed',
      runId,
      stepIndex,
      stepName,
      timestamp: new Date(),
      data,
    };

    this.server.to(`run:${runId}`).emit('step_event', event);
    this.logger.debug(`Broadcasted step_completed for run ${runId}, step ${stepIndex}`);
  }

  broadcastStepFailed(runId: string, stepIndex: number, stepName: string, data: any) {
    const event: StepExecutionEvent = {
      type: 'step_failed',
      runId,
      stepIndex,
      stepName,
      timestamp: new Date(),
      data,
    };

    this.server.to(`run:${runId}`).emit('step_event', event);
    this.logger.debug(`Broadcasted step_failed for run ${runId}, step ${stepIndex}`);
  }

  broadcastProgressUpdate(progressUpdate: FlowProgressUpdate) {
    this.server.to(`run:${progressUpdate.runId}`).emit('progress_update', progressUpdate);
    this.logger.debug(`Broadcasted progress update for run ${progressUpdate.runId}: ${progressUpdate.progressPercentage}%`);
  }

  // Utility methods

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getClientsSubscribedToRun(runId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`run:${runId}`);
    return room ? room.size : 0;
  }

  // Broadcast to all connected clients (for system-wide messages)
  broadcastSystemMessage(message: string, data?: any) {
    this.server.emit('system_message', {
      message,
      timestamp: new Date(),
      data,
    });
    this.logger.log(`Broadcasted system message: ${message}`);
  }
}