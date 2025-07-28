import * as account from './kpi.account.json';
import * as session from './kpi.session.json';
import * as tbl_departments from './kpi.tbl_departments.json';
import * as tbl_kpi_audit_logs from './kpi.tbl_kpi_audit_logs.json';
import * as tbl_kpi_entries from './kpi.tbl_kpi_entries.json';
import * as tbl_kpi_templates from './kpi.tbl_kpi_templates.json';
import * as tbl_members from './kpi.tbl_members.json';
import * as user from './kpi.user.json';

import connectDB, { db } from '@/configs/db/mongodb';
import { ObjectId } from 'mongodb';
import logger from '@/configs/logger';

interface SeederResult {
  collection: string;
  inserted: number;
  errors: string[];
}

export async function seedDatabase(): Promise<SeederResult[]> {
  const results: SeederResult[] = [];

  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to database for seeding');

    // Clear existing data
    await clearCollections();
    logger.info('Cleared existing collections');

    // Seed collections in order (respecting foreign key dependencies)
    const collections = [
      { name: 'account', data: account },
      { name: 'user', data: user },
      { name: 'session', data: session },
      { name: 'tbl_departments', data: tbl_departments },
      { name: 'tbl_members', data: tbl_members },
      { name: 'tbl_kpi_templates', data: tbl_kpi_templates },
      { name: 'tbl_kpi_entries', data: tbl_kpi_entries },
      { name: 'tbl_kpi_audit_logs', data: tbl_kpi_audit_logs },
    ];

    // Debug: Log data lengths
    collections.forEach((col) => {
      logger.info(
        `Collection ${col.name}: ${Array.isArray(col.data) ? col.data.length : 'not array'} items`
      );
    });

    for (const collection of collections) {
      const result = await seedCollection(collection.name, collection.data);
      results.push(result);
    }

    logger.info('Database seeding completed successfully');
    return results;
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

async function clearCollections(): Promise<void> {
  const collections = [
    'account',
    'user',
    'session',
    'tbl_departments',
    'tbl_members',
    'tbl_kpi_templates',
    'tbl_kpi_entries',
    'tbl_kpi_audit_logs',
  ];

  for (const collectionName of collections) {
    try {
      await db.collection(collectionName).deleteMany({});
      logger.info(`Cleared collection: ${collectionName}`);
    } catch (error) {
      logger.warn(`Failed to clear collection ${collectionName}:`, error);
    }
  }
}

async function seedCollection(
  collectionName: string,
  data: any[]
): Promise<SeederResult> {
  const result: SeederResult = {
    collection: collectionName,
    inserted: 0,
    errors: [],
  };

  try {
    if (!Array.isArray(data) || data.length === 0) {
      result.errors.push('No data to insert');
      return result;
    }

    // Convert MongoDB extended JSON format to proper objects
    const convertedData = data.map((doc) => convertMongoDBExtendedJSON(doc));

    // Insert data
    const insertResult = await db
      .collection(collectionName)
      .insertMany(convertedData, {
        ordered: false, // Continue inserting even if some documents fail
      });

    result.inserted = insertResult.insertedCount;
    logger.info(`Seeded ${result.inserted} documents in ${collectionName}`);
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    result.errors.push(errorMessage);
    logger.error(`Error seeding ${collectionName}:`, error);
  }

  return result;
}

function convertMongoDBExtendedJSON(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertMongoDBExtendedJSON(item));
  }

  if (typeof obj === 'object') {
    const converted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key === '$oid') {
        return new ObjectId(value as string);
      } else if (key === '$date') {
        return new Date(value as string);
      } else {
        converted[key] = convertMongoDBExtendedJSON(value);
      }
    }

    return converted;
  }

  return obj;
}

// CLI interface
if (require.main === module) {
  seedDatabase()
    .then((results) => {
      console.log('\n=== Seeding Results ===');
      results.forEach((result) => {
        console.log(`${result.collection}: ${result.inserted} inserted`);
        if (result.errors.length > 0) {
          console.log(`  Errors: ${result.errors.join(', ')}`);
        }
      });
      console.log('\nSeeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
