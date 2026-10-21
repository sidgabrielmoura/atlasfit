# Recuperação de equipamentos — registro, fila e histórico

Lote de 02/10/2026. O servidor implementa transições administrativas e obrigações de sincronização. **Não comprova substituição física, funcionamento de fabricante, abertura contínua ou purga no equipamento.**

## Substituição

O método anterior movia todos os comandos PENDING para outro dispositivo e criava um SYNC_USER sem aluno, apenas com texto de motivo, prometendo sincronização total. Isso podia transferir uma abertura antiga e perder a identidade do equipamento original no histórico. Não autorizava o recurso por unidade dentro da operação.

`replaceGymDevice` exige academia/unidade coerentes, autoridade atual `devices.manage`, licença/flag, origem/destino ativos e token do destino. Corpo estrito contém destino, motivo de 10..1000 caracteres e chave de operação; ator e origem são obtidos no servidor. O destino permanece na mesma unidade: transferência de unidade não é disfarçada de substituição.

Em transação Serializable:

1. Revalida dispositivos, ator, módulo e chave/fingerprint.
2. Seleciona QR/RFID ativos de alunos legítimos da unidade, com matrícula/aceite/vigência/direito persistidos. Condições de unidade do grant são verificadas.
3. Registra um SYNC_USER por pessoa e um SYNC_CREDENTIAL por concessão, com payload canônico. Credencial aguarda ACK do usuário.
4. Comandos PENDING da origem ficam FAILED com explicação; comandos SENT ficam EXPIRED, preservando execução incerta. IDs, dispositivo original e payload/histórico não são movidos.
5. Inativa administrativamente a origem e grava auditoria da operação e do motivo.

Retry com a mesma chave/conteúdo retorna as obrigações existentes. Conteúdo diferente produz 409. `executionStage=REGISTERED_LOCALLY` e `physicalReplacementConfirmed=false` descrevem o resultado. O campo de compatibilidade `syncCommandId` indica apenas uma obrigação inicial, quando existe; **não representa sincronização total**. `commands` lista IDs e estados. Sem concessões elegíveis, a lista fica vazia, sem criar comando placeholder.

O envelope atual suporta até 100 concessões por substituição; acima disso a operação faz rollback e informa necessidade de processamento em lotes. Esse limite técnico evita uma transação ilimitada e não altera a licença contratada. O processamento em lotes ainda não foi implementado. Biométrica/facial legadas são preservadas e contadas em `unsupportedCredentialsPending`, sem conversão para QR. PIN, visita entre unidades, mapa externo persistente, purge/retirada física e elegibilidade financeira integral permanecem pendentes.

## Relatos após retirada

O token antigo permanece persistido. Dispositivo inativo só pode autenticar em modo `historical-report` quando existe auditoria de substituição registrada pelo fluxo revisado. Essa exceção é usada exclusivamente por ACK, passage e sync-offline-events. PULL, cache e heartbeat continuam recusados. Inativação genérica sem essa auditoria não habilita a exceção; revogação/rotação do token segue invalidando sua autenticação.

ACK tardio preserva status EXPIRED e resultado sanitizado; não reenvia comando. Passagem histórica continua validando tenant/unidade/identidade. Receber evento não torna o dispositivo ativo ou ONLINE novamente. A política de tempo máximo para relatos atrasados e encerramento definitivo do token ainda exige definição operacional; não foi inventado prazo.

## Contingência

Dois métodos anteriores anunciavam ativação física contínua. Um gravava apenas um boolean; outro criava uma abertura isolada com texto de contingência. O adaptador implementado não demonstra controle verificável de abertura contínua e retorno. Os dois produtores agora delegam ao mesmo contrato, que **recusa ENABLE com 410, sem escrita nem comando**. Os guards de academia/unidade/ator continuam aplicados.

DISABLE encerra apenas um **registro local legado**, com notas explícitas de conferência, transação e auditoria. Mantém o motivo/datas originais; retorna `physicalModeConfirmed=false`. Retry da mesma resolução é idempotente; não fabrica justificativa nem garantia de equipamento normalizado. A recepção anuncia indisponibilidade de abertura contínua e oferece “Registrar resolução” quando há registro legado. O modal mantém-se aberto se o servidor recusar.

## Cobertura

| Arquivo | Profundidade | Limite |
|---|---|---|
| `application/gym-device-recovery-commands.ts` | Contratos, autorização, persistência, dedup, comandos e histórico cruzados com PostgreSQL | Mais de 100 concessões, hardware, identidade externa persistente |
| `gym-recovery-service.ts`, `gym-offline-reconciliation-service.ts` | Produtores antigos substituídos por delegação canônica | Saúde/reprocessamento de divergências e demais escritores legados ainda pendentes |
| `gym-device-service.ts`, três handlers de relato | Autenticação do token retirado limitada ao relato histórico | Prazo/encerramento definitivo, agente instalável e abuso/rate limit |
| `api/gym/devices/[id]/replace/route.ts`, `contingency/route.ts` | Schemas, DTO, unidade real, guard, erros e chamadas acompanhados | Interface dedicada de substituição não localizada; backend não é jornada completa de UI |
| `reception-client.tsx` | Textos/controles/modal de contingência alinhados ao efeito local | Navegador/mobile/teclado ainda não homologados |
| `tests/gym/device-recovery.integration.ts` | Quatro casos com transação e concorrência reais | Não homologa equipamento |
| Testes antigos gym-062/gym-082 | Expectativa de abertura contínua foi substituída por indisponibilidade fundamentada no contrato do driver | Fixtures incompletas ainda falham e constam no inventário; não se declarou aprovação |

Resultados atualizados em [verificacoes-isoladas.json](verificacoes-isoladas.json); testes HTTP específicos constam pelo nome quando executados. Intermediários de fixture, TypeScript e conexão foram preservados em `.tmp`. Nenhum equipamento real foi operado. Achados GYM-AUD-038, 040, 041 e 045 continuam **parciais** conforme [catálogo](tratamento-achados.md).
