import { NextRequest, NextResponse } from "next/server"
import { getCashbackBalance, getNextPlanPrice } from "@/lib/transaction-manager"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  try {
    const cashback = await getCashbackBalance(email)
    const nextPlanPrice = await getNextPlanPrice(email)

    return NextResponse.json({
      balance: cashback.balance,
      totalEarned: cashback.totalEarned,
      nextPlanPrice,
    })
  } catch (error) {
    console.error('[v0] Error fetching cashback balance:', error)
    return NextResponse.json({ error: 'Failed to fetch cashback' }, { status: 500 })
  }
}
