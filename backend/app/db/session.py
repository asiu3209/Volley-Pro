from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import DATABASE_URL

#Create Database Connection
engine = create_engine(DATABASE_URL)

#Create Session to use DB
SessionLocal = sessionmaker(bind=engine, autoflush=False,autocommit=False)