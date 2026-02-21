import { SectionHeader } from '@monokeros/ui';

interface Props {
  title: string;
  onClose: () => void;
}

export function PanelHeader({ title, onClose }: Props) {
  return <SectionHeader title={title} onClose={onClose} className="px-3 py-2" />;
}
