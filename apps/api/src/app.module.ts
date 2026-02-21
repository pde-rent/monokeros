import { Module } from '@nestjs/common';
import { MockStoreModule } from './store/store.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ChatModule } from './chat/chat.module';
import { FilesModule } from './files/files.module';
import { RenderModule } from './render/render.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { TemplatesModule } from './templates/templates.module';
import { ModelsModule } from './models/models.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IdentityModule } from './identity/identity.module';
import { TelegramModule } from './telegram/telegram.module';
import { DocsModule } from './docs/docs.module';
import { MermaidModule } from './mermaid/mermaid.module';

@Module({
  imports: [
    MermaidModule,
    MockStoreModule,
    AuthModule,
    ModelsModule,
    MembersModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    ChatModule,
    FilesModule,
    RenderModule,
    WorkspaceModule,
    KnowledgeModule,
    TemplatesModule,
    NotificationsModule,
    IdentityModule,
    TelegramModule,
    DocsModule,
  ],
})
export class AppModule {}
