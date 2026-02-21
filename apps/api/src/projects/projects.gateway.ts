import { WebSocketGateway } from '@nestjs/websockets';
import { SDLCGate, WS_EVENTS } from '@monokeros/types';
import { BaseGateway } from '../common/base.gateway';

@WebSocketGateway()
export class ProjectsGateway extends BaseGateway {
  emitGateUpdated(projectId: string, gate: SDLCGate) {
    this.emit(WS_EVENTS.project.gateUpdated, { projectId, gate });
  }
}
