# Half Trip ✈️

> Planeje junto. Viaje melhor. Divida justo.

Half Trip é uma plataforma moderna para planejar viagens em grupo, compartilhar roteiros e dividir despesas de forma justa — tudo em um só lugar.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-blueviolet)](https://web.dev/progressive-web-apps/)

## 🌟 Principais Funcionalidades

### ✈️ Planejamento de Viagem

- **Roteiro Compartilhado**: Monte o itinerário dia a dia com todos os participantes
- **Itinerário Detalhado**: Organize passeios, reservas e horários
- **Anexos**: Adicione fotos, PDFs e links importantes
- **Notas Compartilhadas**: Espaço para ideias, lembretes e informações úteis

### 👥 Viagens em Grupo

- **Múltiplos Participantes**: Convide amigos, família ou qualquer grupo
- **Convites por Link ou Email**: Sistema flexível de convites
- **Permissões Simples**: Organizadores e participantes com permissões claras
- **Tudo Sincronizado**: Mudanças aparecem em tempo real para todos

### 💸 Controle de Despesas

- **Registro Simplificado**: Adicione gastos com poucos cliques
- **Categorias**: Organize por hospedagem, alimentação, transporte, etc.
- **Comprovantes**: Anexe fotos de recibos
- **Múltiplas Moedas**: (em desenvolvimento)

### ⚖️ Divisão Justa

- **Cálculo Automático**: Algoritmo que minimiza o número de transações
- **Divisão Flexível**: Igual, por valor ou por porcentagem
- **Saldo Individual**: Cada pessoa vê quanto pagou e quanto deve
- **Rastreamento de Pagamentos**: Marque acertos como pagos

### 🌐 Funciona Offline

- **PWA**: Instale como app no celular
- **Modo Offline**: Visualize dados e crie despesas sem internet
- **Sincronização Automática**: Mudanças são sincronizadas quando voltar online
- **Cache Inteligente**: Dados carregam rapidamente

## 🚀 Tecnologias

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State Management**: React Query, Zustand
- **Offline**: IndexedDB (Dexie.js), Service Workers
- **Email**: Resend + React Email
- **Validação**: Zod
- **Testes**: Vitest, Testing Library, Playwright
- **Lint**: ESLint, Prettier, Husky

## 📦 Instalação

### Pré-requisitos

- Node.js 20+
- pnpm 8+ (ou npm/yarn)
- Conta Supabase (gratuita)
- Conta Resend (opcional, para emails)

### Configuração Local

1. **Clone o repositório**

   ```bash
   git clone https://github.com/your-username/half-trip.git
   cd half-trip
   ```

2. **Instale as dependências**

   ```bash
   pnpm install
   ```

3. **Configure as variáveis de ambiente**

   ```bash
   cp .env.example .env
   ```

   Edite `.env` e adicione suas credenciais:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Resend (opcional)
   RESEND_API_KEY=your_resend_api_key

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Configure o Supabase**

   Crie um projeto no [Supabase](https://supabase.com) e execute as migrações:

   ```bash
   # Opção 1: Com Supabase CLI (recomendado)
   npx supabase login
   npx supabase link --project-ref your-project-ref
   npx supabase db push

   # Opção 2: Copie e execute cada arquivo SQL no SQL Editor do Supabase
   # Arquivos em: supabase/migrations/
   ```

5. **Gere os ícones PWA**

   ```bash
   pnpm generate-icons
   ```

6. **Inicie o servidor de desenvolvimento**

   ```bash
   pnpm dev
   ```

7. **Abra no navegador**
   ```
   http://localhost:3000
   ```

## 🧪 Testes

```bash
# Rodar todos os testes
pnpm test

# Modo watch
pnpm test:watch

# UI interativa
pnpm test:ui

# E2E tests (Playwright)
pnpm test:e2e
```

## 🏗️ Build de Produção

```bash
# Verificar se está pronto para deploy
pnpm verify-deploy

# Build completo (verificação + lint + testes + build)
pnpm pre-deploy

# Apenas build
pnpm build

# Rodar build localmente
pnpm start
```

## 🚢 Deploy para Produção

Veja o guia completo em [DEPLOYMENT.md](./DEPLOYMENT.md).

### Resumo Rápido

1. **Supabase Production**
   - Crie projeto de produção
   - Execute migrações
   - Configure auth URLs

2. **Vercel**
   - Conecte repositório GitHub
   - Configure variáveis de ambiente
   - Deploy automático

3. **Verificação**
   - Teste todas as funcionalidades
   - Execute Lighthouse audit
   - Monitore logs de erro

## 📁 Estrutura do Projeto

```
half-trip/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/             # Rotas autenticadas
│   │   │   ├── trips/         # Lista de viagens
│   │   │   ├── trip/[id]/     # Detalhes da viagem
│   │   │   │   ├── itinerary/ # Roteiro
│   │   │   │   ├── expenses/  # Despesas
│   │   │   │   ├── balance/   # Balanço
│   │   │   │   ├── participants/ # Participantes
│   │   │   │   └── notes/     # Anotações
│   │   │   └── settings/      # Configurações
│   │   ├── (auth)/            # Rotas de autenticação
│   │   └── invite/[code]/     # Aceitar convite
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes shadcn/ui
│   │   ├── layout/           # Layout components
│   │   ├── trips/            # Componentes de viagens
│   │   ├── activities/       # Componentes de atividades
│   │   ├── expenses/         # Componentes de despesas
│   │   └── ...
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilitários e lógica
│   │   ├── supabase/        # Cliente Supabase
│   │   ├── validation/      # Schemas Zod
│   │   ├── balance/         # Cálculo de balanço
│   │   ├── sync/            # Sync offline
│   │   └── ...
│   └── types/               # TypeScript types
├── supabase/
│   ├── migrations/          # Migrações SQL
│   └── seed.sql            # Dados de desenvolvimento
├── public/                 # Assets estáticos
├── scripts/               # Scripts utilitários
└── tests/                 # Testes E2E
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](./LICENSE) para mais detalhes.

## 👨‍💻 Autor

Desenvolvido com ❤️ para facilitar viagens em grupo.

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/) - Framework React
- [Supabase](https://supabase.com/) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com/) - Componentes UI
- [Vercel](https://vercel.com/) - Plataforma de deploy
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS

---

**Para quem é o Half Trip?**

👯 Amigos viajando juntos
💑 Casais que querem organizar gastos
👨‍👩‍👧 Famílias
🎉 Grupos de viagem, eventos ou intercâmbios

Se mais de uma pessoa está viajando, o Half Trip faz sentido.

---

**O problema que ele resolve:**

**Antes do Half Trip:**

- ❌ Planilhas confusas
- ❌ Prints de conversa
- ❌ Discussões sobre dinheiro
- ❌ "Depois a gente acerta"

**Com o Half Trip:**

- ✅ Tudo organizado
- ✅ Transparência total
- ✅ Divisão justa
- ✅ Mais foco na viagem, menos no controle
