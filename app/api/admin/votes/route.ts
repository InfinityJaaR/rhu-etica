import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const { dilemma_id } = await request.json()

    if (!dilemma_id) {
      return NextResponse.json({ error: 'dilemma_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: options, error: optionsError } = await supabase
      .from('options')
      .select('id')
      .eq('dilemma_id', dilemma_id)

    if (optionsError) {
      return NextResponse.json({ error: optionsError.message }, { status: 500 })
    }

    if (!options || options.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const optionIds = options.map((o) => o.id)

    const { error } = await supabase
      .from('votes')
      .delete()
      .in('option_id', optionIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
