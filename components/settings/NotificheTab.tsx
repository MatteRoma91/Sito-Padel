'use client';

import { Bell } from 'lucide-react';
import { PushNotificationsPrompt } from '@/components/notifications/PushNotificationsPrompt';

export function NotificheTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <Bell className="w-5 h-5 text-accent-500" />
        <p className="text-sm">
          Ricevi avvisi su nuovi tornei, iscrizioni aperte, promemoria prima della tappa e torneo completato (se abiliti le
          notifiche del browser).
        </p>
      </div>
      <PushNotificationsPrompt />
    </div>
  );
}
