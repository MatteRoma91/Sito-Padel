import { getCurrentUser, canEdit } from '@/lib/auth';
import { MessageCircle } from 'lucide-react';
import { ChatLayoutLazy as ChatLayout } from '@/components/chat/ChatLayoutLazy';

export default async function ChatPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-5xl w-full mx-auto space-y-4">
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-accent-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Chat</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Messaggi privati e chat di gruppo per i tornei
        </p>
      </div>
      <ChatLayout isAdmin={user?.role === 'admin' && !!canEdit(user)} />
    </div>
  );
}
