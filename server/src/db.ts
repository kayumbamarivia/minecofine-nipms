import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  console.log(`MongoDB connected: ${config.mongoUri.replace(/\/\/.*@/, '//***@')}`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
