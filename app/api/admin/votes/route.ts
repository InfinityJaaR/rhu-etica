import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const { dilemma_id } = await request.json()

    if (!dilemma_id) {
      return NextResponse.json({ error: 'dilemma_id is required' }, { status: 400 })
    }

    // Use service role key to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[v0] Resetting votes for dilemma:', dilemma_id)

    // Get all option IDs for this dilemma
    const { data: options, error: optionsError } = await supabase
      .from('options')
      .select('id')
      .eq('dilemma_id', dilemma_id)

    if (optionsError) {
      console.error('[v0] Options error:', optionsError)
      return NextResponse.json({ error: optionsError.message }, { status: 500 })
    }

    console.log('[v0] Found options:', options?.length || 0)

    if (!options || options.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const optionIds = options.map((o) => o.id)
    console.log('[v0] Option IDs to delete votes from:', optionIds)

    // Delete all votes for these options
    const { data, error } = await supabase
      .from('votes')
      .delete()
      .in('option_id', optionIds)

    if (error) {
      console.error('[v0] Delete votes error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[v0] Votes deleted successfully. Data:', data)
    return NextResponse.json({ success: true, deleted: data?.length || 0 })
  } catch (err) {
    console.error('[v0] Reset votes error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
