import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  console.log('\n🛍️  Balonê QA — iniciando testes');
  console.log(`   Site      : ${process.env.BASE_URL || 'https://www.brechobalone.com.br'}`);
  console.log(`   Catálogo  : ${process.env.CATALOGO_URL || 'https://catalogobalone.netlify.app'}`);
  console.log(`   Ambiente  : ${process.env.TEST_ENV || 'production'}`);
  console.log(`   CI        : ${process.env.CI === 'true' ? 'sim' : 'não'}\n`);
}

export default globalSetup;
