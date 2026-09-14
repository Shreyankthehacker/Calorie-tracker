import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFamily, getFamily, joinFamily, leaveFamily } from '../api/family';
import { ApiError, type FamilyMemberProfile } from '../api/types';
import { useAuth } from '../auth/AuthProvider';

function displayName(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local;
}

function memberRole(member: FamilyMemberProfile): string {
  if (member.isCurrentUser) {
    return 'You';
  }
  return 'Member';
}

function formatKcal(value: number): string {
  return `${Math.round(value).toLocaleString()} kcal`;
}

function initials(email: string): string {
  const name = displayName(email);
  return name.slice(0, 1).toUpperCase();
}

export function FamilyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [joinId, setJoinId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      await navigator.clipboard?.writeText(created.id).catch(() => undefined);
      onFamilySuccess(`Family created. ID ${created.id} copied.`);
      setSelectedId(user?.id ?? null);
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

  const actionError =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : joinMutation.error instanceof ApiError
        ? joinMutation.error.message
        : leaveMutation.error instanceof ApiError
          ? leaveMutation.error.message
          : familyQuery.error instanceof ApiError
            ? familyQuery.error.message
            : null;

  async function copyFamilyId() {
    if (!family) {
      return;
    }
    await navigator.clipboard?.writeText(family.id).catch(() => undefined);
    setStatus(`Family ID ${family.id} copied.`);
  }

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
                Family ID <code>{family.id}</code>
              </p>
            ) : (
              <p className="family-id">Create a family or join with a family ID.</p>
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => (family ? void copyFamilyId() : createMutation.mutate())}
            disabled={createMutation.isPending}
          >
            {family ? '+ Invite family member' : createMutation.isPending ? 'Creating…' : '+ Create family'}
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
                  {initials(member.email)}
                </div>
                <div>
                  <div className="n">{displayName(member.email)}</div>
                  <div className="r">{memberRole(member)}</div>
                </div>
              </div>
              <div className="fam-stat">
                <span>Logged today</span>
                <b>{formatKcal(member.todayCalories)}</b>
              </div>
              <div className="fam-stat">
                <span>Timezone</span>
                <b>{member.timezone}</b>
              </div>
              <div className="fam-stat">
                <span>Member since</span>
                <b>{new Date(member.createdAt).toLocaleDateString()}</b>
              </div>
            </button>
          ))}
          {family ? (
            <button type="button" className="add-card" onClick={() => void copyFamilyId()}>
              <div className="plus">+</div>
              <div>Share family ID</div>
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
            ) : (
              members.map((member) => (
                <button
                  type="button"
                  key={`today-${member.id}`}
                  className="shared-meal"
                  onClick={() => setSelectedId(member.id)}
                >
                  <div className="fam-avatar" aria-hidden="true">
                    {initials(member.email)}
                  </div>
                  <div className="info">
                    <div className="t">{displayName(member.email)}</div>
                    <div className="s">
                      {formatKcal(member.todayCalories)} logged today · {member.timezone}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div>
            {selected ? (
              <div className="side-card">
                <div className="who">Profile · {displayName(selected.email)}</div>
                <p>{selected.email}</p>
                <p>
                  {selected.isCurrentUser ? 'Currently viewing your profile.' : 'Currently viewing this family member.'}
                </p>
                <p>
                  {formatKcal(selected.todayCalories)} logged today in {selected.timezone}.
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
              <div className="who">🐾 Sage on family</div>
              <p>
                {family
                  ? `"${members.length} member${members.length === 1 ? '' : 's'} ${members.length === 1 ? 'shares' : 'share'} this household ID. Each person still keeps their own meals and goals."`
                  : '"Create a family to get a unique ID. Anyone you share it with can join and keep their own log."'}
              </p>
            </div>
            <div className="side-card">
              <div className="who">👨‍👩‍👧 Household total</div>
              <p>
                {family
                  ? `${formatKcal(householdTotal)} logged across the family today, from ${members.length} active member${members.length === 1 ? '' : 's'}.`
                  : 'Join or create a family to see household totals.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
