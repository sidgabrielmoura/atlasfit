# Entrega final para publicação manual

13/10/2026. Código concluído e PERSONAL vinculado implementado. O usuário escolheu publicar manualmente a partir da pasta do projeto, sem ZIP. Fonte, assets, lock npm, SDK local, histórico/cadeia de migrations, testes, configuração de exemplo e instruções estão nessa pasta.

| Verificação | Resultado |
|---|---|
| Unitários | 262 passaram; zero falhas/pendentes |
| PostgreSQL isolado | 351 passaram; zero falhas/pendentes |
| HTTP isolado | 79 passaram; conjunto completo conferido por nome |
| Navegador no build de produção | Seis cenários; cinco capturas; zero erro JavaScript/overflow |
| Build com TypeScript | Aprovado; fonte compilada comparada arquivo a arquivo |
| Instalação npm ci em pasta nova | Aprovada; package/lock atuais conservam os hashes validados |
| Migrations em banco novo | Oito aplicadas; repetição, status e diff aprovados |
| Transição legada sintética | Sete cobranças; 36 nomes/checksums históricos e 201 gatilhos conservados |

São **692 testes automatizados** de unidade/PostgreSQL/HTTP, além de navegador e build/instalação/banco. Datas, nomes e hashes estão no [manifesto](verificacoes-entrega-final.json). Lotes anteriores permanecem históricos.

O conjunto HTTP combina a suíte completa e uma repetição de despesa manual após um 404 no servidor de desenvolvimento. Esse fluxo foi confirmado também no build de produção, incluindo a preservação do pagamento na tentativa com tenant estrangeiro. Os relatórios brutos preservam a falha inicial e as reexecuções.

O navegador verificou agenda CRUD com autor no PostgreSQL, navegação desktop/celular, ausência de preload comercial PERSONAL no GYM, switcher, trial revogado, paywall, checkout sem gateway e retorno à academia com e sem cookie prévio. Ver [implementação](personal-vinculado-implementacao.md).

A migration final acrescenta autoria à agenda e conserva tarefas legadas sem atribuição inferida. A prévia da transição configurada foi obtida em leitura: 10.085 bytes, sem instrução destrutiva detectada. Execução real exige backup, revisão e conferência; o preflight configurado não autoriza migrar.

Use README-PUBLICACAO.md na raiz, .env.example e o [guia de implantação](implantacao-manual-hostinger.md). O [roteiro manual](homologacao-manual-quatro.md) registra aceites externos 029, 030, 046 e 050. As sete cobranças antigas e o saldo sem comprovantes não foram reconciliados por inferência. Não houve implantação, migration/backfill configurado ou comando financeiro externo.

Instalação limpa: Windows Node 24.14.1. O host deve instalar e compilar em seu sistema. Não envie credenciais, node_modules, .next, .tmp, .env ou exportações de clientes ao publicar o código. O Playwright 1.63.0 usado na QA foi instalado separadamente em .tmp/gym-visual-runner, com Chrome local; não é dependência de execução da aplicação.

## Capturas sintéticas

- [academy-desktop.png](entrega-capturas/academy-desktop.png)
- [agenda-desktop.png](entrega-capturas/agenda-desktop.png)
- [agenda-mobile.png](entrega-capturas/agenda-mobile.png)
- [workouts-mobile.png](entrega-capturas/workouts-mobile.png)
- [paywall-desktop.png](entrega-capturas/paywall-desktop.png)
