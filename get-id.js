import { LinearClient } from '@linear/sdk';
import 'dotenv/config';

const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function getMyId() {
  const me = await client.viewer;
  console.log("------------------------------------");
  console.log(`👤 Name: ${me.name}`);
  console.log(`🆔 Your User ID: ${me.id}`);
  console.log("------------------------------------");
}

getMyId();