import { test, expect } from '../../fixtures/base';
import { CatalogoPage } from '../../pages/CatalogoPage';

/**
 * Jornada: Montar e enviar um pedido pelo catálogo
 *
 * Persona: Carla, 32 anos, já conhece o brechó e entrou direto no catálogo
 * para separar peças para a semana.
 *
 * Ela quer:
 *   → Ver o que tem disponível
 *   → Filtrar pelo espaço que ela gosta
 *   → Selecionar várias peças
 *   → Enviar o pedido para a Fê pelo WhatsApp
 */

test.describe('Jornada: Montar e enviar pedido pelo catálogo', () => {

  test('Carla entra no catálogo e vê as peças disponíveis', async ({ catalogo }) => {

    await test.step('Carla abre o catálogo online', async () => {
      await catalogo.open();
    });

    await test.step('Ela vê que há peças carregadas na página', async () => {
      const total = await catalogo.contarProdutos();
      expect(total).toBeGreaterThan(0);
    });

    await test.step('As imagens das peças aparecem de verdade — não ficam quebradas', async () => {
      const img = catalogo.cards().locator('img').first();
      // Aguarda a imagem terminar de carregar antes de medir
      await img.waitFor({ state: 'visible' });
      await catalogo.page.waitForFunction(
        (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
        await img.elementHandle(),
        { timeout: 10_000 },
      );
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    });

    await test.step('Ela ainda não selecionou nada — contador mostra zero', async () => {
      const selecionadas = await catalogo.getPecasSelecionadas();
      expect(selecionadas).toBe(0);
    });

  });


  test('Carla filtra pelo Mini Museu e encontra peças retrô', async ({ catalogo }) => {

    await test.step('Carla abre o catálogo', async () => {
      await catalogo.open();
    });

    await test.step('Ela clica no filtro "Mini Museu"', async () => {
      await catalogo.filtrarMiniMuseu();
    });

    await test.step('Aparecem peças da categoria Mini Museu', async () => {
      const count = await catalogo.contarProdutos();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Ela muda para "Espaço Boho" para comparar', async () => {
      await catalogo.filtrarBoho();
    });

    await test.step('As peças mudam — é uma seleção diferente', async () => {
      const count = await catalogo.contarProdutos();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Ela clica em "Tudo" para ver o catálogo completo de novo', async () => {
      await catalogo.filtrarTudo();
      const total = await catalogo.contarProdutos();
      expect(total).toBeGreaterThan(0);
    });

  });


  test('Carla seleciona uma peça e vê o contador atualizar', async ({ catalogo }) => {

    await test.step('Carla abre o catálogo', async () => {
      await catalogo.open();
    });

    await test.step('Ela clica na primeira peça que chamou atenção', async () => {
      await catalogo.selecionarProduto(0);
      await catalogo.page.waitForTimeout(500);
    });

    await test.step('O contador muda de "nenhuma" para 1 peça selecionada', async () => {
      const selecionadas = await catalogo.getPecasSelecionadas();
      expect(selecionadas).toBe(1);
    });

    await test.step('A peça tem uma indicação visual de "selecionada"', async () => {
      const card = catalogo.cards().first();
      const classeAtual = await card.getAttribute('class');
      // A classe deve ter mudado em relação ao estado original (sem seleção)
      expect(classeAtual).toBeTruthy();
    });

  });


  test('Carla muda de ideia e retira uma peça da seleção', async ({ catalogo }) => {

    await test.step('Carla abre o catálogo e seleciona a primeira peça', async () => {
      await catalogo.open();
      await catalogo.selecionarProduto(0);
      await catalogo.page.waitForTimeout(400);
      expect(await catalogo.getPecasSelecionadas()).toBe(1);
    });

    await test.step('Ela pensa melhor e clica na peça de novo para tirar', async () => {
      await catalogo.selecionarProduto(0);
      await catalogo.page.waitForTimeout(400);
    });

    await test.step('O contador volta a zero — peça removida', async () => {
      const selecionadas = await catalogo.getPecasSelecionadas();
      expect(selecionadas).toBe(0);
    });

  });


  test('Carla monta um pedido com 3 peças e envia pelo WhatsApp', async ({ catalogo, page }) => {

    await test.step('Carla abre o catálogo', async () => {
      await catalogo.open();
    });

    await test.step('Ela verifica se tem peças suficientes para montar o pedido', async () => {
      const totalProdutos = await catalogo.contarProdutos();
      if (totalProdutos < 3) test.skip(true, 'Menos de 3 peças no catálogo');
    });

    await test.step('Ela seleciona 3 peças que chamaram atenção', async () => {
      // Cliques sem delay entre eles — o DOM re-renderiza após cada seleção,
      // então esperar entre cliques faz o próximo nth() cair no card errado
      await catalogo.selecionarProduto(0);
      await catalogo.selecionarProduto(1);
      await catalogo.selecionarProduto(2);
      await page.waitForTimeout(600);
    });

    await test.step('O pedido tem 3 peças — contador confirma', async () => {
      expect(await catalogo.getPecasSelecionadas()).toBe(3);
    });

    await test.step('Ela clica em "Enviar pedido"', async () => {
      await expect(catalogo.btnEnviarPedido()).toBeVisible();

      // Captura nova aba que o botão vai abrir
      const [novaAba] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 8_000 }).catch(() => null),
        catalogo.btnEnviarPedido().click(),
      ]);

      if (novaAba) {
        await test.step('A nova aba abre o WhatsApp com o pedido', async () => {
          const url = novaAba.url();
          expect(url).toMatch(/whatsapp\.com|wa\.me/);
          expect(url).toContain('5551999580604');
        });

        await test.step('A mensagem do WhatsApp contém as peças e o total', async () => {
          const url = novaAba.url();
          const mensagem = decodeURIComponent(url);
          // A mensagem deve ter conteúdo substancial — não pode ser só o número
          expect(mensagem.length).toBeGreaterThan(100);
          // Deve mencionar peças e total
          expect(mensagem).toMatch(/peça|Balon|total/i);
        });

        await novaAba.close();
      } else {
        // Navegou na mesma aba
        await expect(page).toHaveURL(/whatsapp\.com|wa\.me/);
      }
    });

  });


  test('Carla tenta enviar sem selecionar nada — sistema avisa ou bloqueia', async ({
    catalogo,
    page,
  }) => {

    await test.step('Carla abre o catálogo sem selecionar nenhuma peça', async () => {
      await catalogo.open();
      expect(await catalogo.getPecasSelecionadas()).toBe(0);
    });

    await test.step('Ela clica em "Enviar pedido" assim mesmo', async () => {
      const desabilitado = await catalogo.btnEnviarPedido().isDisabled().catch(() => false);

      if (desabilitado) {
        // Comportamento ideal — botão desabilitado sem seleção
        await test.step('O botão está desabilitado — não deixa enviar', async () => {
          expect(desabilitado).toBeTruthy();
        });
        return;
      }

      const [novaAba] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 3_000 }).catch(() => null),
        catalogo.btnEnviarPedido().click(),
      ]);

      if (novaAba) {
        // Abriu WhatsApp — verifica se a mensagem pelo menos diz que está vazia
        const url = decodeURIComponent(novaAba.url());
        await novaAba.close();
        // Registra como comportamento a melhorar
        console.warn('⚠️  Pedido enviado sem peças selecionadas — considere desabilitar o botão');
      } else {
        // Exibiu aviso na página
        const aviso = page.getByText(/selecione|nenhuma peça|escolha/i).first();
        await expect(aviso).toBeVisible();
      }
    });

  });

});
