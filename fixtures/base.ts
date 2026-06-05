import { test as base, expect } from '@playwright/test';

// Aqui serão adicionados Page Objects e fixtures customizadas conforme os testes forem criados.
// Exemplo de extensão futura:
//
// import { HomePage } from '@pages/HomePage';
//
// type BaloneFixtures = {
//   homePage: HomePage;
// };
//
// export const test = base.extend<BaloneFixtures>({
//   homePage: async ({ page }, use) => {
//     await use(new HomePage(page));
//   },
// });

export const test = base;
export { expect };
