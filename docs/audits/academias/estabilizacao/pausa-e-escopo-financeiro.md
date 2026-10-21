# Pausa efetiva e financeiro por unidade

Atualização posterior do mesmo dia: [troca e renovação implementadas com novo contrato](revisao-contratual-manual.md). As pendências comerciais descritas abaixo representam o estado anterior àquele lote.

Lote de 03/10/2026, implementado e verificado no PostgreSQL e HTTP isolados. PERSONAL não recebeu alteração de comportamento neste lote. A experiência do personal vinculado continua por último e ainda não está implementada.

## Pausa e retomada

| Estágio | Comportamento efetivo |
|---|---|
| Solicitação | Schema estrito valida datas, motivo e boolean. Domínio bloqueia matrícula antes de ler invariantes, verifica ator na unidade real, academia GYM ativa, aluno/unidade/plano correspondentes e ausência de assinatura externa |
| Programação | Cria `GymEnrollmentPause` com `startedAt=null`. Matrícula permanece ACTIVE, com o acesso existente; evento/auditoria identificam programação, sem anunciar suspensão imediata |
| Início | Se início já chegou, registra `startedAt` no momento de execução, altera para PAUSED e retira acesso. Para programação futura, job aplica esses fatos quando executado, uma vez |
| Retomada | Só encerra uma pausa em aberto; não converte PENDING_ACTIVATION em ACTIVE. Exige aceite, ativação anterior, vínculo/papel estudantil atual e vigência válida. Não presume que um registro de aceite isolado equivale a ativação |
| Extensão | Soma somente o tempo entre início efetivo e o menor instante entre retomada e término previsto. Não concede um dia mínimo artificial, dias retroativos anteriores à execução nem atraso posterior ao término |
| Desistência de programação | Retomada antes de a pausa começar encerra a programação sem conceder extensão ou novos direitos |
| Job | Processa pausas antes de verificar expiração, pois a extensão efetiva pode preservar a vigência. Revalida estado dentro da transação. Falhas são identificadas e a rota retorna 503/success=false para recuperação |

A migration aditiva `20261003000000_gym_pause_effective_start` acrescenta somente `startedAt`, nullable, sem apagar/backfill automático de fatos antigos. Foi aplicada exclusivamente no PostgreSQL descartável e o Prisma Client foi regenerado. Pausa histórica com matrícula PAUSED usa o início registrado como fallback explícito; sobreposições antigas exigem revisão. Não foi inventado um instante de execução para pausas antigas.

`gymCalendarInstant` converte datas de formulário no fuso da academia. São Paulo e Tóquio foram verificados; timestamps com offset conservam seu instante. Fuso inválido ou meia-noite civil inexistente exige correção/data com horário, sem ajuste silencioso. O agendamento implantado e seus intervalos não foram inspecionados: efeito automático depende de executar o job; testes não simulam garantia de pontualidade de produção.

Ativação passa a aceitar apenas PENDING_ACTIVATION/ACTIVE, valida vínculos e rejeita assinatura externa. Não serve como alternativa à retomada. O bloqueio de matrícula é compartilhado entre geração de competência, ativação, pausa, retomada, cancelamento e encerramento, com retry transacional limitado.

Não foi alterada a política de geração financeira durante PAUSED nem criado abatimento automático. O comportamento anterior de geração recusa PAUSED; a decisão solicitada sobre cobrança durante pausa continua pendente. Obrigações/recebimentos existentes permanecem intocados. Retomada valida ativação prévia; a política completa de inadimplência continua parte do GYM-AUD-022.

## Escopo e contratos do financeiro manual

