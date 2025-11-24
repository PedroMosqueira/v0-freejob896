import { NextRequest, NextResponse } from 'next/server'
import { upgradeToPremium } from '@/lib/subscription-manager'

export async function POST(request: NextRequest) {
  try {
    const { email, months } = await request.json()

    console.log('[v0] Upgrade request:', { email, months })

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    const success = await upgradeToPremium(email, months || 1)

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao processar upgrade' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error in upgrade API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
