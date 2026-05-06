'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Dilemma, OptionWithVotes } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

const OPTION_COLORS = ['#F59E0B', '#38BDF8', '#34D399']

export default function ResultsClient() {
  const [dilemma, setDilemma] = useState<Dilemma | null>(null)
  const [options, setOptions] = useState<OptionWithVotes[]>([])
  const [loading, setLoading] = useState(true)

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
        setLoading(false)
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

      setDilemma(activeDilemma)
      setOptions(optsWithCounts)
      setLoading(false)
    }

    fetchData()

    const channel = supabase
      .channel('results-page-channel')
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

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-accent animate-spin" />
      </div>
    )
  }

  const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0)

  if (!dilemma) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-8 text-center">
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted">En vivo</span>
        </div>
        <h1 className="font-display text-5xl font-bold text-foreground mb-4">Ética Informática</h1>
        <p className="text-muted text-xl">Esperando el próximo dilema...</p>
      </div>
    )
  }

  const chartData = options.map((opt, i) => ({
    name: `Opción ${opt.label}`,
    votes: opt.vote_count,
    percentage: totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0,
    fill: OPTION_COLORS[i % OPTION_COLORS.length],
    text: opt.text,
  }))

  return (
    <div className="min-h-svh bg-background px-8 py-10 flex flex-col">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted">
            Resultados en tiempo real
          </span>
          <span className="text-border">·</span>
          <span className="text-muted text-xs">
            {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
          </span>
        </div>
        <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground leading-tight max-w-4xl text-balance">
          {dilemma.title}
        </h1>
        <p className="text-muted text-base mt-3 max-w-3xl leading-relaxed">{dilemma.context}</p>
      </div>

      {/* Chart */}
      <div className="flex-1 max-w-4xl w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 100, left: 10, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737373', fontSize: 13 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#ebebeb', fontSize: 15, fontWeight: 700 }}
            />
            <Bar dataKey="percentage" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="percentage"
                position="right"
                formatter={(v: number) => `${v}%`}
                style={{ fill: '#ebebeb', fontSize: 20, fontWeight: 700 }}
              />
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Option descriptions */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {options.map((option, i) => (
            <div key={option.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold text-background flex-shrink-0"
                  style={{ backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length] }}
                >
                  {option.label}
                </span>
                <span className="text-muted text-sm font-medium">
                  {option.vote_count} {option.vote_count === 1 ? 'voto' : 'votos'}
                </span>
              </div>
              <p className="text-foreground text-sm leading-relaxed">{option.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
