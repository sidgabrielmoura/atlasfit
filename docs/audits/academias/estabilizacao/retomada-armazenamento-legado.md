# Retomada — armazenamento e investigação do legado

11/10/2026. A retomada concluiu **GYM-AUD-047** no escopo registrado. Restam **029, 030, 046 e 050**. Os 65 IDs e a auditoria original são preservados: 48 corrigidos e verificados, 13 retirados e quatro pendentes. O [manifesto](verificacoes-retomada-armazenamento.json) contém casos, resultados e hashes das fontes.

## Armazenamento real por HTTP

`node scripts/gym-r2-http.cjs` inicia uma cópia isolada da aplicação, transmite somente credenciais R2 e usa o PostgreSQL descartável. As credenciais de pagamentos e comunicação permanecem vazias. Quatro jornadas passaram, sem falhas/skips:

- Reserva persistida, PUT assinado de PNG real, HEAD e finalização conferida pelo servidor; metadado de tamanho enviado pelo cliente não substitui o tamanho real. Replay e tamanho adulterado são recusados.
- GET privado com hash do conteúdo, recusa de sessão ausente/usuário estrangeiro e leitura parcial de oito bytes com HTTP 206.
- Duas reservas de 800.000 bytes concorrem por um MB: uma entra e a outra recebe 409, sem exceder a quota. Upload menor que o tamanho assinado recebe 403.
- Expiração preserva a ocupação até exclusão confirmada; administrador não apaga reserva ativa e operador comum não usa o comando. Cancelamento da licença após PUT impede finalização. Os objetos de todas as fixtures são removidos e sua ausência é confirmada por HEAD 404, inclusive no cleanup após falha.

As quatro jornadas estão organizadas em quatro testes: o terceiro reúne expiração/exclusão, e o quarto verifica cancelamento da licença. Nenhum objeto legado foi excluído. O banco configurado não foi alterado. O opt-in `--r2` não modifica o modo HTTP anterior; a configuração dos testes externos anteriores exclui esta jornada que requer seu próprio servidor.

O [inventário R2 completo](inventario-r2-real.json), executado por `node scripts/gym-r2-inventory.cjs`, percorreu uma página e **67 objetos**, cruzando referências de colunas de arquivos/URLs/imagens/anexos do schema instalado, em transação READ ONLY. Encontrou **34 objetos referenciados**, **33 candidatos sem referência**, nenhuma referência local a objeto ausente e nenhuma URL R2 sem chave recuperável. Os registros guardam hashes das chaves, tamanho, data e classificação; não expõem chaves de arquivos de pessoas.

Os 33 candidatos incluem 18 objetos globais/legados, 14 em workspaces PERSONAL e um prefixo de workspace não encontrado no banco configurado. Há uma academia cadastrada, sem objetos desse prefixo no snapshot. Ausência de referência não autoriza excluir ou atribuir um objeto a uma academia. A listagem R2 e o snapshot PostgreSQL não constituem uma transação distribuída. A investigação de candidatos permanece disponível para decisão operacional, sem exclusão automática.

## Cobranças sem workspace

O usuário não identificou uma fonte documental. `node scripts/gym-billing-evidence.cjs` investigou vínculos internos em READ ONLY. O [registro por caso](evidencias-cobrancas-legadas.json) usa identificadores com hash e conserva as lacunas:

- As sete cobranças são PRODUCTION e possuem identificador de cobrança do provedor.
- Seis não possuem candidato PERSONAL pelo vínculo do aluno com workspace pertencente ao titular da conta financeira.
- Uma possui candidato único; isso não prova a obrigação que originou a cobrança.
- Todas estão sem subscription e sem credencial de subconta persistida. A coluna nova do vínculo à obrigação ainda depende da transição do schema real.

Não houve consulta ou comando financeiro Asaas, backfill, baixa ou estorno. Nome, título, CPF e igualdade de valor não foram usados para fabricar vínculos. 029 e 030 continuam pendentes. Conferência externa requer acesso válido à subconta e evidência da obrigação/recibo; não se deve gerar uma chave ou comando financeiro para suprir isso durante testes. A [documentação oficial](https://docs.asaas.com/docs/criacao-de-subcontas) orienta o uso de credencial própria válida nas operações da subconta.

## Implantação e regressão

O [preflight real atualizado](preflight-tenant-real.json) terminou em leitura, mas **readyToMigrate continua false**. Duas relações dependem do schema futuro e não foram lidas; isso não significa duas divergências de dados confirmadas. Nenhuma migration ou configuração hospedada foi aplicada. As pendências de baseline/transição, backfills documentais, scheduler, retenção e monitoramento permanecem em 046.

A suíte unitária inicial registrou **130 aprovações/92 falhas**. Foram reconstruídas fixtures de guard, contexto, titularidade, backfill e provisionamento, mantendo as restrições do domínio e acrescentando duas recusas de atores sem autoridade. Os quatro arquivos corrigidos têm **47 casos aprovados/zero falhas**. A regressão completa atual registra **155 aprovações/69 falhas/zero skips**, com resultados individuais no manifesto. Os arquivos ainda reprovados são gym-030, gym-031, gym-032, gym-041, gym-043, gym-071, gym-072 e gym-073. A classificação de causa de cada falha ainda precisa de revisão; não se declara que todas são apenas mocks antigos.

TypeScript completo terminou com exit 0. O primeiro inicializador PostgreSQL reportou timeout, mas o log e as conexões posteriores confirmaram que o servidor descartável iniciou; não foi contado como inicialização aprovada. A suíte focal intermediária teve uma recusa no backfill sem administrador: a fixture foi corrigida e a regressão seguinte passou nessa superfície. Falhas intermediárias e a regressão ainda reprovada permanecem nos artefatos locais.

050 continua aberto: testes restantes, outras superfícies, leitor de tela humano, revisão dos atos/documentos e piloto operacional. PERSONAL vinculado continua como última etapa adicional; não foi implementado nesta retomada. Não houve commit, push ou implantação.

Referência técnica R2: [AWS SDK v3 e URLs assinadas](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).
