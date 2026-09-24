# API REST - Visitas Técnicas

Backend em **Node.js + TypeScript + Express + MongoDB/Mongoose**.

## O que está implementado

- Cadastro de usuários com senha criptografada com bcrypt.
- Login com JWT de 7 dias.
- `/api/auth/me` para validar a sessão.
- CRUD de visitas por usuário.
- ID numérico sequencial de visita.
- Pesquisa por ID ou nome da fábrica.
- CRUD de locais dentro da visita.
- Formulários/questões armazenados em `answers` no MongoDB.
- Status automático da visita: `agendada`, `em_andamento` ou `concluida`.
- Fotos e documentos armazenados **dentro do MongoDB usando GridFS**.
- Metadados dos anexos armazenados junto ao local da visita.
- Download/visualização autenticada em `/api/files/:fileId`.

## Requisitos

- Node.js 18+ (recomendado 20+).
- MongoDB local ou MongoDB Atlas.

## Instalação

```bash
cd visitas-server
npm install
copy .env.example .env
npm run dev
```

No Linux/macOS, use `cp .env.example .env`.

Edite `.env` e coloque sua `MONGO_URI` e uma `JWT_SECRET` forte.

## Produção

```bash
npm run build
npm start
```

## Endpoints principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health`
- `GET /api/visits?search=`
- `POST /api/visits`
- `GET /api/visits/:id`
- `PUT /api/visits/:id`
- `DELETE /api/visits/:id`
- `POST /api/visits/:id/locations`
- `PUT /api/visits/:id/locations/:locId`
- `DELETE /api/visits/:id/locations/:locId`
- `POST /api/visits/:id/locations/:locId/documents` (multipart `file`, `type=photo|document`)
- `DELETE /api/visits/:id/locations/:locId/documents/:docId`
- `GET /api/files/:fileId`

As rotas protegidas usam:

```text
Authorization: Bearer <JWT>
```
