import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

mongoose.set('bufferCommands', false);

const mongoUri = process.env.MONGODB_URI?.trim();
let useMongoDB = !!mongoUri;

// Set short timeout to fail fast if MongoDB is unreachable
const connectOptions = {
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000,
};

let connectPromise = null;

if (useMongoDB) {
  console.log('MongoDB URI found. Attempting to connect with 3s timeout...');

  // Register error listener on connection to avoid uncaught exception crashes
  mongoose.connection.on('error', (err) => {
    // Suppress fatal-looking logs, since we have a robust local JSON fallback
    console.log('[Database Info] Mongoose connection offline/unreachable:', err.message);
  });

  connectPromise = mongoose.connect(mongoUri, connectOptions)
    .then(async () => {
      console.log('Successfully connected to MongoDB!');
      try {
        if (mongoose.connection.db) {
          const collections = await mongoose.connection.db.listCollections().toArray();
          const collectionNames = collections.map(c => c.name);
          if (collectionNames.includes('paymentmethods')) {
            const indexes = await mongoose.connection.db.collection('paymentmethods').indexes();
            const nameIndex = indexes.find(i => i.name === 'name_1' && i.unique);
            if (nameIndex) {
              await mongoose.connection.db.collection('paymentmethods').dropIndex('name_1').catch(() => {});
            }
          }
          if (collectionNames.includes('expensecategories')) {
            const indexes = await mongoose.connection.db.collection('expensecategories').indexes();
            const nameIndex = indexes.find(i => i.name === 'name_1' && i.unique);
            if (nameIndex) {
              await mongoose.connection.db.collection('expensecategories').dropIndex('name_1').catch(() => {});
            }
          }

          // Handle Users collection indexes (fix E11000 duplicate key error on email: null)
          if (collectionNames.includes('users')) {
            const usersColl = mongoose.connection.db.collection('users');
            try {
              // 1. Unset null or empty emails on existing user records
              await usersColl.updateMany(
                { $or: [{ email: null }, { email: '' }, { email: { $exists: true, $type: 10 } }] },
                { $unset: { email: "" } }
              );

              // 2. Drop any legacy non-partial email index
              const userIndexes = await usersColl.indexes();
              const legacyEmailIdx = userIndexes.find(i => i.name === 'email_1' || (i.key && i.key.email && !i.partialFilterExpression));
              if (legacyEmailIdx) {
                console.log(`[Database Migration] Dropping legacy email index '${legacyEmailIdx.name}' on users...`);
                await usersColl.dropIndex(legacyEmailIdx.name).catch(() => {});
              }

              // 3. Create a safe partial unique index that only indexes actual non-empty email strings
              await usersColl.createIndex(
                { email: 1 },
                {
                  unique: true,
                  sparse: true,
                  partialFilterExpression: { email: { $type: 'string', $gt: '' } },
                  background: true
                }
              ).catch(() => {});
            } catch (userIndexErr) {
              console.log('[Database Info] Note on users index setup:', userIndexErr.message);
            }
          }

          // Also clean up any legacy unique email or khataId indexes on customers and suppliers if present
          for (const collName of ['customers', 'suppliers', 'employees']) {
            if (collectionNames.includes(collName)) {
              try {
                const coll = mongoose.connection.db.collection(collName);
                const collIndexes = await coll.indexes();
                for (const idx of collIndexes) {
                  if (idx.name === 'email_1' || (idx.key && idx.key.email && !idx.partialFilterExpression)) {
                    await coll.dropIndex(idx.name).catch(() => {});
                  }
                }
              } catch (cErr) {
                // Ignore
              }
            }
          }
        }
      } catch (idxErr) {
        // Ignore index check errors
      }
    })
    .catch(err => {
      // Gracefully handle the error and switch to local database fallback
      useMongoDB = false;
      console.log('[Database Fallback] Remote MongoDB cluster is currently unreachable (likely due to IP whitelist restrictions).');
      console.log('[Database Fallback] Continuing securely with the local JSON database (files stored in /data folder).');
    });
} else {
  console.log('No MONGODB_URI environment variable detected.');
  console.log('Using persistent local JSON database (files stored in /data folder).');
  connectPromise = Promise.resolve();
}

export async function ensureDBConnected() {
  if (connectPromise) {
    await connectPromise;
  }
}

// Local File Database setup
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return [];
  }
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

// Wrapper to standardise Mongo vs Local operations
class ModelWrapper {
  constructor(name, mongooseModel) {
    this.name = name;
    this.filename = `${name.toLowerCase()}s.json`;
    this.mongooseModel = mongooseModel;
  }

