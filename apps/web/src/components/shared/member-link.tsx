"use client";

import type { Member } from "@monokeros/types";
import { useTeams } from "@/hooks/use-queries";
import { useAgencyNavigation } from "@/hooks/use-agency-navigation";
import { getTeamColor } from "@monokeros/constants";
import { EntityLink } from "@monokeros/ui";

interface Props {
  member: Member;
  size?: "sm" | "md";
  showAvatar?: boolean;
}

export function MemberLink({ member, size = "sm", showAvatar = true }: Props) {
  const { data: teams } = useTeams();
  const { goToAgentDiagram, goToAgentConsole } = useAgencyNavigation();

  const team = teams?.find((t) => t.id === member.teamId);
  const color = getTeamColor(team);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (e.shiftKey) {
      goToAgentConsole(member.id);
    } else {
      goToAgentDiagram(member.id);
    }
  }

  return (
    <EntityLink
      label={member.name}
      onClick={handleClick}
      secondaryInfo={member.title}
      color={color}
      size={size}
      showAvatar={showAvatar}
      avatarUrl={member.avatarUrl ?? undefined}
      title={`${member.name} - ${member.title} (Click: Diagram, Shift+Click: Console)`}
    />
  );
}
