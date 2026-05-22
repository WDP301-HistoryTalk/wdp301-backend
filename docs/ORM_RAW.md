# DB Design Decisions

## Single MongoDB — why not split?

The ERD has a `VectorChunk` table with an `embedding: Array` field (AI/RAG data). The question is whether to keep it in the same DB or use a dedicated vector store (Qdrant, Pinecone, Weaviate).

**Decision: single MongoDB for everything.**

Reasons:
- MongoDB Atlas supports `$vectorSearch` natively (v6+). No extra service needed.
- For local dev (Docker mongo:7), vectors are stored and similarity is computed in app code or skipped.
- One connection string, one backup, one place to look — simpler ops for a medium project.
- Easy to migrate VectorChunk to a dedicated vector DB later if scale demands it; the interface layer doesn't change.

## Relational ERD → MongoDB adaptations

| ERD (relational)            | MongoDB approach                                      | Why                                                 |
|-----------------------------|-------------------------------------------------------|-----------------------------------------------------|
| `ContextCharacterMapping`   | `characterIds: ObjectId[]` in `HistoricalContext`     | Many-to-many via array ref; primary query is "chars in context X" |
| `Question` (separate table) | Embedded in `Quiz.questions[]`                        | Always loaded with quiz, never queried independently |
| `AnswerDetail` (separate)   | Embedded in `QuizSession.answers[]`                   | Immutable history, always scoped to one session     |
| All other FKs               | `ObjectId` ref fields (standard Mongoose populate)    |                                                     |

## Collections overview

```
tiers              — subscription plans (free / plus / pro)
users              — all user roles (customer, content_admin, system_admin)
orders             — tier upgrade payment orders
transactions       — payment webhook records
historicalcontexts — historical periods/events, holds characterIds[]
characters         — historical figures
documents          — uploaded source files for RAG
vectorchunks       — embedding chunks; Atlas Vector Search index on `embedding`
chatsessions       — AI chat sessions (user × context × character)
messages           — individual messages per session (separate collection, can grow large)
quizzes            — quiz with embedded questions[]
quizsessions       — quiz attempt with embedded answers[]
```

## Indexes

| Collection          | Index                              | Purpose                          |
|---------------------|------------------------------------|----------------------------------|
| users               | email (unique)                     | login lookup                     |
| historicalcontexts  | era (asc), name (text)             | filter by era, full-text search  |
| characters          | name (text)                        | full-text search                 |
| documents           | (entityId, entityType) compound    | fetch docs for a given entity    |
| vectorchunks        | docId (asc), (docId, seqNum)       | chunk retrieval in order         |
| vectorchunks        | Atlas Vector Search on `embedding` | semantic similarity (Atlas only) |
| messages            | sessionId (asc)                    | fetch all messages in a session  |
| quizzes             | contextId (asc)                    | list quizzes for a context       |
| quizsessions        | quizId (asc), uid (asc)            | user history, leaderboard        |

## Dev workflow

```bash
# Start local MongoDB
docker compose up -d

# First time or after reset — populate tiers + admin user
npm run db:seed

# Wipe everything and re-seed (local only)
npm run db:reset

# Optional: open mongo-express at http://localhost:8081
docker compose --profile tools up -d
```

Default admin credentials (local dev): `admin@historytalk.dev` / `admin123456`

## Atlas Vector Search setup (production)

After deploying to Atlas, create a vector index on the `vectorchunks` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "entityId"
    }
  ]
}
```

Adjust `numDimensions` to match your embedding model (OpenAI text-embedding-3-small = 1536, text-embedding-3-large = 3072).
