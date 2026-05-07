## Database Upload

This folder contains Prisma schema and SQL migration files.

Recommended production setup:

1. Create PostgreSQL database
2. Enable `pgcrypto` if required
3. Use `schema.prisma` and migrations
4. Run seed if you want default departments

Useful commands:

```bash
npx prisma db push
npm run db:seed
```
