import { WebSocketGateway } from '@nestjs/websockets';
import { Task, TaskStatus, WS_EVENTS } from '@monokeros/types';
import { BaseGateway } from '../common/base.gateway';

@WebSocketGateway()
export class TasksGateway extends BaseGateway {
  emitTaskCreated(task: Task) {
    this.emit(WS_EVENTS.task.created, { task });
  }

  emitTaskUpdated(task: Task) {
    this.emit(WS_EVENTS.task.updated, { task });
  }

  emitTaskMoved(taskId: string, from: TaskStatus, to: TaskStatus) {
    this.emit(WS_EVENTS.task.moved, { taskId, from, to });
  }
}