| Responsabilidade | Intervenção |
|---|---|
| Fatura avulsa | Autoridade usa unidade do aluno quando não há matrícula. Papel estudantil revogado não é restaurado pelo perfil. Plano, aluno e matrícula incompatíveis são recusados |
| Baixa | Cada obrigação revalida aluno, matrícula, academia e unidade. Conta de outra unidade não recebe alocação; conta central exige autoridade global. Caixa exige unidade coerente com a conta |
| Retry | Chave é da academia e fingerprint inclui valor, alocações, ator, conta, data e metadados. Antes de devolver recibo existente, revalida permissões e todos os recursos, inclusive no fallback de P2002 |
| Reversão | Revalida autoridade sobre as obrigações e conta antes de devolver retry ou compensar saldo. Recebimento/alocações/auditoria permanecem rastreáveis |
| Leitura | Listas e recibos calculam unidades permitidas no servidor; recibo com alocação fora do escopo não é disponibilizado. `unitId` enviado não cria autoridade. Obrigações com aluno de outro tenant são excluídas |
| SSR financeiro | Preloads de alunos, matrículas, responsáveis e contas respeitam unidades permitidas. Seletor de aluno usa somente identificação necessária, sem ficha de saúde ou campos de autenticação |
| Papel legado | Sem grants, unidade do membro limita leitura de alunos e financeiro. Ausência de unidade no recurso não concede autoridade financeira global a esse papel |
| Dinheiro | Schemas rejeitam frações de centavo, tipos inválidos, negativos e excesso do intervalo atual de apresentação. DTO tipado usa conversão segura; BigInt legado fora do intervalo retorna erro explícito, sem arredondamento. UI reutiliza parser BRL, incluindo separador de milhar |
| Desconto | Centavos ou percentual, com validação de precisão e alçada atual. ID de aprovador enviado não concede autoridade; responsável persistido é o ator autorizado. Percentuais como 0,29% não são recusados por representação binária |
| Comprovante | URL arbitrária não comprova recebimento e não é aceita na mutação. Upload contextual de comprovante continua pendente; histórico permanece consultável. UI não anuncia upload implementado |

Sem gateway, wallet, split, saque ou emissão externa. Financeiro PERSONAL e suas integrações não foram removidos.

## Evidências e limites

| Verificação | Resultado | Cobertura |
|---|---|---|
| `pause-finance-units` | 34/0 PostgreSQL | Quatro cenários compostos de pausa, três de escopo financeiro e 27 regressões financeiras existentes. Concorrência real, datas, cancelamento/recorrência, grants atuais, dívida preservada, baixa parcial/reversão e tenant incompatível |
| `http-pause-finance` | 1/0 HTTP, 26 fora do filtro | Credentials com prova sintética válida; API avulsa por unidade, JSON/valor/paginação inválidos, baixa parcial, recibo, permissão revogada na mesma sessão e pausa futura sem efeito antecipado |
| TypeScript | Exit 0 | Compilação de tipos do checkout, inclusive serviços/DTOs/handlers alterados. Não é prova de operação ou browser |

Resultados completos, horários e arquivos brutos em [verificacoes-isoladas.json](verificacoes-isoladas.json). O primeiro typecheck do financeiro revelou nulabilidade do operador e import incorreto do handler; ambos foram corrigidos. Isso não foi resolvido com casts/any ou afrouxando autorização.

Pendências explícitas: navegação financeira completa de perfis com grants apenas locais; demais consultas de caixa/despesas/analytics; fotografia consistente de todas as leituras; unidade histórica imutável da obrigação quando há transferência; idempotência de emissão avulsa; uploads de comprovantes; browser/mobile/teclado; agendamento implantado e revisão de pausas históricas. Nenhuma dessas lacunas foi considerada resolvida apenas pelo teste acima.

## Decisão recebida e próxima intervenção contratual

O usuário escolheu **troca imediata após novo aceite, com ajuste financeiro aprovado pela gestão**. O aceite anterior deve permanecer preservado. Preço nominal/tempo de contrato não comprovam recebimento nem criam crédito. Ajuste, obrigação e eventual recebimento são fatos separados; aprovação depende do ator real, e não de ID/boolean enviados pelo cliente.

Troca e renovação ainda não foram consolidadas neste lote: não declarar GYM-AUD-022/030 completos. A implementação precisa versionar o novo ato contratual, apresentar as condições ao aluno/representante e ligar o ajuste aprovado ao financeiro manual antes de anunciar efetivação. Regra de múltiplas matrículas e política financeira da pausa continuam sem resposta específica.

## Continuação de 05/10 — decisões respondidas

As dúvidas históricas sobre matrícula simultânea e geração durante pausa receberam respostas: uma matrícula ativa por aluno/academia; geração suspensa durante pausa. Implementação e limites atuais estão em [políticas de matrícula e pausa](politicas-matricula-pausa.md). O estado deste anexo registra o lote anterior e não substitui essa continuação.
