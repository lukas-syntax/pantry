const Database = require('better-sqlite3');

const DATABASE_URL = (process.env.DATABASE_URL || 'file:./data/pantry.db').replace('file:', '');

function initializeDatabase() {
  console.log('🔧 Initializing database schema...');
  
  const sqlite = new Database(DATABASE_URL);

  // Create all tables using raw SQL
  const migrations = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      name TEXT,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      locale TEXT NOT NULL DEFAULT 'de',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    
    // Recipes table
    `CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title_de TEXT,
      title_en TEXT,
      subtitle_de TEXT,
      subtitle_en TEXT,
      description_de TEXT,
      description_en TEXT,
      image_url TEXT,
      prep_time INTEGER,
      cook_time INTEGER,
      servings INTEGER NOT NULL DEFAULT 2,
      calories INTEGER,
      category TEXT,
      tags TEXT DEFAULT '[]',
      is_public INTEGER NOT NULL DEFAULT 0,
      forked_from_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    
    // Recipe ingredients table
    `CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY NOT NULL,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      name_de TEXT,
      name_en TEXT,
      amount REAL NOT NULL,
      unit TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0
    )`,
    
    // Recipe instructions table
    `CREATE TABLE IF NOT EXISTS recipe_instructions (
      id TEXT PRIMARY KEY NOT NULL,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      instruction_de TEXT,
      instruction_en TEXT
    )`,
    
    // Favorites table
    `CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    )`,
    
    // Meal plans table
    `CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      servings INTEGER NOT NULL DEFAULT 2,
      notes TEXT,
      created_at INTEGER NOT NULL
    )`,
    
    // Pantry items table
    `CREATE TABLE IF NOT EXISTS pantry_items (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name_de TEXT,
      name_en TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      location TEXT,
      category TEXT,
      expiry_date TEXT,
      icon TEXT,
      low_stock_threshold REAL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    
    // Shopping list items table
    `CREATE TABLE IF NOT EXISTS shopping_list_items (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name_de TEXT,
      name_en TEXT,
      quantity REAL,
      unit TEXT,
      checked INTEGER NOT NULL DEFAULT 0,
      recipe_id TEXT REFERENCES recipes(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    
    // Categories table
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  ];

  for (const migration of migrations) {
    try {
      sqlite.exec(migration);
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  // Migrations for existing databases (ALTER TABLE is safe with IF NOT EXISTS pattern)
  const alterMigrations = [
    { table: 'users', column: 'role', sql: `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'` },
    { table: 'recipes', column: 'forked_from_id', sql: `ALTER TABLE recipes ADD COLUMN forked_from_id TEXT REFERENCES recipes(id) ON DELETE SET NULL` },
  ];

  for (const { table, column, sql } of alterMigrations) {
    try {
      const columns = sqlite.pragma(`table_info(${table})`);
      const exists = columns.some(c => c.name === column);
      if (!exists) {
        sqlite.exec(sql);
        console.log(`  ✅ Added column ${table}.${column}`);
      }
    } catch (error) {
      // Column likely already exists
    }
  }

  sqlite.close();
  console.log('✅ Database schema initialized');
}

// Run if called directly
if (require.main === module) {
  console.log('🌱 Seeding database...');
  initializeDatabase();
  console.log('✅ Database is ready (empty by design)');
  console.log('✅ First user will be created during registration');
}

module.exports = { initializeDatabase };
