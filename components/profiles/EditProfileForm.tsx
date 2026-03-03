'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Trash2 } from 'lucide-react';
import heic2any from 'heic2any';
import type { User, SkillLevel } from '@/lib/types';
import { SKILL_LEVEL_LABELS } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { BirthDateEditor } from '@/components/profiles/BirthDateEditor';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';

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
          overall_score: isAdmin ? (formData.get('overall_score') === '' ? null : Number(formData.get('overall_score'))) : undefined,
          bio: isOwnProfile ? (formData.get('bio') || null) : undefined,
          preferred_side: (isOwnProfile || isAdmin) ? (formData.get('preferred_side') || null) : undefined,
          preferred_hand: (isOwnProfile || isAdmin) ? (formData.get('preferred_hand') || null) : undefined,
          birth_date: (isOwnProfile || isAdmin) ? (formData.get('birth_date') as string) || null : undefined,
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
    <Card className="p-6">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Modifica profilo</h2>

      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'edit-profile-error' : undefined}>
        {/* Avatar upload + Data di nascita (a destra) */}
        <div className="flex flex-wrap items-start gap-6 mb-6">
          <div className="flex items-center gap-4">
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
          <BirthDateEditor
            userId={user.id}
            birthDate={user.birth_date}
            canEdit={isAdmin || isOwnProfile}
            embedded
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField id="full_name" label="Nome completo">
            <input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={user.full_name || ''}
              className="input"
              autoComplete="name"
            />
          </FormField>
          <FormField id="nickname" label="Nickname">
            <input
              id="nickname"
              name="nickname"
              type="text"
              defaultValue={user.nickname || ''}
              className="input"
              autoComplete="nickname"
            />
          </FormField>
        </div>

        {isAdmin && (
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField id="role" label="Ruolo">
              <select id="role" name="role" defaultValue={user.role} className="input">
                <option value="player">Giocatore</option>
                <option value="admin">Admin</option>
              </select>
            </FormField>
            <FormField
              id="overall_score"
              label="Punteggio overall (0-100)"
              description="Valore indicativo del livello complessivo di gioco."
            >
              <input
                id="overall_score"
                name="overall_score"
                type="number"
                min={0}
                max={100}
                defaultValue={user.overall_score ?? ''}
                className="input w-24"
                placeholder="50"
              />
            </FormField>
            <FormField
              id="skill_level"
              label="Livello di gioco"
              description="Derivato automaticamente dal punteggio overall."
            >
              <select id="skill_level" name="skill_level" defaultValue={user.skill_level || ''} className="input" disabled>
                <option value="">Non assegnato</option>
                {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map(level => (
                  <option key={level} value={level}>{SKILL_LEVEL_LABELS[level]}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        {/* Player preferences - editable by owner or admin */}
        {(isAdmin || isOwnProfile) && (
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField id="preferred_side" label="Lato campo preferito">
              <select
                id="preferred_side"
                name="preferred_side"
                defaultValue={user.preferred_side || ''}
                className="input"
              >
                <option value="">Non specificato</option>
                <option value="Destra">Destra</option>
                <option value="Sinistra">Sinistra</option>
              </select>
            </FormField>
            <FormField id="preferred_hand" label="Mano preferita">
              <select
                id="preferred_hand"
                name="preferred_hand"
                defaultValue={user.preferred_hand || ''}
                className="input"
              >
                <option value="">Non specificato</option>
                <option value="Destra">Destra</option>
                <option value="Sinistra">Sinistra</option>
              </select>
            </FormField>
          </div>
        )}

        {/* Bio - only editable by profile owner (not admin unless it's their own profile) */}
        {isOwnProfile && (
          <FormField
            id="bio"
            label="Bio"
            description="Una breve descrizione che verrà mostrata nel tuo profilo pubblico."
          >
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={user.bio || ''}
              className="input resize-none"
              placeholder="Scrivi qualcosa su di te..."
            />
          </FormField>
        )}

        {(isAdmin || isOwnProfile) && (
          <FormField
            id="new_password"
            label="Nuova password"
            description="Lascia vuoto se non vuoi modificare la password."
          >
            <input
              id="new_password"
              name="new_password"
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </FormField>
        )}

        {error && (
          <p id="edit-profile-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400" role="status">
            {success}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Salvataggio...' : 'Salva Modifiche'}
        </button>
      </form>
    </Card>
  );
}
