import mongoose from 'mongoose';
import { CharacterService } from '../services/character.service';
import { config } from '../config';

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB');

  // Test 1: Admin View (includeInactive = true, includeUnpublished = true)
  const adminResult = await CharacterService.list({
    page: 1,
    limit: 100,
    includeInactive: true,
    includeUnpublished: true,
  });
  console.log('\n--- Admin View Results ---');
  console.log(`Total elements: ${adminResult.totalElements}`);
  console.log('Items returned:');
  adminResult.content.forEach((c: any) => {
    console.log(`- Name: ${c.name}, isActive: ${c.isActive}, isPublished: ${c.isPublished}, deletedAt: ${c.deletedAt}`);
  });

  // Test 2: Customer View (includeInactive = false, includeUnpublished = false)
  const customerResult = await CharacterService.list({
    page: 1,
    limit: 100,
    includeInactive: false,
    includeUnpublished: false,
  });
  console.log('\n--- Customer View Results ---');
  console.log(`Total elements: ${customerResult.totalElements}`);
  console.log('Items returned:');
  customerResult.content.forEach((c: any) => {
    console.log(`- Name: ${c.name}, isActive: ${c.isActive}, isPublished: ${c.isPublished}, deletedAt: ${c.deletedAt}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
