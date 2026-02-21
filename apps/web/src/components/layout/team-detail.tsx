import { CrownIcon } from '@phosphor-icons/react';
import { StatusIndicator, ColorDot, PanelSection } from '@monokeros/ui';
import type { Member, Team } from '@monokeros/types';

export function TeamDetail({ team, members }: { team: Team; members: Member[] }) {
  return (
    <>
      <PanelSection>
        <div className="flex items-center gap-1.5">
          <ColorDot color={team.color} />
          <span className="text-xs font-semibold text-fg">{team.name}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-fg-2">{members.length} members</div>
      </PanelSection>

      {members.map((member) => (
        <PanelSection key={member.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <StatusIndicator status={member.status} size="sm" />
              <span className="text-[10px] text-fg">{member.name}</span>
              {member.isLead && <CrownIcon size={10} weight="fill" className="text-yellow" />}
            </div>
            <span className="text-[9px] text-fg-2">{member.title}</span>
          </div>
        </PanelSection>
      ))}
    </>
  );
}
