# Orient Compliance LMS - Backend API

A comprehensive Learning Management System backend built with Node.js and Express.js for compliance training and policy management.

## Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based auth with role-based access control
- **Policy Management** - CRUD operations for compliance policies with acknowledgment tracking
- **Training Modules** - Interactive training courses with progress tracking and quizzes
- **Announcements** - Announcements, news, reminders, and internal blogs
- **Reporting & Analytics** - Comprehensive reports and dashboard analytics
- **Incident Management** - Report and track compliance incidents
- **Audit Trail** - Complete logging of user actions for compliance

### Security Features
- JWT token authentication
- Role-based access control (Employee, Manager, Compliance Team)
- Rate limiting for sensitive operations
- Input validation and sanitization
- CORS protection
- Security headers with Helmet.js
- Audit logging for compliance

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, bcryptjs
- **Validation**: express-validator
- **Testing**: Jest, Supertest
- **Development**: Nodemon for auto-restart

## Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/             # Route controllers (future expansion)
├── middleware/
│   └── auth.js             # Authentication middleware
├── models/                 # Database models (future expansion)
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management routes
│   ├── policies.js        # Policy management routes
│   ├── training.js        # Training module routes
│   ├── Announcements.js  # Announcements routes
│   ├── reports.js         # Reporting routes
│   └── analytics.js       # Analytics routes
├── .env                   # Environment variables
├── .env.example          # Environment template
├── package.json          # Dependencies and scripts
├── server.js             # Main server file
└── README.md             # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (optional - uses mock data if not available)
- npm or yarn

### Installation Steps

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env file with your configuration
   # Update JWT_SECRET, database settings, etc.
   ```

3. **Start the Server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Verify Installation**
   - Server should start on http://localhost:3000
   - Health check: GET http://localhost:3000/api/health
   - API documentation: GET http://localhost:3000/api

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users` - Get all users (compliance only)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile

### Policies
- `GET /api/policies` - Get all policies
- `GET /api/policies/:id` - Get policy by ID
- `POST /api/policies` - Create new policy (compliance only)
- `PUT /api/policies/:id` - Update policy (compliance only)
- `POST /api/policies/:id/acknowledge` - Acknowledge policy

### Training
- `GET /api/training` - Get all training modules
- `GET /api/training/:id` - Get training by ID
- `POST /api/training/:id/start` - Start training
- `PUT /api/training/:id/progress` - Update progress
- `POST /api/training/:id/quiz` - Submit quiz

### Announcements
- `GET /api/Announcements` - Get all Announcements
- `GET /api/Announcements/:id` - Get announcement by ID
- `POST /api/Announcements/:id/read` - Mark as read
- `GET /api/Announcements/blogs/all` - Get all blog posts

### Reports
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get report by ID
- `POST /api/reports/generate` - Generate new report
- `GET /api/reports/incidents/all` - Get incident reports

### Analytics
- `GET /api/analytics/dashboard` - Dashboard analytics
- `GET /api/analytics/users` - User analytics
- `GET /api/analytics/policies` - Policy analytics
- `GET /api/analytics/training` - Training analytics

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Demo Credentials
- **Compliance Team**: compliance@orient.com / password123
- **Employee**: employee@orient.com / password123

## Role-Based Access Control

### Roles
- **Employee**: Basic access to policies, training, Announcements
- **Manager**: Employee access + team management features
- **Compliance**: Full access to all features and admin functions

### Protected Routes
- Most GET endpoints are accessible to authenticated users
- POST/PUT/DELETE operations require appropriate roles
- Compliance-only features are clearly marked in route handlers

## Development

### Running Tests
```bash
npm test
```

### Code Style
- ESLint configuration for consistent code style
- Prettier for code formatting

### Development Mode
```bash
npm run dev
```
Uses nodemon for automatic server restart on file changes.

## Database

### MongoDB Setup (Optional)
The backend works with or without MongoDB:

1. **With MongoDB**: Full persistence and production-ready
2. **Without MongoDB**: Uses mock data for development/demo

### Mock Data
When MongoDB is not available, the system uses comprehensive mock data including:
- User accounts with different roles
- Sample policies and acknowledgments
- Training modules with progress tracking
- Announcements and blog posts
- Reports and analytics data

## Security Considerations

### Production Deployment
1. **Environment Variables**: Update all secrets in .env
2. **JWT Secret**: Use a strong, unique JWT secret
3. **Database**: Secure MongoDB connection
4. **HTTPS**: Enable SSL/TLS in production
5. **Rate Limiting**: Configure appropriate limits
6. **CORS**: Restrict to specific domains

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Rate limiting on sensitive endpoints
- Input validation and sanitization

## Monitoring & Logging

### Health Checks
- `GET /api/health` - Server health status
- Database connection monitoring
- Automatic error logging

### Audit Trail
All user actions are logged for compliance:
- User authentication events
- Policy acknowledgments
- Training completions
- Administrative actions

## Deployment

### Environment Variables
Ensure all required environment variables are set:
- `NODE_ENV=production`
- `JWT_SECRET` (strong secret key)
- `MONGODB_URI` (production database)
- Email configuration for notifications

### Process Management
Consider using PM2 for production deployment:
```bash
npm install -g pm2
pm2 start server.js --name "orient-lms-backend"
```

## Support

For technical support or questions:
- Check the API health endpoint: `/api/health`
- Review server logs for error details
- Ensure all environment variables are properly configured

## License

This project is proprietary software for Orient Compliance LMS.