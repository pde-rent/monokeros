import { WebSocketGateway } from '@nestjs/websockets';
import { MemberStatus, WS_EVENTS } from '@monokeros/types';
import type { Member } from '@monokeros/types';
import { BaseGateway } from '../common/base.gateway';
import { now } from '@monokeros/utils';

@WebSocketGateway()
export class MembersGateway extends BaseGateway {
  emitStatusChanged(memberId: string, status: MemberStatus) {
    this.emit(WS_EVENTS.member.statusChanged, {
      memberId,
      status,
      timestamp: now(),
    });
  }

  emitMemberCreated(member: Member) {
    this.emit(WS_EVENTS.member.created, {
      member,
      timestamp: now(),
    });
  }

  emitMemberUpdated(member: Member) {
    this.emit(WS_EVENTS.member.updated, {
      member,
      timestamp: now(),
    });
  }
}
