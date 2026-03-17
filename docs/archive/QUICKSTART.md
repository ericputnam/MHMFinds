# ModVault Quick Start Guide

Get ModVault running on your local machine in under 10 minutes!

## 🚀 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Modern browser** (Chrome, Firefox, Safari, Edge)

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd ModVault
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/modvault"

# Redis
REDIS_URL="redis://localhost:6379"

# OpenAI (for AI features)
OPENAI_API_KEY="your-openai-api-key"

# CurseForge API
CURSEFORGE_API_KEY="your-curseforge-api-key"

# Stripe (for payments)
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## 🏗️ Project Structure

```
ModVault/
├── app/                    # Next.js 13+ app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/             # React components
│   ├── Hero.tsx           # Landing hero section
│   ├── Features.tsx       # Features showcase
│   ├── HowItWorks.tsx     # User journey explanation
│   ├── Stats.tsx          # Statistics display
│   ├── Testimonials.tsx   # User testimonials
│   ├── Pricing.tsx        # Pricing plans
│   ├── CTA.tsx            # Call-to-action
│   └── Footer.tsx         # Site footer
├── docs/                   # Documentation
├── package.json            # Dependencies
├── tailwind.config.js      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project overview
```

## 🎨 Customization

### Colors & Branding
Edit `tailwind.config.js` to customize:
- Primary colors (blues)
- Secondary colors (purples)
- Accent colors (oranges)
- Dark theme colors

### Content
- Update hero text in `components/Hero.tsx`
- Modify features in `components/Features.tsx`
- Adjust pricing in `components/Pricing.tsx`
- Customize testimonials in `components/Testimonials.tsx`

### Styling
- Global styles in `app/globals.css`
- Component-specific styles using Tailwind classes
- Custom animations in CSS keyframes

## 🔧 Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 📱 Responsive Design

The landing page is fully responsive with:
- Mobile-first design approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interactions
- Optimized for all device sizes

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Other Platforms
- **Netlify**: `npm run build` → deploy `out/` folder
- **AWS Amplify**: Connect GitHub repository
- **Docker**: Use provided Dockerfile

## 🐛 Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Dependencies not installing:**
```bash
# Clear npm cache
npm cache clean --force
# Reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
# Check types
npm run type-check
# Fix auto-fixable issues
npm run lint -- --fix
```

### Getting Help

- Check the [README.md](README.md) for detailed project information
- Review [docs/CONTENT_AGGREGATION_STRATEGY.md](docs/CONTENT_AGGREGATION_STRATEGY.md) for technical details
- Open an issue on GitHub for bugs or feature requests

## 🎯 Next Steps

1. **Explore Components**: Check out each component to understand the structure
2. **Customize Content**: Update text, images, and branding to match your vision
3. **Add Features**: Implement authentication, database, and AI features
4. **Deploy**: Get your landing page live on the web!

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Happy coding!** 🎮✨

Need help? Reach out to the ModVault team or check our documentation.
