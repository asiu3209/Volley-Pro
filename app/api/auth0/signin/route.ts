import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check environment variables
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;
    const audience = process.env.AUTH0_AUDIENCE;
    const jwtSecret = process.env.JWT_SECRET;

    if (!domain || !clientId || !clientSecret || !audience || !jwtSecret) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Use Auth0's token endpoint with Resource Owner Password Grant
    const tokenUrl = `https://${domain}/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'password',
        username: email,
        password: password,
        client_id: clientId,
        client_secret: clientSecret,
        audience: audience,
        scope: 'openid profile email',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Auth0 token error:', data);
      
      // Handle specific errors
      if (data.error === 'invalid_grant') {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      if (data.error === 'unauthorized_client') {
        return NextResponse.json(
          { 
            error: 'Password grant not enabled. Check Auth0 Settings → Grant Types',
            details: data.error_description 
          },
          { status: 401 }
        );
      }

      if (data.error === 'access_denied') {
        return NextResponse.json(
          { 
            error: 'Access denied. Check Auth0 Settings → Default Directory',
            details: data.error_description 
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          error: data.error_description || 'Authentication failed',
          errorCode: data.error 
        },
        { status: response.status }
      );
    }

    // Decode the ID token to get user info
    const idToken = data.id_token;
    const decoded = jwt.decode(idToken) as any;

    // Create our own JWT for the app
    const appToken = jwt.sign(
      {
        userId: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.email?.split('@')[0],
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Return tokens
    return NextResponse.json({
      success: true,
      token: appToken,
      user: {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.email?.split('@')[0],
      },
    });

  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}