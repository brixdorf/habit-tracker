import { Router } from 'express';
import bcrypt from 'bcryptjs';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    return res.status(500).json({ error: 'Auth is not configured on the server.' });
  }

  if (username !== expectedUsername || !bcrypt.compareSync(password, expectedHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not create session.' });
    }
    req.session.authenticated = true;
    res.json({ ok: true });
  });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('habit_tracker.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', (req, res) => {
  res.json({ authenticated: Boolean(req.session?.authenticated) });
});

export function requireAuth(req, res, next) {
  if (req.session?.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated.' });
}
