# ModVault Backend Setup Guide

This guide will walk you through setting up the complete backend infrastructure for ModVault, including the database, authentication, content aggregation, and AI-powered search.

## 🗄️ Database Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE modvault;
CREATE USER modvault_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE modvault TO modvault_user;
ALTER USER modvault_user CREATEDB;
\q
```

### 3. Install Prisma CLI

```bash
npm install -g prisma
```

### 4. Set Up Environment Variables

Copy the environment template and configure your values:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
# Database
DATABASE_URL="postgresql://modvault_user:your_secure_password@localhost:5432/modvault"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-secret-key"

# OAuth Providers (Optional for development)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI API (Required for AI features)
OPENAI_API_KEY="your-openai-api-key"

# CurseForge API (Optional)
CURSEFORGE_API_KEY="your-curseforge-api-key"
```

### 5. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed database with sample data
npx tsx scripts/init-db.ts
```

## 🔐 Authentication Setup

### 1. Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

### 2. Discord OAuth (Optional)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 → General
4. Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
5. Copy Client ID and Client Secret to `.env`

### 3. Generate NextAuth Secret

```bash
# Generate a secure secret
openssl rand -base64 32
```

Add the generated secret to `.env` as `NEXTAUTH_SECRET`.

## 🤖 AI Features Setup

### 1. OpenAI API

1. Sign up at [OpenAI](https://openai.com/)
2. Get your API key from the dashboard
3. Add to `.env` as `OPENAI_API_KEY`

### 2. Vector Database (Optional - for production)

For development, we'll use in-memory embeddings. For production, consider:

- **Pinecone**: Vector database optimized for ML applications
- **Weaviate**: Open-source vector database
- **Qdrant**: Fast vector similarity search

## 📡 Content Aggregation Setup

### 1. CurseForge API

1. Go to [CurseForge Developer Portal](https://docs.curseforge.com/)
2. Request an API key
3. Add to `.env` as `CURSEFORGE_API_KEY`

### 2. Scraping Configuration

The content aggregator is configured to respect rate limits and robots.txt. You can adjust scraping intervals in `scripts/init-db.ts`:

```typescript
scrapeInterval: 3600, // 1 hour between scrapes
rateLimit: 100,       // Max requests per hour
```

## 🚀 Running the Backend

### 1. Development Mode

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate new migration after schema changes
npx prisma migrate dev --name description_of_changes
```

### 3. Content Aggregation

```bash
# Run content aggregation manually
npx tsx -e "
import { contentAggregator } from './lib/services/contentAggregator';
contentAggregator.runAggregation();
"
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### Mods
- `GET /api/mods` - List/search mods
- `POST /api/mods` - Create new mod (creators only)
- `GET /api/mods/[id]` - Get mod details
- `PUT /api/mods/[id]` - Update mod (creator only)
- `DELETE /api/mods/[id]` - Delete mod (creator only)

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/creator` - Become a creator

### Collections
- `GET /api/collections` - List user collections
- `POST /api/collections` - Create collection
- `GET /api/collections/[id]` - Get collection
- `PUT /api/collections/[id]` - Update collection
- `DELETE /api/collections/[id]` - Delete collection

### AI Search
- `POST /api/search/ai` - AI-powered search
- `GET /api/search/recommendations` - Get personalized recommendations
- `GET /api/search/similar/[modId]` - Find similar mods

## 📊 Monitoring and Logging

### 1. Database Monitoring

```bash
# Check database connection
npx prisma db pull

# View database schema
npx prisma format
```

### 2. API Logging

The backend includes comprehensive logging for:
- API requests and responses
- Database queries (in development)
- Content aggregation jobs
- AI search operations

### 3. Error Handling

All API endpoints include proper error handling with:
- HTTP status codes
- Descriptive error messages
- Logging for debugging

## 🧪 Testing

### 1. API Testing

```bash
# Test API endpoints
curl http://localhost:3000/api/mods
curl http://localhost:3000/api/mods?search=furniture
```

### 2. Database Testing

```bash
# Test database connection
npx prisma db seed

# Run sample queries
npx tsx -e "
import { prisma } from './lib/prisma';
const mods = await prisma.mod.findMany();
console.log('Found mods:', mods.length);
"
```

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Rotate API keys regularly

### 2. Rate Limiting
- Content aggregation respects platform rate limits
- API endpoints include basic rate limiting
- Consider implementing Redis-based rate limiting for production

### 3. Input Validation
- All API inputs are validated using Prisma schemas
- SQL injection protection via Prisma ORM
- XSS protection via Next.js built-in security

## 🚀 Production Deployment

### 1. Database
- Use managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
- Enable connection pooling
- Set up automated backups

### 2. Environment
- Use production-grade secrets management
- Enable HTTPS only
- Set up proper CORS policies

### 3. Monitoring
- Implement application performance monitoring (APM)
- Set up error tracking (Sentry)
- Monitor database performance

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check PostgreSQL status
brew services list postgresql
sudo systemctl status postgresql

# Test connection
psql -h localhost -U modvault_user -d modvault
```

**Prisma Migration Issues:**
```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

**Content Aggregation Fails:**
- Check API keys in `.env`
- Verify rate limits aren't exceeded
- Check network connectivity

**AI Search Not Working:**
- Verify OpenAI API key
- Check API quota and billing
- Ensure text input is within token limits

## 📚 Next Steps

1. **Set up the database** using the steps above
2. **Configure environment variables** for your development setup
3. **Run the initialization script** to populate sample data
4. **Test the API endpoints** to ensure everything works
5. **Customize the content aggregation** for your specific needs
6. **Implement additional features** like payment processing or advanced analytics

## 🆘 Getting Help

- Check the [Prisma documentation](https://www.prisma.io/docs/)
- Review [NextAuth.js documentation](https://next-auth.js.org/)
- Check the [OpenAI API documentation](https://platform.openai.com/docs/)
- Review the codebase for examples and patterns

---

**Happy coding! 🎮✨**
