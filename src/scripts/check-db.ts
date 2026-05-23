import mongoose from 'mongoose';
import Character from '../models/character.model';
import { config } from '../config';

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB');
  
  const characters = await Character.find({});
  console.log(`Total characters: ${characters.length}`);
  console.log(JSON.stringify(characters.map(c => ({
    id: c._id,
    name: c.name,
    isActive: c.isActive,
    isPublished: c.isPublished,
    deletedAt: c.deletedAt
  })), null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
