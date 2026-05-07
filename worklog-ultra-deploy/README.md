# WorkLog Ultra Full Source + Database Package

Includes:
- backend source code
- database schema and migrations
- current PostgreSQL dump if `worklog-db.sql` exists

Server flow:
1. Upload and extract zip
2. Restore `database/worklog-db.sql` if you want current data
3. Go to `backend`
4. `npm install`
5. Create `.env`
6. `npx prisma generate --schema=../database/schema.prisma`
7. `npx prisma db push --schema=../database/schema.prisma`
8. `npm run build`
9. Start with PM2
