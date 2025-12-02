// Central configuration for all affiliate links
// Replace these placeholder values with your real affiliate links

export const AFFILIATE_CONFIG = {
  // Amazon Associates Tag
  amazonTag: "freejob0c-20", // Sua tag real da Amazon

  // Google AdSense - INSTRUÇÕES:
  // 1. Substitua "ca-pub-XXXXXXXXXX" pelo seu Publisher ID
  // 2. Substitua os números dos slots pelos IDs dos seus blocos de anúncio
  googleAdsense: {
    clientId: "ca-pub-XXXXXXXXXX", // ⬅ SUBSTITUA AQUI com seu ID (ex: ca-pub-1234567890123456)
    slots: {
      banner: "1234567890", // ⬅ SUBSTITUA com ID do slot para banners
      sidebar: "0987654321", // ⬅ SUBSTITUA com ID do slot para sidebar
    },
  },

  // Hotmart/Eduzz Course Affiliate Links
  courses: {
    eletricista: "https://go.hotmart.com/SEU_LINK_AFILIADO_ELETRICISTA",
    encanador: "https://go.hotmart.com/SEU_LINK_AFILIADO_ENCANADOR",
    marcenaria: "https://go.hotmart.com/SEU_LINK_AFILIADO_MARCENARIA",
    pintura: "https://go.hotmart.com/SEU_LINK_AFILIADO_PINTURA",
    pedreiro: "https://go.hotmart.com/SEU_LINK_AFILIADO_PEDREIRO",
  },

  // Amazon Product Links
  amazonProducts: {
    serraMarmore:
      "https://www.amazon.com.br/Serra-M%C3%A1rmore-Cortador-Concreto-KNAKASAKI/dp/B0FRRNHGKN?__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=2OFH5AXYRLAWS&dib=eyJ2IjoiMSJ9.sJal-4z9FbJL43fjTMXvdfE0y7PoJYJ6acEWsPaT5O6t1GexG2iBK4UweaOj4Up2Y170UPb8_TCav3cr33zLzdYCYm-kdTsuzWn5qCN29RjRU_4pfgHMcENCfDVwK-C2vfM8nkCg7cxefr2Ixi7amIBthnTep2-dh9uNBfcUDgtvUtvYm-WZkd7K8khyDrVxZBHbANYXYhT47KWLdeNpFy_B5xgpgH-59MILfdg9x03tp_m-wuhwrZBAcuGGAHZfhmwn1lyVC8Pqmx1SsPFFclczSCo-1MQd6besvdEFxIo._eKQFIkTmxqBy8TeacW5eAfbmhYdyz1aFSlZNUxViNw&dib_tag=se&keywords=maquita+bosch+220v&qid=1763603775&sprefix=maquita+bosch+220v%2Caps%2C247&sr=8-21-spons&ufe=app_do%3Aamzn1.fos.fcd6d665-32ba-4479-9f21-b774e276a678&sp_csd=d2lkZ2V0TmFtZT1zcF9tdGY&psc=1&linkCode=ll1&tag=freejob0c-20&linkId=fe7dfef942a04be386993b1eb2f924b9&language=pt_BR&ref_=as_li_ss_tl",
    fitaDuplaFace: "https://amzn.to/3K4pjx5",
    parafusadeiraWap: "https://amzn.to/3KeDy6r",
    cameraSegurancaWifi: "https://amzn.to/4oTAJa4",
    conjuntoChavesFenda: "https://amzn.to/3X8onyA",
    esmerilhadeira: "https://amzn.to/4oMGlCV",
    // Produtos ainda com links placeholder
    multimetro: "https://www.amazon.com.br/dp/B08XYZ123?tag=freejob0c-20",
    kitFerramentas: "https://www.amazon.com.br/dp/B08XYZ456?tag=freejob0c-20",
    trenaLaser: "https://www.amazon.com.br/dp/B08XYZ789?tag=freejob0c-20",
    vedacao: "https://www.amazon.com.br/dp/B08XYZ303?tag=freejob0c-20",
    desentupidor: "https://www.amazon.com.br/dp/B08XYZ404?tag=freejob0c-20",
    tupia: "https://www.amazon.com.br/dp/B08XYZ505?tag=freejob0c-20",
    brocas: "https://www.amazon.com.br/dp/B08XYZ606?tag=freejob0c-20",
  },
}

// Helper function to generate Amazon product link with tag
export function getAmazonLink(productKey: keyof typeof AFFILIATE_CONFIG.amazonProducts): string {
  return AFFILIATE_CONFIG.amazonProducts[productKey]
}

// Helper function to get course link
export function getCourseLink(courseKey: keyof typeof AFFILIATE_CONFIG.courses): string {
  return AFFILIATE_CONFIG.courses[courseKey]
}

