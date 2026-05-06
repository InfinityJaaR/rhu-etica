import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // If activating, deactivate all other dilemmas first
    if (updates.is_active === true) {
      await supabase
        .from('dilemmas')
        .update({ is_active: false, show_results: false })
        .neq('id', id)
    }

    const { error } = await supabase
      .from('dilemmas')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
