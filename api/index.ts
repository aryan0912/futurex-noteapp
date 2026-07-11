import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import firebaseConfig from '../firebase-applet-config.json';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CORS setup
app.use(cors());
app.use(express.json());

// Neon DB connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

const sql = neon(databaseUrl);

// Database schema auto-initialization
async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        pinned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
  }
}

// JWKS Client for Google secure token
const client = jwksClient({
  jwksUri: 'https://www.googleapis.com/service-accounts/keys/securetoken@system.gserviceaccount.com'
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

// Auth Middleware to verify Firebase JWT tokens
interface AuthenticatedRequest extends Request {
  user?: any;
}

const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Support direct email bypass auth for local development
  if (token.startsWith('mock:')) {
    const email = token.substring(5);
    // Standardize mock UID based on the email
    const mockUid = 'mock-uid-' + Buffer.from(email).toString('hex').substring(0, 24);
    req.user = {
      uid: mockUid,
      email: email
    };
    return next();
  }

  const projectId = firebaseConfig.projectId;

  jwt.verify(
    token,
    getKey,
    {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      algorithms: ['RS256']
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token', details: err.message });
      }
      req.user = decoded;
      next();
    }
  );
};

// --- CRUD Endpoints ---

// 1. Get Notes for Authenticated User
app.get('/api/notes', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.uid;
    const notesList = await sql`
      SELECT * FROM notes 
      WHERE user_id = ${userId} 
      ORDER BY updated_at DESC
    `;
    
    // Map database columns to match client interface
    const formattedNotes = notesList.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      userId: n.user_id,
      pinned: n.pinned,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));

    res.json(formattedNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Create Note
app.post('/api/notes', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.uid;
    const { id, title, content, pinned } = req.body;

    // Security Invariants Check (matching security_spec.md)
    if (!id || typeof id !== 'string' || id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    if (title === undefined || typeof title !== 'string' || title.length > 500) {
      return res.status(400).json({ error: 'Invalid title schema' });
    }
    if (content === undefined || typeof content !== 'string' || content.length > 100000) {
      return res.status(400).json({ error: 'Invalid content schema' });
    }
    if (pinned === undefined || typeof pinned !== 'boolean') {
      return res.status(400).json({ error: 'Invalid pinned format' });
    }

    const now = new Date();

    await sql`
      INSERT INTO notes (id, title, content, user_id, pinned, created_at, updated_at)
      VALUES (${id}, ${title}, ${content}, ${userId}, ${pinned}, ${now}, ${now})
    `;

    res.status(201).json({
      id,
      title,
      content,
      userId,
      pinned,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Update Note
app.put('/api/notes/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { title, content, pinned } = req.body;

    // Check ownership first
    const existing = await sql`
      SELECT user_id FROM notes WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Note ownership mismatch' });
    }

    // Build dynamic update statements safely
    const updates: Record<string, any> = {
      updated_at: new Date()
    };

    if (title !== undefined) {
      if (typeof title !== 'string' || title.length > 500) {
        return res.status(400).json({ error: 'Invalid title schema' });
      }
      updates.title = title;
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.length > 100000) {
        return res.status(400).json({ error: 'Invalid content schema' });
      }
      updates.content = content;
    }

    if (pinned !== undefined) {
      if (typeof pinned !== 'boolean') {
        return res.status(400).json({ error: 'Invalid pinned format' });
      }
      updates.pinned = pinned;
    }

    // Execute update
    if (Object.keys(updates).length > 1) {
      if (updates.title !== undefined) {
        await sql`UPDATE notes SET title = ${updates.title}, updated_at = ${updates.updated_at} WHERE id = ${id}`;
      }
      if (updates.content !== undefined) {
        await sql`UPDATE notes SET content = ${updates.content}, updated_at = ${updates.updated_at} WHERE id = ${id}`;
      }
      if (updates.pinned !== undefined) {
        await sql`UPDATE notes SET pinned = ${updates.pinned}, updated_at = ${updates.updated_at} WHERE id = ${id}`;
      }
    } else {
      await sql`UPDATE notes SET updated_at = ${updates.updated_at} WHERE id = ${id}`;
    }

    res.json({ success: true, updatedAt: updates.updated_at });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Delete Note
app.delete('/api/notes/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const existing = await sql`
      SELECT user_id FROM notes WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Note ownership mismatch' });
    }

    await sql`
      DELETE FROM notes WHERE id = ${id}
    `;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serves built client in production
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start listening if running locally
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  initDb().then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  });
} else {
  // Serverless environment initialization
  initDb();
}

export default app;
