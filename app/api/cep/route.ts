import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cep = searchParams.get("cep")

  if (!cep) {
    return NextResponse.json({ error: "CEP não fornecido" }, { status: 400 })
  }

  const cleanCep = cep.replace(/\D/g, "")

  if (cleanCep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)

    if (!response.ok) {
      return NextResponse.json({ error: "Erro ao buscar CEP" }, { status: 500 })
    }

    const data = await response.json()

    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      cep: data.cep,
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      complement: data.complemento,
    })
  } catch (error) {
    console.error("CEP API error:", error)
    return NextResponse.json({ error: "Erro ao consultar CEP" }, { status: 500 })
  }
}
