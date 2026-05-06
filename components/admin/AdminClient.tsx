'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DilemmaWithVotes, OptionWithVotes } from '@/lib/types'

const OPTION_COLORS = ['#F59E0B', '#38BDF8', '#34D399']

export default function AdminClient() {
  const [dilemmas, setDilemmas] = useState<DilemmaWithVotes[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()

    const { data: allDilemmas } = await supabase
      .from('dilemmas')
      .select('*')
      .order('created_at')

    if (!allDilemmas) {
      setLoading(false)
      return
    }

    const dilemmaIds = allDilemmas.map((d) => d.id)

    const { data: allOptions } = await supabase
      .from('options')
      .select('*')
      .in('dilemma_id', dilemmaIds)
      .order('sort_order')

    const optionIds = (allOptions ?? []).map((o) => o.id as string)
    let voteCounts: Record<string, number> = {}

    if (optionIds.length > 0) {
      const { data: votes } = await supabase
        .from('votes')
        .select('option_id')
        .in('option_id', optionIds)

      votes?.forEach((v) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1
      })
    }

    const result: DilemmaWithVotes[] = allDilemmas.map((d) => {
      const opts: OptionWithVotes[] = (allOptions ?? [])
        .filter((o) => o.dilemma_id === d.id)
        .map((o) => ({ ...o, vote_count: voteCounts[o.id] || 0 }))
      const total = opts.reduce((sum, o) => sum + o.vote_count, 0)
      return { ...d, options: opts, total_votes: total }
    })

    setDilemmas(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()

    const supabase = createClient()
    const channel = supabase
      .channel('admin-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dilemmas' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAll])

  async function activate(id: string) {
    setPendingAction(`activate-${id}`)
    await fetch('/api/admin/dilemma', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: true, show_results: false }),
    })
    await fetchAll()
    setPendingAction(null)
  }

  async function deactivate(id: string) {
    setPendingAction(`deactivate-${id}`)
    await fetch('/api/admin/dilemma', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: false, show_results: false }),
    })
    await fetchAll()
    setPendingAction(null)
  }

  async function toggleResults(id: string, show: boolean) {
    setPendingAction(`results-${id}`)
    await fetch('/api/admin/dilemma', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, show_results: show }),
    })
    await fetchAll()
    setPendingAction(null)
  }

  async function resetVotes(id: string) {
    if (!window.confirm('¿Reiniciar todos los votos de este dilema? Esta acción no se puede deshacer.'))
      return
    setPendingAction(`reset-${id}`)
    await fetch('/api/admin/votes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dilemma_id: id }),
    })
    await fetchAll()
    setPendingAction(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-accent animate-spin" />
      </div>
    )
  }

  const activeDilemma = dilemmas.find((d) => d.is_active)

  return (
    <div className="min-h-svh bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted">
              Recursos Humanos — Expo
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Panel de Control</h1>
          <p className="text-muted text-sm mt-1">Ética Informática</p>

          {/* Quick links */}
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors hover:border-foreground/20"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Página de votación
            </a>
            <a
              href="/resultados"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors hover:border-foreground/20"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Pantalla de resultados
            </a>
          </div>
        </div>

        {/* Status bar */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {activeDilemma ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-widest">Activo ahora</p>
                  <p className="text-foreground text-sm font-medium">{activeDilemma.title}</p>
                </div>
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-border flex-shrink-0" />
                <p className="text-muted text-sm">Sin dilema activo</p>
              </>
            )}
          </div>
          {activeDilemma && (
            <span className="text-xs text-muted flex-shrink-0">
              {activeDilemma.total_votes} votos
            </span>
          )}
        </div>

        {/* Dilemma cards */}
        <div className="flex flex-col gap-5">
          {dilemmas.map((dilemma) => {
            const isActivePending = pendingAction?.includes(dilemma.id)

            return (
              <div
                key={dilemma.id}
                className={`rounded-2xl border p-5 transition-all ${
                  dilemma.is_active
                    ? 'border-accent/30 bg-accent/5'
                    : 'border-border bg-surface'
                }`}
              >
                {/* Dilemma header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {dilemma.is_active ? (
                      <>
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="text-xs font-semibold text-accent uppercase tracking-widest">
                          Activo
                        </span>
                        {dilemma.show_results && (
                          <span className="text-xs text-muted bg-surface-2 border border-border rounded-md px-2 py-0.5">
                            Resultados visibles
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted uppercase tracking-widest">Inactivo</span>
                    )}
                  </div>
                  <h2 className="font-display text-lg font-bold text-foreground leading-snug">
                    {dilemma.title}
                  </h2>
                  <p className="text-muted text-xs mt-1">
                    {dilemma.total_votes} {dilemma.total_votes === 1 ? 'voto' : 'votos'} totales
                  </p>
                </div>

                {/* Per-option vote mini bars */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {dilemma.options.map((opt, i) => {
                    const pct =
                      dilemma.total_votes > 0
                        ? Math.round((opt.vote_count / dilemma.total_votes) * 100)
                        : 0
                    return (
                      <div key={opt.id} className="rounded-lg bg-surface-2 border border-border p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span
                            className="h-5 w-5 rounded flex items-center justify-center text-xs font-bold text-background flex-shrink-0"
                            style={{ backgroundColor: OPTION_COLORS[i] }}
                          >
                            {opt.label}
                          </span>
                          <span className="text-foreground text-sm font-bold">{opt.vote_count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: OPTION_COLORS[i] }}
                          />
                        </div>
                        <p className="text-muted text-xs mt-1">{pct}%</p>
                      </div>
                    )
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {!dilemma.is_active ? (
                    <button
                      onClick={() => activate(dilemma.id)}
                      disabled={!!pendingAction}
                      className="rounded-lg bg-accent text-accent-fg text-xs font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isActivePending && pendingAction?.startsWith('activate')
                        ? 'Activando...'
                        : 'Activar dilema'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => deactivate(dilemma.id)}
                        disabled={!!pendingAction}
                        className="rounded-lg bg-surface-2 border border-border text-foreground text-xs font-semibold px-4 py-2 hover:border-foreground/30 disabled:opacity-50 transition-colors"
                      >
                        {isActivePending && pendingAction?.startsWith('deactivate')
                          ? 'Desactivando...'
                          : 'Desactivar'}
                      </button>

                      {!dilemma.show_results ? (
                        <button
                          onClick={() => toggleResults(dilemma.id, true)}
                          disabled={!!pendingAction}
                          className="rounded-lg bg-surface-2 border border-border text-foreground text-xs font-semibold px-4 py-2 hover:border-accent/40 disabled:opacity-50 transition-colors"
                        >
                          {isActivePending && pendingAction?.startsWith('results')
                            ? 'Actualizando...'
                            : 'Revelar resultados'}
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleResults(dilemma.id, false)}
                          disabled={!!pendingAction}
                          className="rounded-lg bg-surface-2 border border-border text-foreground text-xs font-semibold px-4 py-2 hover:border-foreground/30 disabled:opacity-50 transition-colors"
                        >
                          {isActivePending && pendingAction?.startsWith('results')
                            ? 'Actualizando...'
                            : 'Ocultar resultados'}
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => resetVotes(dilemma.id)}
                    disabled={!!pendingAction || dilemma.total_votes === 0}
                    className="rounded-lg bg-surface-2 border border-border text-muted text-xs font-semibold px-4 py-2 hover:border-red-500/40 hover:text-red-400 disabled:opacity-30 transition-colors"
                  >
                    {isActivePending && pendingAction?.startsWith('reset')
                      ? 'Reiniciando...'
                      : 'Reiniciar votos'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
