import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const { dilemma_id } = await request.json()

    if (!dilemma_id) {
      return NextResponse.json({ error: 'dilemma_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all option IDs for this dilemma
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

    // Delete all votes for these options
    const { data, count, error } = await supabase
      .from('votes')
      .delete()
      .in('option_id', optionIds)
      .select('id', { count: 'exact' })

    if (error) {
      console.error('[v0] Delete votes error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[v0] Deleted votes:', count)
    return NextResponse.json({ success: true, deleted: count || 0 })
  } catch (err) {
    console.error('[v0] Reset votes error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
