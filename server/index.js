import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET must be set in production. Refusing to start with an insecure default.');
  process.exit(1);
}

const { createApp } = await import('./src/app.js');

const app = createApp();
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Habit Tracker server listening on port ${port}`);
});
