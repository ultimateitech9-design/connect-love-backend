# Connect Love Backend

## Database setup on a new PC

1. Install MySQL and create/update `.env` from the template:

```powershell
Copy-Item .env.example .env
```

2. Edit `.env` with your local MySQL values:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=dating_web_app
```

3. Install dependencies:

```powershell
npm install
```

4. Create the database, run all migrations, and seed default data:

```powershell
npm run db:setup
```

This command runs:

```powershell
npm run db:create
npm run migration:run
npm run db:seed:core
```

5. Start the backend:

```powershell
npm run dev
```

## Migration commands

Run migrations only:

```powershell
npm run migration:run
```

Revert the last migration:

```powershell
npm run migration:revert
```

Build before production:

```powershell
npm run build
```
