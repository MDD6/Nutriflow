# NutriFlow

NutriFlow e uma plataforma de acompanhamento nutricional para pacientes, nutricionistas e administradores.

## Requisitos

- Node.js 20 ou superior
- npm

## Como rodar

```bash
npm install
npm run prisma:generate
npm run db:push
npm start
```

Depois acesse:

```text
http://127.0.0.1:3000
```

## Configuracao

Crie um arquivo `.env` se quiser alterar as configuracoes padrao:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
DATABASE_URL=file:./dev.db
TOKEN_SECRET=troque-esta-chave-em-producao
```

O caminho `file:./dev.db` e relativo a pasta `prisma/`, portanto o banco local fica em `prisma/dev.db`.

## Funcionalidades prontas

- Cadastro e login com token.
- Dashboard de paciente com refeicoes, peso semanal, chat e vinculo com nutricionista.
- Dashboard de nutricionista com pacientes, planos, avaliacoes, consultas, desafios e mensagens.
- Dashboard de administrador com usuarios e alimentos.
- Frontend estatico servido pelo mesmo servidor Express.
