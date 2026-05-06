'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Dilemma, OptionWithVotes } from '@/lib/types'

type ViewState = 'loading' | 'waiting' | 'voting' | 'thankyou' | 'results'

const OPTION_COLORS = [
  { bg: 'bg-amber-500', text: 'text-amber-400', bar: '#F59E0B' },
  { bg: 'bg-sky-500', text: 'text-sky-400', bar: '#38BDF8' },
  { bg: 'bg-emerald-500', text: 'text-emerald-400', bar: '#34D399' },
]

function computeViewState(activeDilemma: Dilemma | null, voted: boolean): ViewState {
  if (!activeDilemma) return 'waiting'
  if (activeDilemma.show_results) return 'results'
  if (voted) return 'thankyou'
  return 'voting'
}

export default function VotingClient() {
  const [dilemma, setDilemma] = useState<Dilemma | null>(null)
  const [options, setOptions] = useState<OptionWithVotes[]>([])
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
      const { data: activeDilemma } = await supabase
        .from('dilemmas')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      if (!activeDilemma) {
        setDilemma(null)
        setOptions([])
        setVotedOptionId(null)
        setViewState('waiting')
        return
      }

      const { data: opts } = await supabase
        .from('options')
        .select('*')
        .eq('dilemma_id', activeDilemma.id)
        .order('sort_order')

      const optionIds = (opts ?? []).map((o) => o.id as string)

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

      const optsWithCounts: OptionWithVotes[] = (opts ?? []).map((opt) => ({
        ...opt,
        vote_count: voteCounts[opt.id] || 0,
      }))

      const storedVote =
        typeof window !== 'undefined' ? localStorage.getItem(`voted_${activeDilemma.id}`) : null

      setDilemma(activeDilemma)
      setOptions(optsWithCounts)
      setVotedOptionId(storedVote)
      setViewState(computeViewState(activeDilemma, !!storedVote))
    }

    fetchData()

    const channel = supabase
      .channel('voting-page-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dilemmas' }, () =>
        fetchData(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          const newVote = payload.new as { option_id: string }
          setOptions((prev) =>
            prev.map((opt) =>
              opt.id === newVote.option_id
                ? { ...opt, vote_count: opt.vote_count + 1 }
                : opt,
            ),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleVote(optionId: string) {
    if (!dilemma || submitting) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      })

      if (res.ok) {
        localStorage.setItem(`voted_${dilemma.id}`, optionId)
        setVotedOptionId(optionId)
        setOptions((prev) =>
          prev.map((opt) =>
            opt.id === optionId ? { ...opt, vote_count: opt.vote_count + 1 } : opt,
          ),
        )
        setViewState(dilemma.show_results ? 'results' : 'thankyou')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (viewState === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-accent animate-spin" />
      </div>
    )
  }

  // ── Waiting ──────────────────────────────────────────────────────────────
  if (viewState === 'waiting') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-8 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted">En vivo</span>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground mb-3">
          Ética Informatica
        </h1>
        <p className="text-muted text-base mb-10">RHU — Exposición</p>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
          <div className="mb-4 mx-auto h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-foreground font-medium text-base">Esperando el próximo dilema...</p>
          <p className="text-muted text-sm mt-1 leading-relaxed">
            El facilitador activará la siguiente pregunta en breve.
          </p>
        </div>
      </div>
    )
  }

  // ── Voting ───────────────────────────────────────────────────────────────
  if (viewState === 'voting' && dilemma) {
    return (
      <div className="min-h-svh bg-background px-4 py-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium uppercase tracking-widest text-muted">
                Dilema activo
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground leading-tight text-balance">
              {dilemma.title}
            </h1>
          </div>

          <div className="mb-8 rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-muted leading-relaxed">{dilemma.context}</p>
          </div>

          <p className="text-xs font-medium uppercase tracking-widest text-muted mb-4">
            ¿Cuál es tu postura?
          </p>

          <div className="flex flex-col gap-3">
            {options.map((option, i) => {
              const color = OPTION_COLORS[i % OPTION_COLORS.length]
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={submitting}
                  className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-all duration-200 hover:border-accent/40 hover:bg-surface-2 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span
                    className={`flex-shrink-0 h-8 w-8 rounded-lg ${color.bg} flex items-center justify-center text-sm font-bold text-background`}
                  >
                    {option.label}
                  </span>
                  <span className="text-foreground text-sm leading-relaxed pt-0.5">
                    {option.text}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-6 text-center text-xs text-muted">Tu respuesta es anónima</p>
        </div>
      </div>
    )
  }

  // ── Thank You ────────────────────────────────────────────────────────────
  if (viewState === 'thankyou' && dilemma) {
    const votedOption = options.find((o) => o.id === votedOptionId)
    const votedIndex = options.findIndex((o) => o.id === votedOptionId)
    const color = OPTION_COLORS[Math.max(0, votedIndex) % OPTION_COLORS.length]

    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 mx-auto h-16 w-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Voto registrado
          </h2>
          <p className="text-muted text-sm mb-8 leading-relaxed">
            Gracias por participar. Los resultados se revelarán pronto.
          </p>

          {votedOption && (
            <div className="rounded-xl border border-border bg-surface p-4 text-left">
              <p className="text-xs text-muted uppercase tracking-widest mb-3">Tu elección</p>
              <div className="flex items-start gap-3">
                <span
                  className={`flex-shrink-0 h-7 w-7 rounded-lg ${color.bg} flex items-center justify-center text-xs font-bold text-background`}
                >
                  {votedOption.label}
                </span>
                <p className="text-foreground text-sm leading-relaxed">{votedOption.text}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (viewState === 'results' && dilemma) {
    const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0)
    const maxVotes = Math.max(...options.map((o) => o.vote_count), 1)

    return (
      <div className="min-h-svh bg-background px-4 py-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-widest text-accent mb-2">
              Resultados
            </p>
            <h1 className="font-display text-2xl font-bold text-foreground leading-tight text-balance">
              {dilemma.title}
            </h1>
            <p className="text-muted text-sm mt-1">
              {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'} en total
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {options.map((option, i) => {
              const color = OPTION_COLORS[i % OPTION_COLORS.length]
              const percentage =
                totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0
              const isVoted = option.id === votedOptionId
              const isWinner = option.vote_count === maxVotes && totalVotes > 0

              return (
                <div
                  key={option.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isVoted ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span
                        className={`flex-shrink-0 h-8 w-8 rounded-lg ${color.bg} flex items-center justify-center text-sm font-bold text-background`}
                      >
                        {option.label}
                      </span>
                      <span className="text-foreground text-sm leading-relaxed pt-0.5">
                        {option.text.length > 90 ? option.text.substring(0, 90) + '...' : option.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isWinner && totalVotes > 0 && (
                        <span className="text-accent text-sm">★</span>
                      )}
                      <span className={`text-xl font-bold font-display ${color.text}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${percentage}%`, backgroundColor: color.bar }}
                    />
                  </div>

                  <p className="text-muted text-xs mt-2">
                    {option.vote_count} {option.vote_count === 1 ? 'voto' : 'votos'}
                  </p>
                </div>
              )
            })}
          </div>

          {votedOptionId && (
            <div className="mt-8 rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted uppercase tracking-widest mb-2">
                Consecuencia de tu elección
              </p>
              <p className="text-foreground text-sm leading-relaxed">
                {options.find((o) => o.id === votedOptionId)?.consequence}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
