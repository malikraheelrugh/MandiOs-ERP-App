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
    if (useMongoDB && mongoose.connection.readyState === 1) {
      const result = await this.mongooseModel.create(doc);
      return result.toObject();
    }
    const data = readJSON(this.filename);
    const newId = Math.random().toString(36).substring(2, 11);
    const newDoc = {
      ...doc,
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
    if (useMongoDB && mongoose.connection.readyState === 1) {
      return this.mongooseModel.findByIdAndUpdate(id, update, { new: true }).lean();
    }
    const data = readJSON(this.filename);
    const idx = data.findIndex(item => item.id === id || item._id === id);
    if (idx === -1) return null;

    data[idx] = {
      ...data[idx],
      ...update,
      updatedAt: new Date().toISOString()
    };
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
