'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Trash2 } from 'lucide-react';
import heic2any from 'heic2any';
import type { User, SkillLevel } from '@/lib/types';
import { SKILL_LEVEL_LABELS } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';

const HEIC_TYPES = ['image/heic', 'image/heif'];

async function convertHeicToJpeg(file: File): Promise<File> {
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], name, { type: 'image/jpeg' });
}

interface EditProfileFormProps {
  user: User;
  isAdmin: boolean;
  isOwnProfile: boolean;
}

export function EditProfileForm({ user, isAdmin, isOwnProfile }: EditProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) {
      e.target.value = '';
      return;
    }

    setAvatarLoading(true);
    setError('');

    let fileToUpload: File = file;
    if ((HEIC_TYPES.includes(file.type) || /\.(heic|heif)$/i.test(file.name)) && file.type !== '') {
      try {
        fileToUpload = await convertHeicToJpeg(file);
      } catch {
        // Client conversion failed (e.g. Brave on iOS) - upload original HEIC, server will convert
        fileToUpload = file;
      }
    }

    const formData = new FormData();
    formData.append('avatar', fileToUpload);

    try {
      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
        credentials: 'same-origin',
      });

      const text = await res.text();
      let data: { success?: boolean; avatar?: string; error?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? 'Risposta non valida' : `Errore server (${res.status})`);
        return;
      }

      if (data.success && data.avatar) {
        setAvatarPreview(`${data.avatar}?v=${Date.now()}`);
        router.refresh();
      } else {
        setError(data.error || 'Errore durante il caricamento');
      }
    } catch {
      setError('Errore di connessione. Controlla la rete.');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  }

  async function handleAvatarDelete() {
    if (!confirm('Vuoi rimuovere la foto profilo?')) return;

    setAvatarLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setAvatarPreview(null);
        router.refresh();
      } else {
        setError(data.error || 'Errore durante la rimozione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          full_name: formData.get('full_name'),
          nickname: formData.get('nickname'),
          role: isAdmin ? formData.get('role') : undefined,
          skill_level: isAdmin ? (formData.get('skill_level') || null) : undefined,
          bio: isOwnProfile ? (formData.get('bio') || null) : undefined,
          preferred_side: (isOwnProfile || isAdmin) ? (formData.get('preferred_side') || null) : undefined,
          preferred_hand: (isOwnProfile || isAdmin) ? (formData.get('preferred_hand') || null) : undefined,
          new_password: formData.get('new_password') || undefined,
        }),
        cache: 'no-store',
      });

      const text = await res.text();
      let data: { success?: boolean; error?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? 'Risposta non valida' : `Errore server (${res.status})`);
        return;
      }

      if (data.success) {
        setSuccess('Profilo aggiornato');
        setError('');
        router.refresh();
      } else {
        setError(data.error || 'Errore durante l\'aggiornamento');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Modifica Profilo</h2>
      
      {/* Avatar upload */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Avatar 
            src={avatarPreview} 
            name={user.nickname || user.full_name || user.username} 
            size="xl" 
          />
          {avatarLoading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="btn btn-secondary text-sm flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Cambia foto
          </button>
          {avatarPreview && (
            <button
              type="button"
              onClick={handleAvatarDelete}
              disabled={avatarLoading}
              className="btn btn-secondary text-sm flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Rimuovi
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo
            </label>
            <input 
              name="full_name" 
              type="text" 
              defaultValue={user.full_name || ''} 
              className="input" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nickname
            </label>
            <input 
              name="nickname" 
              type="text" 
              defaultValue={user.nickname || ''} 
              className="input" 
            />
          </div>
        </div>

        {isAdmin && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ruolo
              </label>
              <select name="role" defaultValue={user.role} className="input">
                <option value="player">Giocatore</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Livello di Gioco
                <span className="ml-1 text-xs text-slate-600">(nascosto agli altri)</span>
              </label>
              <select name="skill_level" defaultValue={user.skill_level || ''} className="input">
                <option value="">Non assegnato</option>
                {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map(level => (
                  <option key={level} value={level}>{SKILL_LEVEL_LABELS[level]}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Player preferences - editable by owner or admin */}
        {(isAdmin || isOwnProfile) && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lato Campo Preferito
              </label>
              <select name="preferred_side" defaultValue={user.preferred_side || ''} className="input">
                <option value="">Non specificato</option>
                <option value="Destra">Destra</option>
                <option value="Sinistra">Sinistra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mano Preferita
              </label>
              <select name="preferred_hand" defaultValue={user.preferred_hand || ''} className="input">
                <option value="">Non specificato</option>
                <option value="Destra">Destra</option>
                <option value="Sinistra">Sinistra</option>
              </select>
            </div>
          </div>
        )}

        {/* Bio - only editable by profile owner (not admin unless it's their own profile) */}
        {isOwnProfile && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bio
            </label>
            <textarea
              name="bio"
              rows={4}
              defaultValue={user.bio || ''}
              className="input resize-none"
              placeholder="Scrivi qualcosa su di te..."
            />
          </div>
        )}

        {(isAdmin || isOwnProfile) && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nuova Password (lascia vuoto per non cambiare)
            </label>
            <input 
              name="new_password" 
              type="password" 
              className="input" 
              placeholder="••••••••"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Salvataggio...' : 'Salva Modifiche'}
        </button>
      </form>
    </div>
  );
}
