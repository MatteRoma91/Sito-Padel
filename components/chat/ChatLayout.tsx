'use client';

import { useState } from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';

export function ChatLayout() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] min-h-[400px] gap-4">
      <div className="w-full md:w-72 flex-shrink-0 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <ConversationList
          activeId={activeConversationId}
          onSelect={setActiveConversationId}
        />
      </div>
      <div className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <ChatWindow
          conversationId={activeConversationId}
          onClose={() => setActiveConversationId(null)}
        />
      </div>
    </div>
  );
}
