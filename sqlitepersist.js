const sqlite3 = require('sqlite3').verbose();

// Open (or create) the database file
const db = new sqlite3.Database('./ydoc.db', (err) => {
  if (err) {
    console.error('Could not connect to SQLite db:', err);
  } else {
    console.info('Connected to SQLite db.');
  }
});

// Create table with a TEXT column for the Monaco text.
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS ydocs (
      docName TEXT PRIMARY KEY,
      doc_update TEXT
    )`
  );
});

// Helper function to update the snapshot with the Monaco text.
const updateSnapshot = (docName, ydoc) => {
  const monacoText = ydoc.getText('monaco').toString();
  db.run(
    'INSERT OR REPLACE INTO ydocs (docName, doc_update) VALUES (?, ?)',
    [docName, monacoText],
    err => {
      if (err) console.error('Error updating snapshot for', docName, err);
    }
  );
};

const sqlitePersistence = {
  /**
   * Loads an existing snapshot (if any) from SQLite and applies it to the document.
   * Also sets an update listener so that every document update writes the latest
   * Monaco text into the database.
   *
   * @param {string} docName - The document name.
   * @param {Y.Doc} ydoc - The Y.Doc instance.
   * @returns {Promise<void>}
   */
  bindState: async (docName, ydoc) => {
    // Load previous snapshot if it exists.
    await new Promise((resolve, reject) => {
      db.get(
        'SELECT doc_update FROM ydocs WHERE docName = ?',
        [docName],
        (err, row) => {
          if (err) return reject(err);
          if (row) {
            // If needed you can apply the text content to a Y.Text type.
            const existingText = row.doc_update;
            // For example, you might replace the entire content:
            ydoc.getText('monaco').delete(0, ydoc.getText('monaco').toString().length);
            ydoc.getText('monaco').insert(0, existingText);
          }
          resolve();
        }
      );
    });
    // Update the snapshot on every update event.
    ydoc.on('update', () => {
      updateSnapshot(docName, ydoc);
    });
    // Store an initial snapshot.
    updateSnapshot(docName, ydoc);
  },

  /**
   * Forces a snapshot update.
   *
   * @param {string} docName 
   * @param {Y.Doc} ydoc 
   * @returns {Promise<void>}
   */
  writeState: async (docName, ydoc) => {
    updateSnapshot(docName, ydoc);
    return Promise.resolve();
  }
};

module.exports = sqlitePersistence;