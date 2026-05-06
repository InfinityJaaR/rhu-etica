export type Dilemma = {
  id: string
  title: string
  context: string
  is_active: boolean
  show_results: boolean
  created_at: string
}

export type Option = {
  id: string
  dilemma_id: string
  label: string
  text: string
  consequence: string
  sort_order: number
  created_at: string
}

export type Vote = {
  id: string
  option_id: string
  created_at: string
}

export type OptionWithVotes = Option & {
  vote_count: number
}

export type DilemmaWithVotes = Dilemma & {
  options: OptionWithVotes[]
  total_votes: number
}
