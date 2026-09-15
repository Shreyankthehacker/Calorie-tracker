import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFamily, getFamily, joinFamily, leaveFamily } from '../api/family';
import { firstApiErrorMessage } from '../api/errors';
import type { FamilyMemberProfile } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { displayNameFromEmail, initialsFromEmail } from '../lib/user-display';
import { displayTimeZone } from '../lib/timezones';

function memberRole(member: FamilyMemberProfile): string {
  return member.isCurrentUser ? 'You' : 'Member';
}

function formatKcal(value: number): string {
  return `${Math.round(value).toLocaleString()} kcal`;
}

function inviteMessage(familyId: string): string {
  return `Join my household on CalorieTracker. Family ID: ${familyId}`;
}

async function writeClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function FamilyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [joinId, setJoinId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealFamilyId, setRevealFamilyId] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const familyQuery = useQuery({
    queryKey: ['family'],
    queryFn: getFamily,
  });

  const family = familyQuery.data ?? null;
  const members = family?.members ?? [];

  useEffect(() => {
    if (!selectedId && user?.id) {
      setSelectedId(user.id);
    }
  }, [selectedId, user?.id]);

  const selected = members.find((member) => member.id === selectedId) ?? members.find((member) => member.isCurrentUser);

  function onFamilySuccess(message: string) {
    setStatus(message);
    void queryClient.invalidateQueries({ queryKey: ['family'] });
  }

  const createMutation = useMutation({
    mutationFn: () => createFamily(),
    onSuccess: async (created) => {
      setSelectedId(user?.id ?? null);
      onFamilySuccess('Family created.');
      await openShare(created.id);
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => joinFamily(joinId.trim()),
    onSuccess: () => {
      setJoinId('');
      onFamilySuccess('Joined family.');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: leaveFamily,
    onSuccess: () => {
      setSelectedId(user?.id ?? null);
      onFamilySuccess('You left the family.');
    },
  });

  const actionError = firstApiErrorMessage(
    createMutation.error,
    joinMutation.error,
    leaveMutation.error,
    familyQuery.error,
  );

  async function openShare(familyId: string) {
    setShareId(familyId);
    setRevealFamilyId(true);
    const didCopy = await writeClipboard(familyId);
    setCopied(didCopy);
    setStatus(didCopy ? 'Family ID copied to clipboard.' : 'Share window open. Copy the ID below.');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'CalorieTracker family',
          text: inviteMessage(familyId),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }
  }

  async function shareWithDevice() {
    if (!shareId || typeof navigator.share !== 'function') {
      return;
    }
    try {
      await navigator.share({
        title: 'CalorieTracker family',
        text: inviteMessage(shareId),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }

  useEffect(() => {
    if (!shareId) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShareId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shareId]);

  const householdTotal = members.reduce((sum, member) => sum + member.todayCalories, 0);

  return (
    <div className="page-family">
      <div className="main-inner">
        <div className="top-row">
          <div>
            <div className="kicker">Household</div>
            <h1 className="page-title">My family</h1>
            {family ? (
              <p className="family-id">
                Family ID{' '}
                <code>{revealFamilyId ? family.id : '••••••••••••'}</code>{' '}
                <button type="button" className="btn-link" onClick={() => setRevealFamilyId((value) => !value)}>
                  {revealFamilyId ? 'Hide' : 'Reveal'}
                </button>
                <button type="button" className="btn-link" onClick={() => void openShare(family.id)}>
                  Share
                </button>
              </p>
            ) : (
              <p className="family-id">Create a family or join with a family ID.</p>
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => (family ? void openShare(family.id) : createMutation.mutate())}
            disabled={createMutation.isPending}
          >
            {family ? 'Invite family member' : createMutation.isPending ? 'Creating…' : 'Create family'}
          </button>
        </div>

        {actionError ? (
          <p className="error-text" role="alert">
            {actionError}
          </p>
        ) : null}
        {status ? <p className="muted small">{status}</p> : null}

        {familyQuery.isPending ? <p className="muted">Loading family…</p> : null}

        <div className="fam-grid">
          {members.map((member) => (
            <button
              type="button"
              key={member.id}
              className={`fam-card${selected?.id === member.id ? ' is-selected' : ''}`}
              onClick={() => setSelectedId(member.id)}
            >
              <div className="fam-head">
                <div className="fam-avatar" aria-hidden="true">
                  {initialsFromEmail(member.email)}
                </div>
                <div>
                  <div className="n">{displayNameFromEmail(member.email)}</div>
                  <div className="r">{memberRole(member)}</div>
                </div>
              </div>
              <div className="fam-stat">
                <span>Logged today</span>
                <b>{formatKcal(member.todayCalories)}</b>
              </div>
              <div className="fam-stat">
                <span>Timezone</span>
                <b>{displayTimeZone(member.timezone)}</b>
              </div>
              <div className="fam-stat">
                <span>Member since</span>
                <b>{new Date(member.createdAt).toLocaleDateString()}</b>
              </div>
            </button>
          ))}
          {family ? (
            <button type="button" className="add-card" onClick={() => void openShare(family.id)}>
              <div className="plus">+</div>
              <div>Share family ID</div>
              <p className="invite-caption">
                Opens a share window with this household ID copied, ready to send.
              </p>
            </button>
          ) : (
            <button type="button" className="add-card" onClick={() => createMutation.mutate()}>
              <div className="plus">+</div>
              <div>Create a family</div>
            </button>
          )}
        </div>

        <div className="grid">
          <div>
            <h2>Household today</h2>
            {members.length === 0 ? (
              <div className="empty-panel">
                <p>No household totals yet.</p>
                <p className="muted">
                  Create or join a family to see each member&apos;s logged calories. Meals stay on each person&apos;s
                  own log.
                </p>
              </div>
            ) : members.length === 1 ? (
              <div className="empty-panel">
                <p>Household today appears here once two or more people have joined.</p>
                <p className="muted">With one member, today&apos;s calories stay on the profile card.</p>
              </div>
            ) : (
              members.map((member) => (
                <button
                  type="button"
                  key={`today-${member.id}`}
                  className="shared-meal"
                  onClick={() => setSelectedId(member.id)}
                >
                  <div className="fam-avatar" aria-hidden="true">
                    {initialsFromEmail(member.email)}
                  </div>
                  <div className="info">
                    <div className="t">{displayNameFromEmail(member.email)}</div>
                    <div className="s">
                      {formatKcal(member.todayCalories)} logged today · {displayTimeZone(member.timezone)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div>
            {selected ? (
              <div className="side-card">
                <div className="who">Profile · {displayNameFromEmail(selected.email)}</div>
                <p>{selected.email}</p>
                <p>
                  {selected.isCurrentUser ? 'Currently viewing your profile.' : 'Currently viewing this family member.'}
                </p>
                <p>
                  {formatKcal(selected.todayCalories)} logged today in {displayTimeZone(selected.timezone)}.
                </p>
              </div>
            ) : null}
            <div className="side-card">
              <div className="who">Join with family ID</div>
              <form
                className="field"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (joinId.trim()) {
                    joinMutation.mutate();
                  }
                }}
              >
                <span className="field-label">Family ID</span>
                <div className="join-row">
                  <input
                    type="text"
                    value={joinId}
                    onChange={(event) => setJoinId(event.target.value)}
                    placeholder="Paste a family ID"
                    autoComplete="off"
                    aria-label="Family ID"
                  />
                  <button type="submit" className="btn-primary" disabled={joinMutation.isPending || !joinId.trim()}>
                    {joinMutation.isPending ? 'Joining…' : 'Join'}
                  </button>
                </div>
              </form>
              {family ? (
                <button
                  type="button"
                  className="button button-ghost leave-family"
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                >
                  Leave family
                </button>
              ) : null}
            </div>
            <div className="side-card">
              <div className="who">Sage on family</div>
              <p>
                {family
                  ? `${members.length} member${members.length === 1 ? '' : 's'} ${members.length === 1 ? 'shares' : 'share'} this household ID. Each person still keeps their own meals and goals.`
                  : 'Create a family to get a unique ID. Anyone you share it with can join and keep their own log.'}
              </p>
            </div>
            <div className="side-card">
              <div className="who">Household total</div>
              <p>
                {family
                  ? `${formatKcal(householdTotal)} logged across the family today, from ${members.length} active member${members.length === 1 ? '' : 's'}.`
                  : 'Join or create a family to see household totals.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {shareId ? (
        <div
          className="modal-backdrop"
          onClick={() => setShareId(null)}
        >
          <div
            className="modal-panel family-share-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-share-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="family-share-title">Share family ID</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setShareId(null)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p>
              Send this ID to someone you want in the household. They paste it on Family to join and keep their own
              log.
            </p>
            <p className="family-share-id">{shareId}</p>
            <p className="family-share-status" role="status">
              {copied ? 'Copied to clipboard.' : 'Copy the ID above if clipboard access was blocked.'}
            </p>
            <div className="family-share-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void writeClipboard(shareId).then((didCopy) => {
                    setCopied(didCopy);
                    if (didCopy) {
                      setStatus('Family ID copied to clipboard.');
                    }
                  });
                }}
              >
                Copy ID
              </button>
              {typeof navigator.share === 'function' ? (
                <button type="button" className="btn-secondary" onClick={() => void shareWithDevice()}>
                  Share
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
