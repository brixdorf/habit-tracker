import session from 'express-session';

const { Store } = session;

export class SqliteSessionStore extends Store {
  constructor(db) {
    super();
    this.db = db;
    this.statements = {
      get: db.prepare('SELECT session, expires FROM sessions WHERE sid = ?'),
      set: db.prepare(
        'INSERT INTO sessions (sid, session, expires) VALUES (?, ?, ?) ' +
          'ON CONFLICT(sid) DO UPDATE SET session = excluded.session, expires = excluded.expires'
      ),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      touch: db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
      clearExpired: db.prepare('DELETE FROM sessions WHERE expires < ?'),
    };
    this.cleanupInterval = setInterval(() => {
      this.statements.clearExpired.run(Date.now());
    }, 60 * 60 * 1000).unref();
  }

  get(sid, callback) {
    try {
      const row = this.statements.get.get(sid);
      if (!row || row.expires < Date.now()) {
        return callback(null, null);
      }
      callback(null, JSON.parse(row.session));
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const expires = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + 30 * 24 * 60 * 60 * 1000;
      this.statements.set.run(sid, JSON.stringify(sessionData), expires);
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid, callback) {
    try {
      this.statements.destroy.run(sid);
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid, sessionData, callback) {
    try {
      const expires = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + 30 * 24 * 60 * 60 * 1000;
      this.statements.touch.run(expires, sid);
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }
}
