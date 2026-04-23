# volleyPro

A cutting-edge AI-powered volleyball form analysis platform that provides real-time coaching feedback by analyzing player technique against professional standards.

## Project Overview

Volley Pro enables volleyball players to submit 5-second video clips that are analyzed frame-by-frame using advanced computer vision and machine learning. The platform compares player movements against a curated dataset of professional volleyball techniques, generating personalized feedback and recommending instructional content from professional coaches.

## Key Features

- **Video Upload & Processing** - Easy-to-use interface for submitting volleyball clips
- **Frame-by-Frame Analysis** - Detailed examination of player technique across all frames
- **AI-Powered Feedback** - LLM-generated coaching tips and improvement suggestions
- **Professional Comparison** - Benchmarking against best-practice volleyball forms
- **Video Recommendations** - Curated professional volleyball coaching content suggestions
- **User Authentication** - Secure account management via Auth0
- **Cloud Storage** - S3-based video file management
- **Performance Tracking** - Historical analysis and progress monitoring

## Technology Stack

### Frontend

- **TypeScript** - Type-safe development
- **React** - UI component library
- **Next.js** - Full-stack React framework with API routes
- **CSS** - Responsive styling

### Backend

- **Python** - Core analysis engine
- **FastAPI/Flask** - RESTful API endpoints
- **Next.js API Routes** - Serverless backend functions
- **PostgreSQL** - Relational database
- **AWS S3** - Video storage and delivery

### ML & Analysis

- **OpenCV** - Video processing and frame extraction
- **MediaPipe** - Pose detection and skeleton tracking
- **LLM Integration** - AI-powered feedback generation
- **TensorFlow/PyTorch** - Model inference

## Project Structure

```
volleyPro/
├── app/                          # Next.js frontend
│   ├── api/                      # API routes
│   │   ├── auth0/               # Authentication endpoints
│   │   ├── clips/               # Clip management
│   │   ├── uploadVideo/         # Video upload handling
│   │   └── videos/              # Video operations
│   ├── components/
│   │   └── UploadVideo/         # Video upload component
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
│
├── backend/                      # Python backend services
│   ├── app/
│   │   ├── api/
│   │   │   ├── clips.py         # Clip endpoints
│   │   │   ├── stats.py         # Statistics endpoints
│   │   │   └── videos.py        # Video endpoints
│   │   ├── core/
│   │   │   └── config.py        # Configuration
│   │   ├── db/
│   │   │   ├── base.py          # Database models
│   │   │   └── session.py       # DB session management
│   │   ├── models/
│   │   │   ├── clip.py          # Clip model
│   │   │   ├── user.py          # User model
│   │   │   └── video.py         # Video model
│   │   ├── services/
│   │   │   ├── s3.py            # AWS S3 integration
│   │   │   └── video_processing.py  # Analysis engine
│   │   └── main.py              # API entry point
│   ├── alembic/                 # Database migrations
│   └── requirements.txt          # Python dependencies
│
└── README.md                     # This file
```

## Installation

### Prerequisites

- Node.js 18+
- Python 3.9+
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
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Database Setup

```bash
# Run migrations
alembic upgrade head
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

## Current Development Status

### Completed

- ✅ User authentication (Auth0 integration)
- ✅ Video upload pipeline
- ✅ S3 cloud storage integration
- ✅ Basic database models
- ✅ API route scaffolding
- ✅ Frontend UI components

### In Progress

- 🔄 Frame extraction and preprocessing
- 🔄 Pose detection pipeline
- 🔄 Form comparison algorithm
- 🔄 LLM integration for feedback

### TODO

- ⏳ Professional volleyball dataset curation
- ⏳ Advanced form analysis engine
- ⏳ LLM model selection and optimization
- ⏳ Frontend-backend API integration
- ⏳ Database schema finalization
- ⏳ Performance optimization
- ⏳ Unit and integration tests
- ⏳ Deployment pipeline

## Key Challenges

### 1. Dataset Collection

- **Challenge**: Finding/creating a comprehensive dataset of professional volleyball techniques
- **Approach**: Consider collaborating with professional volleyball organizations, synthetic data generation, or OpenAI model fine-tuning

### 2. LLM Selection

- **Challenge**: Selecting cost-effective yet accurate LLM for form analysis feedback
- **Options**:
  - OpenAI GPT-4 (powerful but expensive)
  - Open-source models (Llama, Mistral)
  - Fine-tuned smaller models (cost-effective)

### 3. Cost & Efficiency

- **Challenge**: Managing API costs and inference latency
- **Strategies**:
  - Implement caching for common feedback
  - Batch processing where possible
  - Use edge computing for pose detection
  - Optimize video compression

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
