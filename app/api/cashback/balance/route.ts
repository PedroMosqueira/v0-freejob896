import { type NextRequest, NextResponse } from "next/server"
import { getCashbackBalance, getNextPlanPrice } from "@/lib/transaction-manager"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    const cashback = await getCashbackBalance(email)
    const nextPlanPrice = await getNextPlanPrice(email)

    return NextResponse.json({
      balance: cashback?.balance ?? 0,
      totalEarned: cashback?.totalEarned ?? 0,
      nextPlanPrice: nextPlanPrice ?? 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching cashback balance:", error)
    return NextResponse.json(
      {
        balance: 0,
        totalEarned: 0,
        nextPlanPrice: 0,
      },
      { status: 200 },
    )
  }
}
