import { config } from 'dotenv';
config();

// AI flows (analyze-influences.ts, generate-forecast.ts) are no longer 
// imported here as the primary prediction mechanism has been changed to mock data
// to fulfill the requirement "untuk predict data tidak perlu menggunakan AI".
// import '@/ai/flows/analyze-influences.ts';
// import '@/ai/flows/generate-forecast.ts';
