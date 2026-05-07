# volleyPro

A cutting-edge AI-powered volleyball form analysis platform that provides real-time coaching feedback by analyzing player technique against professional standards.

## Project Overview

Volley Pro enables volleyball players to submit 5-second video clips that are analyzed frame-by-frame using advanced computer vision and LLMs. The platform compares player movements against a curated dataset of professional volleyball techniques, generating personalized feedback and recommending instructional content from professional coaches.

## Key Features

- **Video Upload & Processing** - Easy-to-use interface for submitting volleyball clips, clips are limited to about 10 seconds
- **Frame-by-Frame Analysis** - Detailed examination of player technique across all frames
- **AI-Powered Feedback** - LLM-generated coaching tips and improvement suggestions.
- **Professional Comparison** - Benchmarking against best-practice volleyball forms from the very top players of our time
- **Video Recommendations** - Curated professional volleyball coaching content suggestions
- **User Authentication** - Secure account management via Auth0
- **Performance Tracking** - Historical analysis and progress monitoring

## Technology Stack

### Frontend

- **TypeScript** - Type-safe development
- **React** - UI component library
- **Next.js** - Full-stack React framework with API routes
- **CSS** - Responsive styling

### Backend

- **Python** - Core analysis engine
- **FastAPI** - RESTful API endpoints
- **Next.js API Routes** - Serverless backend functions
- **Supabase** - User Database and User Login
- **AWS S3** - Video storage and delivery

### ML & Analysis

- **OpenCV** - Video processing and frame extraction
- **MediaPipe** - Pose detection and skeleton tracking
- **LLM Integration** - AI-powered feedback generation using Gemini
- **TensorFlow/PyTorch** - Model inference

## Installation

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 12+
- AWS account (for S3)
- Auth0 account

### Frontend Setup

```bash
cd app
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database Setup

```bash

```

### Environment Configuration

Create `.env.local` in the app directory:

```
NEXT_PUBLIC_AUTH0_DOMAIN=your_auth0_domain
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
DATABASE_URL=postgresql://user:password@localhost/volleypro
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
```

## Usage

1. **Upload Video**
   - Navigate to the upload page
   - Select a 5-second volleyball clip
   - Click upload

2. **Receive Analysis**
   - System processes video frame-by-frame
   - AI compares against professional standards
   - Feedback is generated and displayed

3. **View Recommendations**
   - Receive personalized coaching tips
   - Access suggested professional videos
   - Track improvement over time

## API Endpoints

### Authentication

- `POST /api/auth0/signin` - Sign in user
- `POST /api/auth0/signup` - Register new user

### Videos

- `POST /api/uploadVideo` - Upload video file
- `POST /api/videos/save` - Save video metadata
- `POST /api/videos/presign` - Get presigned S3 URL

### Clips

- `POST /api/clips` - Create clip analysis request
- `GET /api/clips/:id` - Retrieve clip analysis results

### Statistics

- `GET /api/stats/user` - Get user statistics
- `GET /api/stats/progress` - Get improvement metrics

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the development team.

---
