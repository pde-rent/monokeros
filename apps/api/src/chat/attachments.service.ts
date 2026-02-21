import { Injectable } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { generateId, mimeFromExt } from '@monokeros/utils';
import type { MessageAttachment, Conversation } from '@monokeros/types';

@Injectable()
export class AttachmentsService {
  constructor(private store: MockStore) {}

  /** Resolve the storage directory for an attachment based on conversation type */
  resolveStoragePath(conversation: Conversation, fileName: string): string {
    if (conversation.type === 'project_chat' && conversation.projectId) {
      return `data/projects/${conversation.projectId}/chat/attachments/${fileName}`;
    }
    return `data/conversations/${conversation.id}/attachments/${fileName}`;
  }

  /** Create an attachment record (mock - no actual file storage) */
  createAttachment(
    conversation: Conversation,
    fileName: string,
    fileSize: number,
    mimeType?: string,
  ): MessageAttachment {
    const resolvedMime = mimeType || mimeFromExt(fileName);
    const storagePath = this.resolveStoragePath(conversation, fileName);

    return {
      id: generateId('att'),
      fileName,
      fileSize,
      mimeType: resolvedMime,
      storagePath,
    };
  }
}
