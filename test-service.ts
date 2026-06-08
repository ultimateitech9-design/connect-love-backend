import { createConnection } from 'typeorm';
import { MatchRelation } from './src/matches/match.entity';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await createConnection({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dating_app',
    entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
  });

  try {
    const matchRepo = connection.getRepository(MatchRelation);
    const matches = await matchRepo.find({ relations: ['sender', 'receiver'], take: 1 });
    console.log("Found matches successfully without JSON parse error!");
  } catch(e) {
    console.error("ERROR running query:", e);
  }
  
  await connection.close();
}

run();
