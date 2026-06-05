import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  console.log('\n🚀 Balone QA — Global Setup');
  console.log(`   Ambiente : ${process.env.TEST_ENV || 'local'}`);
  console.log(`   Base URL : ${process.env.BASE_URL}`);
  console.log(`   CI       : ${process.env.CI === 'true' ? 'sim' : 'não'}\n`);
}

export default globalSetup;
