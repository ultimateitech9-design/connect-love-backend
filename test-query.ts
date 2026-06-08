import { createConnection } from 'typeorm';
import { MatchRelation } from './src/matches/match.entity';
import { Message } from './src/messages/message.entity';
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

  const repo = connection.getRepository(MatchRelation);
  const msgRepo = connection.getRepository(Message);
  
  try {
    const msgs = await msgRepo.count();
    console.log("Found msgs:", msgs);
  } catch(e) {
    console.error("ERROR running message query:", e);
  }
  
  await connection.close();
}

run();
