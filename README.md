# LiveWorksheet Screenshot Service

A full-stack web application for capturing screenshots of LiveWorksheet pages with automated answer injection. Built with React, TypeScript, Express.js, and optimized for Vercel deployment.

## Features

- 📸 Automated screenshot capture with mobile viewport
- 🎯 Answer injection for LiveWorksheet pages
- 📱 Mobile-optimized screenshots
- ⏱️ Real-time queue management
- 📊 Usage statistics and analytics
- 🔄 Automatic image compression and thumbnail generation
- 🌐 Responsive web interface

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **shadcn/ui** components with Tailwind CSS
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Wouter** for client-side routing

### Backend
- **Node.js** with Express.js (development)
- **Vercel Serverless Functions** (production)
- **Puppeteer** with Chromium for screenshot capture
- **Sharp** for image processing and compression
- **PostgreSQL** with Drizzle ORM

## Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env.local`
   - Configure your PostgreSQL database URL
   - Add any additional environment variables

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

4. **Configure environment variables in Vercel Dashboard**:
   - Go to your project settings in Vercel
   - Add `DATABASE_URL` and other required environment variables
   - Redeploy if needed

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database configuration
   ```

3. **Run database migrations**:
   ```bash
   npm run db:push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## Architecture

### Vercel Optimization

The application is optimized for Vercel's serverless environment:

- **API Routes**: Converted to Vercel serverless functions in `/api` directory
- **Static Assets**: Client build served as static files
- **Screenshot Processing**: Uses `@sparticuz/chromium` for Vercel compatibility
- **File Storage**: Temporary storage in `/tmp` (recommend cloud storage for production)
- **Database**: PostgreSQL with connection pooling for serverless functions

### Key Components

- **Screenshot Service**: Handles browser automation and image capture
- **Queue Management**: Manages processing queue and user notifications
- **Storage Layer**: Abstracted storage interface supporting multiple backends
- **Real-time Updates**: Client-side polling for status updates

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `VERCEL_URL`: Automatically set by Vercel
- `NODE_ENV`: Environment mode (development/production)

### Optional Cloud Storage

For production deployments, consider integrating cloud storage:

- **AWS S3**: For scalable image storage
- **Cloudinary**: For advanced image processing
- **Vercel Blob**: For simple file storage

## Performance Optimizations

- **Image Compression**: Automatic PNG optimization with Sharp
- **Mobile Viewport**: Optimized for mobile screenshot capture
- **Resource Blocking**: Blocks unnecessary assets during capture
- **Concurrent Processing**: Supports multiple simultaneous screenshots
- **Caching**: Aggressive caching for static assets

## Security Features

- **Input Validation**: Zod schema validation for all inputs
- **CORS Configuration**: Proper cross-origin resource sharing
- **File Security**: Prevents directory traversal attacks
- **Rate Limiting**: Built-in queue management prevents abuse

## Monitoring

The application includes built-in monitoring:

- **Queue Status**: Real-time queue length and processing times
- **Success Rates**: Screenshot completion statistics
- **User Analytics**: Active user tracking
- **Error Logging**: Comprehensive error tracking and reporting

## Troubleshooting

### Common Issues

1. **Puppeteer fails on Vercel**: Ensure `@sparticuz/chromium` is properly configured
2. **Database connection issues**: Verify `DATABASE_URL` is set correctly
3. **Screenshot timeout**: Increase timeout values in Vercel function configuration
4. **Memory limits**: Consider upgrading Vercel plan for larger screenshots

### Development Tips

- Use `npm run check` to verify TypeScript compilation
- Monitor browser memory usage during development
- Test with various LiveWorksheet URLs for compatibility
- Use browser dev tools to debug screenshot capture issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details