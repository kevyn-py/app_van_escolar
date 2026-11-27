# Van Escolar — Controle de Embarque e Desembarque (MVP)

Aplicação web responsiva (mobile first) para o condutor ou monitor de van escolar registrar, criança por criança, os quatro momentos do transporte diário:

1. **Embarque para escola** → 2. **Desembarque na escola** (Trajeto de Ida)
3. **Embarque para casa** → 4. **Desembarque em casa** (Trajeto de Volta)

Cada evento tem quatro status independentes: **Pendente**, **Confirmado**, **Não compareceu** e **Não se aplica**. O histórico diário é imutável e preservado mesmo após editar, desativar ou excluir alunos.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Lucide · Firebase Authentication · Cloud Firestore · Vercel.

## Telas

| Rota | Área |
| --- | --- |
| `/login` | Entrar, criar conta e recuperar senha |
| `/` | Início — resumo do dia, progresso e atalhos para os 4 eventos |
| `/eventos?evento=…` | Controle dos Eventos — confirmação em 1 toque, "Desfazer" por 5 s, menu de ajuste |
| `/alunos` | Cadastro, edição, ativação/desativação, exclusão e busca |
| `/historico` e `/historico/AAAA-MM-DD` | Histórico somente leitura (o dia atual aparece no topo como "Hoje — Em andamento") |
| `/configuracoes` | Conta, ordenação padrão, aviso LGPD e logout |

## Decisões de produto adotadas (Seção 26)

- **Perfil de trajeto** no cadastro (Ida e volta / Somente ida / Somente volta); eventos fora do perfil iniciam como "Não se aplica".
- **Independência total** dos eventos: marcar "Não compareceu" no embarque não altera nem sugere nada no desembarque.
- **Desativar/excluir hoje:** sai da operação se só tiver eventos pendentes/não se aplica; se já tiver registro efetivo, permanece no registro do dia marcado como "Cadastro desativado/removido".
- **Cadastro aberto** de contas (tela "Criar conta") com envio de e-mail de verificação.
- Aluno **novo ou reativado** entra imediatamente na operação de hoje.
- Incluídos: "Esqueci minha senha" e preferência de ordenação ("Pendentes no topo" / "Ordem alfabética").

## Estrutura

```
src/
  app/            rotas (App Router); (app)/ = área autenticada com AuthGuard e navegação
  components/     componentes de UI reutilizáveis
  domain/         regras de negócio puras e testadas (datas, contadores, perfis, RN-08…)
  hooks/          contexto de autenticação, dados em tempo real (onSnapshot), toast, conexão
  services/       acesso ao Firebase (auth, usuário, alunos, registros diários)
  lib/firebase.ts inicialização do SDK a partir das variáveis de ambiente
firestore.rules   regras de segurança
tests/domain      testes unitários (Vitest)
tests/rules       testes das Security Rules no Firebase Emulator
```

Modelo de dados: `users/{uid}`, `users/{uid}/students/{id}` e `users/{uid}/dailyRecords/{AAAA-MM-DD}` (um documento por dia, com snapshot de cada aluno e os 4 eventos). Alterações de status usam transação e caminho pontual (`students.{id}.events.{evento}`), sem sobrescrever outros alunos.

## Rodando localmente

Requisitos: Node.js 20+ (e Java 11+ apenas para os emuladores).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preencha `.env.local` com as chaves do seu app Web do Firebase e rode:

```bash
npm run dev
```

### Sem projeto Firebase (emuladores)

Em `.env.local`, use `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` e `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-van-escolar`; depois, em terminais separados:

```bash
npx firebase emulators:start --only auth,firestore --project demo-van-escolar
```

```bash
npm run dev
```

### Verificações

```bash
npm run typecheck && npm run lint && npm test
```

```bash
npm run test:rules
```

## Configurando o Firebase (produção)

1. Em [console.firebase.google.com](https://console.firebase.google.com), crie um projeto.
2. **Authentication → Método de login:** habilite **E-mail/senha**. Em **Modelos**, ajuste o idioma para português, se quiser.
3. **Firestore Database:** crie o banco (modo produção, região `southamerica-east1` sugerida).
4. **Configurações do projeto → Seus apps → Web (`</>`):** registre o app e copie os valores de `firebaseConfig`.
5. Publique as regras de segurança deste repositório:

   ```bash
   npx firebase login
   ```

   ```bash
   npx firebase deploy --only firestore --project SEU_PROJECT_ID
   ```

   (Ou copie o conteúdo de `firestore.rules` em Firestore → Regras → Publicar.)
6. **Authentication → Configurações → Domínios autorizados:** adicione o domínio da Vercel (ex.: `seu-app.vercel.app`) e o domínio próprio, se houver.

## Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório do GitHub (framework detectado: Next.js; não é preciso alterar comandos).
2. Em **Settings → Environment Variables**, cadastre para **Production** e **Preview**:

   | Variável | Valor (de `firebaseConfig`) |
   | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

3. Faça o deploy. Cada push na branch principal gera um novo deploy automaticamente (HTTPS gerenciado pela Vercel).
4. Adicione o domínio gerado em **Domínios autorizados** do Firebase Authentication (passo 6 acima).

> As chaves `NEXT_PUBLIC_FIREBASE_*` identificam o projeto e ficam visíveis no navegador por natureza; a proteção dos dados é feita pelas **Firestore Security Rules**. Mesmo assim, mantenha-as fora do código (`.env.local` não é versionado).

## Segurança e privacidade (LGPD)

- Regras do Firestore: bloqueio padrão; cada operador acessa só `users/{seu uid}`; validação de campos, status e perfis; cada atualização do dia altera um único aluno, validado por completo; registros de dias anteriores não podem ser editados nem apagados (janela com tolerância de fuso; o frontend bloqueia pela data local exata).
- Limitação conhecida: as regras não conseguem iterar o mapa de alunos na **criação** do documento do dia; ali são validados formato, data e tamanho, e cada alteração posterior é validada por completo.
- Sem fotos, documentos, endereços, telefones, escola ou geolocalização. Avatares são apenas ícone + cor. Nomes de alunos não são enviados a logs ou telemetria.

## Fora do escopo do MVP

App nativo, modo offline completo, GPS, acesso para pais, mensagens automáticas, financeiro, relatórios/exportação, múltiplos operadores por van.