  async find(query = {}) {
    await ensureDBConnected();
    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.find(query).lean();
    }
    const data = readJSON(this.filename);
    return data.filter(item => {
      for (const key in query) {
        if (query[key] !== undefined) {
          const qVal = query[key];
          if (qVal && typeof qVal === 'object' && !Array.isArray(qVal)) {
            if (qVal.$ne !== undefined && item[key] === qVal.$ne) return false;
          } else if (item[key] !== qVal) {
            return false;
          }
        }
      }
      return true;
    });
  }

  async findOne(query) {
    await ensureDBConnected();
    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.findOne(query).lean();
    }
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  async findById(id) {
    await ensureDBConnected();
    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.findById(id).lean();
    }
    const items = await this.find();
    return items.find(item => item.id === id || item._id === id) || null;
  }

  async create(doc) {
    await ensureDBConnected();
    const cleanDoc = { ...doc };
    // If email is empty, whitespace, or null, remove it so Mongo doesn't index a null value
    if (cleanDoc.email !== undefined && (!cleanDoc.email || !String(cleanDoc.email).trim())) {
      delete cleanDoc.email;
    }

    if (useMongoDB && mongoose.connection.readyState === 1) {
      const result = await this.mongooseModel.create(cleanDoc);
      return result.toObject();
    }
    const data = readJSON(this.filename);
    const newId = Math.random().toString(36).substring(2, 11);
    const newDoc = {
      ...cleanDoc,
      id: newId,
      _id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.push(newDoc);
    writeJSON(this.filename, data);
    return newDoc;
  }

  async findByIdAndUpdate(id, update) {
    await ensureDBConnected();
    const cleanUpdate = { ...update };
    const mongoOptions = { new: true };

    if (cleanUpdate.email !== undefined && (!cleanUpdate.email || !String(cleanUpdate.email).trim())) {
      delete cleanUpdate.email;
      cleanUpdate.$unset = { ...(cleanUpdate.$unset || {}), email: "" };
    }

    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.findByIdAndUpdate(id, cleanUpdate, mongoOptions).lean();
    }
    const data = readJSON(this.filename);
    const idx = data.findIndex(item => item.id === id || item._id === id);
    if (idx === -1) return null;

    if (cleanUpdate.$unset && cleanUpdate.$unset.email !== undefined) {
      delete data[idx].email;
    }

    data[idx] = {
      ...data[idx],
      ...cleanUpdate,
      updatedAt: new Date().toISOString()
    };
    if (data[idx].$unset) delete data[idx].$unset;
    writeJSON(this.filename, data);
    return data[idx];
  }

  async findByIdAndDelete(id) {
    await ensureDBConnected();
    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.findByIdAndDelete(id).lean();
    }
    const data = readJSON(this.filename);
    const idx = data.findIndex(item => item.id === id || item._id === id);
    if (idx === -1) return null;

    const deleted = data[idx];
    const filtered = data.filter(item => item.id !== id && item._id !== id);
    writeJSON(this.filename, filtered);
    return deleted;
  }

  async countDocuments(query = {}) {
    await ensureDBConnected();
    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.countDocuments(query);
    }
    const items = await this.find(query);
    return items.length;
  }

  async findOneAndUpdate(query = {}, update = {}, options = {}) {
    await ensureDBConnected();
    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.findOneAndUpdate(query, update, { ...options, new: options.new !== false }).lean();
    }
    const data = readJSON(this.filename);
    let idx = data.findIndex(item => {
      for (const key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });

    if (idx === -1) {
      if (options.upsert) {
        const newId = Math.random().toString(36).substring(2, 11);
        const newDoc = {
          ...query,
          id: newId,
          _id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this._applyUpdateToDoc(newDoc, update);
        data.push(newDoc);
        writeJSON(this.filename, data);
        return newDoc;
      }
      return null;
    }

    const doc = data[idx];
    const prevDoc = { ...doc };
    this._applyUpdateToDoc(doc, update);
    doc.updatedAt = new Date().toISOString();
    writeJSON(this.filename, data);
    return options.new ? doc : prevDoc;
  }

  _applyUpdateToDoc(doc, update) {
    if (update.$inc) {
      for (const key in update.$inc) {
        doc[key] = (Number(doc[key]) || 0) + Number(update.$inc[key]);
      }
    }
    if (update.$set) {
      for (const key in update.$set) {
        doc[key] = update.$set[key];
      }
    }
    for (const key in update) {
      if (key !== '$inc' && key !== '$set' && key !== '$setOnInsert') {
        doc[key] = update[key];
      }
    }
  }

  // Raw helper to read all items from the local JSON file
  getAllLocal() {
    return readJSON(this.filename);
  }

  // Raw helper to write all items to the local JSON file
  saveAllLocal(data) {
    writeJSON(this.filename, data);
  }
}

export { useMongoDB, ModelWrapper };