export const AMAZON_PRODUCTS = {
  serraMarmore: {
    name: "Serra Mármore 2000w Cortador De Concreto 10mm KNAKASAKI",
    price: "R$ 199,50",
    link: AFFILIATE_CONFIG.amazonProducts.serraMarmore,
    image: "https://kz7olagf6boahkbe.public.blob.vercel-storage.com/ads/produtos/1764639710312-serra-marmore-knakasaki.jpg",
    category: "pedreiro",
  },
  fitaDuplaFace: {
    name: "Fita Dupla Face Scotch 3M Fixa Forte Extrema 24mm x 2m",
    price: "R$ 24,99",
    link: AFFILIATE_CONFIG.amazonProducts.fitaDuplaFace,
    image: "/produtos/fita-dupla-face-scotch-3m.jpg",
    category: "geral",
  },
  parafusadeiraWap: {
    name: "Parafusadeira e Furadeira WAP 12V Kit 13 Acessórios",
    price: "R$ 129,99",
    link: AFFILIATE_CONFIG.amazonProducts.parafusadeiraWap,
    image: "/produtos/parafusadeira-wap-12v.jpg",
    category: "geral",
  },
  cameraSegurancaWifi: {
    name: "Câmera De Segurança Wi-fi Externa À Prova D'água Full Hd Gira 360 Bivolt",
    price: "R$ 110,00",
    link: AFFILIATE_CONFIG.amazonProducts.cameraSegurancaWifi,
    image: "/produtos/camera-wifi.jpg",
    category: "eletricista",
  },
  conjuntoChavesFenda: {
    name: "Black+Decker Conjunto De Chaves De Fenda 42 Peças",
    price: "R$ 149,24",
    link: AFFILIATE_CONFIG.amazonProducts.conjuntoChavesFenda,
    image: "https://kz7olagf6boahkbe.public.blob.vercel-storage.com/ads/produtos/1764640577913-conjunto-chaves-fenda.jpg",
    category: "eletricista",
  },
  esmerilhadeira: {
    name: "Esmerilhadeira Lixadeira 12V Sem Fio Portátil (2 Bateria + 8 Discos)",
    price: "R$ 125,90",
    link: AFFILIATE_CONFIG.amazonProducts.esmerilhadeira,
    image: "https://kz7olagf6boahkbe.public.blob.vercel-storage.com/ads/produtos/1764640720655-esmerilhadeira.jpg",
    category: "marceneiro",
  },
  multimetro: {
    name: "Multímetro Digital Profissional",
    price: "R$ 89,90",
    link: AFFILIATE_CONFIG.amazonProducts.multimetro,
    image: "/multimetro.jpg",
    category: "eletricista",
  },
  kitFerramentas: {
    name: "Kit Ferramentas Básico",
    price: "R$ 159,90",
    link: AFFILIATE_CONFIG.amazonProducts.kitFerramentas,
    image: "/kits-ferramentas.png",
    category: "geral",
  },
  trenaLaser: {
    name: "Trena Laser 3D",
    price: "R$ 299,90",
    link: AFFILIATE_CONFIG.amazonProducts.trenaLaser,
    image: "/trena-laser.jpg",
    category: "eletricista",
  },
  vedacao: {
    name: "Kit de Vedação",
    price: "R$ 99,90",
    link: AFFILIATE_CONFIG.amazonProducts.vedacao,
    image: "/vedacao.jpg",
    category: "encanador",
  },
  desentupidor: {
    name: "Desentupidor de Pressão",
    price: "R$ 129,90",
    link: AFFILIATE_CONFIG.amazonProducts.desentupidor,
    image: "/desentupidor.jpg",
    category: "encanador",
  },
  tupia: {
    name: "Túpia de Solda",
    price: "R$ 179,90",
    link: AFFILIATE_CONFIG.amazonProducts.tupia,
    image: "/tupia.jpg",
    category: "eletricista",
  },
  brocas: {
    name: "Brocas de Solda",
    price: "R$ 49,90",
    link: AFFILIATE_CONFIG.amazonProducts.brocas,
    image: "/brocas.jpg",
    category: "eletricista",
  },
}

export const HOTMART_COURSES = {
  eletricista: {
    id: "1",
    title: "Curso Completo de Eletricista Residencial",
    description: "Aprenda instalações elétricas do zero. Certificado reconhecido nacionalmente.",
    imageUrl: "/cursos/eletricista.jpg",
    ctaText: "Saiba Mais",
    link: "https://go.hotmart.com/SEU_LINK_AFILIADO_ELETRICISTA",
    category: "Eletricista",
    provider: "Hotmart",
  },
  encanador: {
    id: "2",
    title: "Treinamento Profissional de Encanador",
    description: "Domine técnicas de instalação hidráulica e manutenção. Comece hoje!",
    imageUrl: "/cursos/encanador.jpg",
    ctaText: "Ver Curso",
    link: "https://go.hotmart.com/SEU_LINK_AFILIADO_ENCANADOR",
    category: "Encanador",
    provider: "Hotmart",
  },
  marcenaria: {
    id: "3",
    title: "Curso de Marcenaria e Montagem de Móveis",
    description: "Aprenda a montar e criar móveis profissionalmente. Aulas práticas.",
    imageUrl: "/cursos/marcenaria.jpg",
    ctaText: "Inscreva-se",
    link: "https://go.hotmart.com/SEU_LINK_AFILIADO_MARCENARIA",
    category: "Montador de Móveis",
    provider: "Hotmart",
  },
  pintura: {
    id: "4",
    title: "Pintor Profissional - Técnicas Avançadas",
    description: "Aprenda técnicas de pintura residencial e comercial com certificado.",
    imageUrl: "/cursos/pintura.jpg",
    ctaText: "Começar Agora",
    link: "https://go.hotmart.com/SEU_LINK_AFILIADO_PINTURA",
    category: "Pintor",
    provider: "Hotmart",
  },
  pedreiro: {
    id: "5",
    title: "Pedreiro Profissional do Zero ao Avançado",
    description: "Construção, reforma e acabamento. Aulas práticas com profissionais.",
    imageUrl: "/cursos/pedreiro.jpg",
    ctaText: "Acessar Curso",
    link: "https://go.hotmart.com/SEU_LINK_AFILIADO_PEDREIRO",
    category: "Pedreiro",
    provider: "Hotmart",
  },
}
