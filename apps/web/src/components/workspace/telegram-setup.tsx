"use client";

import { useState } from "react";
import { TelegramLogoIcon } from "@phosphor-icons/react";
import { Input } from "@monokeros/ui";

interface TelegramSetupProps {
  token: string;
  onTokenChange: (token: string) => void;
}

export function TelegramSetup({ token, onTokenChange }: TelegramSetupProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-fg-3">
        Communication
      </label>
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 p-2 rounded-md border border-edge bg-surface-2">
          <TelegramLogoIcon size={18} className="text-[#0088cc] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-fg">Telegram</div>
            <div className="text-[10px] text-fg-3">Connect your Telegram bot</div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue hover:underline shrink-0"
          >
            {expanded ? "Cancel" : "Setup"}
          </button>
        </div>
        {expanded && (
          <div className="pl-7 space-y-1">
            <Input
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="123456:ABC-DEF..."
            />
            <p className="text-xs text-fg-3">Get a token from @BotFather on Telegram</p>
          </div>
        )}
      </div>
    </div>
  );
}
