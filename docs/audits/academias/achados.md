# Catálogo de achados — módulo de academias

Anexo do [diagnóstico](diagnostico-modulo-academias.md). IDs **GYM-AUD** não colidem com backlog GYM. Referências são relativas ao checkout e linhas do snapshot; não houve exploração em dados reais. Severidade técnica e prioridade de execução são distintas; o plano do relatório atribui prioridades/dependências.

| ID | Achado | Categoria | Severidade | Confirmação |
|---|---|---|---|---|
| [GYM-AUD-001](#gym-aud-001) | Suspensão da academia não bloqueia operações | Autorização | alta | Problema reproduzido em função isolada; fluxo HTTP não executado |
| [GYM-AUD-002](#gym-aud-002) | Grants por unidade viram permissões globais ou caem no papel legado | Autorização | alta | Problema reproduzido em função isolada; alcance HTTP inferido dos callers |
| [GYM-AUD-003](#gym-aud-003) | Gerente pode promover OWNER e mudança de papel preserva grants antigos | Privilégios | alta | Fato confirmado no código; exploração não executada |
| [GYM-AUD-004](#gym-aud-004) | Convite pode ser aceito por outra conta e ultrapassar quota em aceitação | Convites | alta | Fato confirmado; replay concorrente é risco |
| [GYM-AUD-005](#gym-aud-005) | DTOs retornam material de autenticação e token de cartão | Exposição de dados | crítica | Serializer reproduzido com dados sintéticos; includes e handlers confirmados |
| [GYM-AUD-006](#gym-aud-006) | Leitura de aluno autoriza alteração cadastral | Autorização | alta | Fato confirmado no código |
| [GYM-AUD-007](#gym-aud-007) | Leitura operacional expõe saúde sem direito de saúde/atribuição | Privacidade | alta | Fato confirmado; payload real não consultado |
| [GYM-AUD-008](#gym-aud-008) | Busca de duplicidade consulta pessoas de outras academias | Isolamento de dados | alta | Fato confirmado no código; enumeração não executada |
| [GYM-AUD-009](#gym-aud-009) | Pedido de exclusão local anonimiza identidade global imediatamente | Privacidade e integridade | alta | Fato confirmado no código; execução real proibida |
| [GYM-AUD-010](#gym-aud-010) | Exportação do titular tem alçada excessiva e cobertura incompleta | Privacidade | alta | Fato confirmado no código |
| [GYM-AUD-011](#gym-aud-011) | IDs de unidade e relações locais não garantem pertencimento composto | Integridade/tenant | alta | Risco identificado com ausência de validação confirmada |
| [GYM-AUD-012](#gym-aud-012) | Settings BigInt bruto quebra respostas de configuração e dependentes | Contrato/serialização | média | TypeError JSON reproduzido isoladamente; respostas HTTP não executadas |
| [GYM-AUD-013](#gym-aud-013) | Configuração individual envia campos diferentes do contrato servidor | Funcional/contrato | alta | Fato confirmado no código; save real não executado |
| [GYM-AUD-014](#gym-aud-014) | Listagem omite isActive e impede reativação coerente | Funcional | média | Fato confirmado no código |
| [GYM-AUD-015](#gym-aud-015) | Flags globais armazenadas não bloqueiam funcionalidades no servidor | Entitlements/configuração | alta | Fato confirmado no código; requests reais não executados |
| [GYM-AUD-016](#gym-aud-016) | Configuração global aceita valores sem schema e salva sem baseline | Configuração/UX | média | Fato confirmado no código |
| [GYM-AUD-017](#gym-aud-017) | Aprovação de desconto é texto do cliente e não alçada comprovada | Financeiro/autorização | alta | Fato confirmado no código |
| [GYM-AUD-018](#gym-aud-018) | Sangria pode creditar conta financeira de outra academia | Isolamento financeiro | alta | Fato confirmado no código; transferência real não executada |
| [GYM-AUD-019](#gym-aud-019) | Aceite representado não prova identidade do responsável | Menores/segurança | alta | Fato confirmado no código |
| [GYM-AUD-020](#gym-aud-020) | Cadastro cria aluno sem ingresso completo no portal | Funcional/auth | alta | Fato confirmado no código; entrega real não testada |
| [GYM-AUD-021](#gym-aud-021) | Aceite de matrícula tem backend mas não consumidor de interface | Fluxo incompleto | alta | Fato confirmado quanto ao endpoint; consumidor não localizado |
| [GYM-AUD-022](#gym-aud-022) | Ciclo de matrícula permite direitos sem verificação financeira/contratual coerente | Regra de negócio | alta | Fato confirmado; efeito físico não testado |
| [GYM-AUD-023](#gym-aud-023) | Cancelamento local não cancela recorrência externa nem converge reservas | Operação/financeiro | alta | Fato confirmado no código |
| [GYM-AUD-024](#gym-aud-024) | Desligamento avançado e titularidade não são um fluxo confiável único | Operação/integridade | média | Fato confirmado da desconexão; upsert null é risco não reproduzido com Prisma |
| [GYM-AUD-025](#gym-aud-025) | Pagamento pode duplicar e disputar saldo; idempotência não é tenant-scoped | Integridade financeira | alta | Código confirmado; corrida não reproduzida em banco |
| [GYM-AUD-026](#gym-aud-026) | Recebimento, reversão e despesas não convergem com o caixa | Integridade financeira | alta | Fato confirmado; saldo real não alterado |
| [GYM-AUD-027](#gym-aud-027) | Pagador e associação financeira podem apontar para usuário alheio | Tenant/financeiro | alta | Fato confirmado de confiança excessiva; cobrança real não executada |
| [GYM-AUD-028](#gym-aud-028) | Provisionamento externo pode deixar conta órfã e autenticação de subconta é incerta | Integração/confiabilidade | alta | Fato confirmado da ordem; contrato de subconta é risco a validar |
| [GYM-AUD-029](#gym-aud-029) | Retry remove split e chamadas externas podem duplicar antes do registro local | Financeiro/integração | alta | Condição confirmada no código; falha Asaas não reproduzida |
| [GYM-AUD-030](#gym-aud-030) | Assinatura diverge da fatura inicial, carteira e cancelamento real | Recorrência financeira | alta | Fato confirmado; gateway não testado |
| [GYM-AUD-031](#gym-aud-031) | Webhook pode concluir evento falho e perder falha de transferência | Assíncrono financeiro | alta | Fato confirmado no código; concorrência é risco |
| [GYM-AUD-032](#gym-aud-032) | Leitura de aulas permite alterar reservas e presença de terceiros | Autorização de recurso | alta | Fato confirmado no código |
| [GYM-AUD-033](#gym-aud-033) | Última vaga, reserva e fila não têm proteção concorrente efetiva | Concorrência | alta | Risco identificado; prechecks/schema confirmados, DB não testado |
| [GYM-AUD-034](#gym-aud-034) | Grade ignora timezone e cancelamento de aula não resolve reservas | Aulas/regra | média | Fato confirmado; render/DB não testados |
| [GYM-AUD-035](#gym-aud-035) | Responsável precisa membership indevido e pode cancelar reserva de outro dependente | Portal responsável | alta | Fato confirmado no código |
| [GYM-AUD-036](#gym-aud-036) | Indicadores misturam bases e filtros e podem subestimar recebimento líquido | Relatórios | média | Fato confirmado na fórmula; números reais não medidos |
| [GYM-AUD-037](#gym-aud-037) | Conciliação e reprocessamento podem mascarar divergência sem reparar lançamentos | Financeiro/recuperação | alta | Fato confirmado no código |
| [GYM-AUD-038](#gym-aud-038) | Políticas de acesso divergem do contrato, vigência e contexto | Acesso/regra | alta | Fato confirmado no código; abertura física não testada |
| [GYM-AUD-039](#gym-aud-039) | Comando de dispositivo pode atravessar tenant e fila perde recuperação de SENT | Hardware/isolamento | alta | Fato confirmado da falta de cruzamento; concorrência/efeito físico não testados |
| [GYM-AUD-040](#gym-aud-040) | Eventos e cache offline não garantem pertença e convergência | Hardware/offline | alta | Fato confirmado; impacto depende de agente/token |
| [GYM-AUD-041](#gym-aud-041) | Biometria facial/digital vira QR e purga é declarada antes do ACK | Biometria/clareza | alta | Fato confirmado no código; equipamento não executado |
| [GYM-AUD-042](#gym-aud-042) | Licença/defaults/quotas não são aplicados de forma atômica ou completa | Entitlements | alta | Fato confirmado; disputa é risco |
| [GYM-AUD-043](#gym-aud-043) | Cron legado é fail-open e pode emitir recibo ao criar dívida | Cron/financeiro | alta | Fato confirmado; job real não executado |
| [GYM-AUD-044](#gym-aud-044) | Canal de comunicação solicitado não é enviado e efeitos pós-transação podem se perder | Comunicação/confiabilidade | média | Fato confirmado no código |
| [GYM-AUD-045](#gym-aud-045) | Rotas de tarefa redirecionam e acessos chama endpoint ausente | Integração frontend/backend | média | Fato confirmado por código/busca; HTTP não executado |
| [GYM-AUD-046](#gym-aud-046) | Histórico de migrations não reconstrói o schema do checkout | Banco/reprodutibilidade | alta | Fato confirmado na cadeia SQL; migrations não aplicadas |
| [GYM-AUD-047](#gym-aud-047) | Uploads e arquivos reutilizam alçadas/cotas pessoais e deixam lacunas de escopo | Arquivos/segurança | alta | Fato confirmado de controles; abuso de objeto não executado |
| [GYM-AUD-048](#gym-aud-048) | Workspace ativo diverge entre cookie e store; redirecionamentos quebram jornadas | Contexto/UX | média | Fato confirmado no código |
| [GYM-AUD-049](#gym-aud-049) | Token Ably não restringe capacidade aos canais do usuário | Realtime/segurança | alta | Risco identificado condicionado à chave implantada |
| [GYM-AUD-050](#gym-aud-050) | Testes mockados e backlog concluído não demonstram homologação | Qualidade/documentação | média | Problema reproduzido da suíte; lacuna de integração confirmada |
| [GYM-AUD-051](#gym-aud-051) | Página global tem excesso de texto e feedback que confunde rascunho com estado real | UX/UI | baixa | Fato confirmado no código; avaliação visual não realizada |
| [GYM-AUD-052](#gym-aud-052) | Consultas crescem sem limite e métricas carregam dados além da tarefa | Desempenho | média | Risco identificado; custo/latência não medidos |
| [GYM-AUD-053](#gym-aud-053) | Trilha administrativa não preserva ator original e etapas completas | Auditoria/observabilidade | média | Fato confirmado no código |
| [GYM-AUD-054](#gym-aud-054) | Setup de senha registra aceite sem conferir escolha e regra de idade diverge | Legal/onboarding | média | Fato confirmado no código |
| [GYM-AUD-055](#gym-aud-055) | Commit de importação confia prévia do cliente e ativa direitos sem invariantes | Importação/integridade | alta | Fato confirmado; adulteração real não executada |
| [GYM-AUD-056](#gym-aud-056) | Saques usam alçada alternativa e snapshot sem reserva atômica | Financeiro/saque | alta | Código confirmado; duplicação e efeito externo são riscos |
| [GYM-AUD-057](#gym-aud-057) | Endpoint pessoal pode excluir academia sem encerramento coordenado | Ciclo de vida/dados | alta | Fato confirmado; delete real não executado |
| [GYM-AUD-058](#gym-aud-058) | Página de recepção entrega lista de alunos sem capability | Autorização/PII | alta | Fato confirmado no SSR; browser não executado |
| [GYM-AUD-059](#gym-aud-059) | CSV preserva prefixos de fórmula em campos controláveis | Exportação/segurança | média | Risco identificado; nenhuma planilha executada |
| [GYM-AUD-060](#gym-aud-060) | Idade, cadastro do menor e matrícula numérica divergem entre entradas | Cadastro/integridade | média | Fato confirmado; colisão é risco concorrente |
| [GYM-AUD-061](#gym-aud-061) | Provisionamento confirma workspace antes de concluir configuração e licença | Confiabilidade/funcional | média | Fato confirmado da sequência; falha externa/DB não injetada |
| [GYM-AUD-062](#gym-aud-062) | Identidade externa muda entre sincronização, credencial, revogação e passagem | Hardware/integridade | alta | Mapeamento divergente reproduzido isoladamente; efeito físico não testado |
| [GYM-AUD-063](#gym-aud-063) | Contingência marca banco mas não configura o equipamento nem automatiza expiração | Hardware/recuperação | média | Fato confirmado da rota; agente/deploy não inspecionados |
| [GYM-AUD-064](#gym-aud-064) | Credentials autentica só com senha sem impor 2FA/3FA do fluxo de login | Autenticação | alta | Fato confirmado no authorize; bypass HTTP não executado |
| [GYM-AUD-065](#gym-aud-065) | Papel global e sessões não são revogados após mudança administrativa | Sessões/privilégios | alta | Fato confirmado no callback; janela real depende config |

<a id="gym-aud-001"></a>

## GYM-AUD-001 — Suspensão da academia não bloqueia operações

| Campo | Diagnóstico |
|---|---|
| Categoria | Autorização |
| Severidade e fundamento | **alta**. Suspensão sem efeito nas ações e potencial continuidade financeira/física. |
| Grau de confirmação | Problema reproduzido em função isolada; fluxo HTTP não executado |
| Página/fluxo/operação | Workspace suspenso e qualquer API com guard |
| Arquivos/funções/linhas | [src/modules/workspaces/application/guard.ts:47](<../../../src/modules/workspaces/application/guard.ts#L47>); [src/modules/workspaces/application/context-service.ts:125](<../../../src/modules/workspaces/application/context-service.ts#L125>) |
| Evidência concreta | O guard seleciona isActive do workspace, mas não o testa; a prova sintética com isActive=false autoriza workspace.manage. Contexto/layout não reparam isso. |
| Comportamento atual | O guard seleciona isActive do workspace, mas não o testa; a prova sintética com isActive=false autoriza workspace.manage. Contexto/layout não reparam isso. |
| Esperado e fundamento | Suspensão administrável deve produzir efeito servidor definido. O campo e a ação de suspender existentes fundamentam a expectativa, mantendo exceções de recuperação a decidir. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Membro ativo mantém sessão e acessa API depois de workspace.isActive=false. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Suspensão sem efeito nas ações e potencial continuidade financeira/física. |
| Causa demonstrada/provável | Só a atividade de WorkspaceMember é checada. |
| Correção recomendada | Aplicar política de suspensão no guard/contexto e integrações; explicitar operações permitidas para regularização. |
| Dependências/efeitos | Auth, cron, agente/cache e superadmin. |
| Validação da correção | Sessão prévia e nova, todos os perfis, API e agente/cache: comparar estado ativo/suspenso e exceções. |
| Esforço/incerteza | médio; depende da política de recuperação/offline |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-002"></a>

## GYM-AUD-002 — Grants por unidade viram permissões globais ou caem no papel legado

| Campo | Diagnóstico |
|---|---|
| Categoria | Autorização |
| Severidade e fundamento | **alta**. Acesso a pessoas, finanças ou equipamento fora da unidade delegada. |
| Grau de confirmação | Problema reproduzido em função isolada; alcance HTTP inferido dos callers |
| Página/fluxo/operação | Guard e endpoints com unidades |
| Arquivos/funções/linhas | [src/modules/workspaces/application/guard.ts:117](<../../../src/modules/workspaces/application/guard.ts#L117>); [src/modules/workspaces/application/context-service.ts:145](<../../../src/modules/workspaces/application/context-service.ts#L145>) |
| Evidência concreta | Sem options.unitId todos os grants são somados. Quando unitId não combina e roles fica vazio, member.role é usado. Prova MANAGER unidade-a autorizou unidade-b via legado. |
| Comportamento atual | Sem options.unitId todos os grants são somados. Quando unitId não combina e roles fica vazio, member.role é usado. Prova MANAGER unidade-a autorizou unidade-b via legado. |
| Esperado e fundamento | Grant de unidade deve limitar aquela unidade; contexto e guard precisam concordar. A presença de unitId no modelo fundamenta o limite. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Usuário tem grant local privilegiado e papel legado compatível; endpoint omite unitId ou informa outra unidade. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Acesso a pessoas, finanças ou equipamento fora da unidade delegada. |
| Causa demonstrada/provável | Resolução de papéis/fallback duplicada e opt-in de unitId. |
| Correção recomendada | Separar grants globais/locais; aplicar escopo em cada query e não restaurar permissão revogada por fallback. |
| Dependências/efeitos | RoleGrant, navegação, filtros e migração de papéis legados. |
| Validação da correção | Duas unidades, grant local, revogação e multi-role: testes negativos em leituras e escritas. |
| Esforço/incerteza | grande; migração/semântica de papel legado incertas |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-003"></a>

## GYM-AUD-003 — Gerente pode promover OWNER e mudança de papel preserva grants antigos

| Campo | Diagnóstico |
|---|---|
| Categoria | Privilégios |
| Severidade e fundamento | **alta**. Escalada a todas as capabilities e demissão sem perda efetiva de privilégio. |
| Grau de confirmação | Fato confirmado no código; exploração não executada |
| Página/fluxo/operação | PATCH staff |
| Arquivos/funções/linhas | [src/app/api/gym/staff/[id]/route.ts:46](<../../../src/app/api/gym/staff/[id]/route.ts#L46>); [src/modules/workspaces/application/staff-service.ts:514](<../../../src/modules/workspaces/application/staff-service.ts#L514>); [src/modules/workspaces/application/staff-service.ts:574](<../../../src/modules/workspaces/application/staff-service.ts#L574>) |
| Evidência concreta | staff.manage inclui MANAGER; serviço escreve role recebido e cria novo grant sem política de concessão por ator nem revogar anteriores. A proteção só trata rebaixamento do último OWNER legado. |
| Comportamento atual | staff.manage inclui MANAGER; serviço escreve role recebido e cria novo grant sem política de concessão por ator nem revogar anteriores. A proteção só trata rebaixamento do último OWNER legado. |
| Esperado e fundamento | A concessão de titularidade exige alçada explícita e revogação precisa retirar direitos; existe endpoint separado de transferência pelo proprietário. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: MANAGER envia role OWNER para si/terceiro; ou alguém rebaixa colaborador que mantém grant antigo. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Escalada a todas as capabilities e demissão sem perda efetiva de privilégio. |
| Causa demonstrada/provável | Atualização de perfil e concessão de autoridade misturadas. |
| Correção recomendada | Limitar roles concedíveis pelo ator; separar transferência/grants; sincronizar revogação/role legado. |
| Dependências/efeitos | OwnershipService, guard/contexto e equipe. |
| Validação da correção | MANAGER→OWNER deve ser recusado; após demissão/rebaixamento nenhuma capability antiga deve permanecer. |
| Esforço/incerteza | médio; copropriedade requer decisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-004"></a>

## GYM-AUD-004 — Convite pode ser aceito por outra conta e ultrapassar quota em aceitação

| Campo | Diagnóstico |
|---|---|
| Categoria | Convites |
| Severidade e fundamento | **alta**. Conta indevida recebe papel; quota ultrapassada/reutilização concorrente plausível. |
| Grau de confirmação | Fato confirmado; replay concorrente é risco |
| Página/fluxo/operação | Invitation accept |
| Arquivos/funções/linhas | [src/modules/workspaces/application/staff-service.ts:243](<../../../src/modules/workspaces/application/staff-service.ts#L243>); [src/modules/workspaces/application/staff-service.ts:60](<../../../src/modules/workspaces/application/staff-service.ts#L60>); [src/app/api/gym/invitations/accept/route.ts:40](<../../../src/app/api/gym/invitations/accept/route.ts#L40>) |
| Evidência concreta | Token/hash/expiry/estado são verificados, mas não igualdade do e-mail da sessão com o destinatário. Token e estado são lidos antes da transação; quota é conferida ao convidar, não ao aceitar. |
| Comportamento atual | Token/hash/expiry/estado são verificados, mas não igualdade do e-mail da sessão com o destinatário. Token e estado são lidos antes da transação; quota é conferida ao convidar, não ao aceitar. |
| Esperado e fundamento | Convite dirigido ao e-mail deve vincular a conta correta e ser consumido atomicamente, respeitando quota no momento efetivo. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Conta autenticada diferente usa link; convites pendentes aceitos simultaneamente perto do limite. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Conta indevida recebe papel; quota ultrapassada/reutilização concorrente plausível. |
| Causa demonstrada/provável | Token tratado como autoridade suficiente; check e consumo separados. |
| Correção recomendada | Validar identidade destinatária ou fluxo explícito de transferência; claim condicional e quota atômica. |
| Dependências/efeitos | Login/invite UI, entitlements, member/grants. |
| Validação da correção | Dois usuários e duas aceitações concorrentes: um destinatário/um consumo; testar expiry/revogação/quota. |
| Esforço/incerteza | médio; sem banco real a disputa permanece risco |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-005"></a>

## GYM-AUD-005 — DTOs retornam material de autenticação e token de cartão

| Campo | Diagnóstico |
|---|---|
| Categoria | Exposição de dados |
| Severidade e fundamento | **crítica**. Hash pode permitir tentativa offline; setupToken ativo permite ativação indevida; segredo 2FA/token financeiro expostos. Gravidade crítica pelo material de controle de conta. |
| Grau de confirmação | Serializer reproduzido com dados sintéticos; includes e handlers confirmados |
| Página/fluxo/operação | Matrículas, sessões/rosters e presença |
| Arquivos/funções/linhas | [src/modules/workspaces/application/enrollment-service.ts:124](<../../../src/modules/workspaces/application/enrollment-service.ts#L124>); [src/modules/workspaces/application/enrollment-service.ts:833](<../../../src/modules/workspaces/application/enrollment-service.ts#L833>); [src/modules/workspaces/application/gym-class-service.ts:1043](<../../../src/modules/workspaces/application/gym-class-service.ts#L1043>); [src/modules/workspaces/application/gym-booking-service.ts:750](<../../../src/modules/workspaces/application/gym-booking-service.ts#L750>) |
| Evidência concreta | serializeEnrollment espalha o objeto; consultas incluem studentMember.user:true. A prova manteve password/setupToken/twoFactorSecret e creditCardToken em JSON. Outros retornos de aula/presença também incluem User bruto. |
| Comportamento atual | serializeEnrollment espalha o objeto; consultas incluem studentMember.user:true. A prova manteve password/setupToken/twoFactorSecret e creditCardToken em JSON. Outros retornos de aula/presença também incluem User bruto. |
| Esperado e fundamento | Resposta de gestão deve trazer somente identidade necessária, nunca hashes/tokens/segredos de autenticação. Sanitizers allowlist já existem no domínio. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Ator autorizado a consultar matrícula/aula recebe dados de User que possua esses campos; nenhuma exploração real feita. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Hash pode permitir tentativa offline; setupToken ativo permite ativação indevida; segredo 2FA/token financeiro expostos. Gravidade crítica pelo material de controle de conta. |
| Causa demonstrada/provável | Includes amplos e serializer focado apenas em BigInt. |
| Correção recomendada | Select allowlist na consulta e DTO final por operação; não confiar em remover poucas chaves após spread. |
| Dependências/efeitos | Todas APIs/SSR que retornam matrícula, Booking/Class/AccessOverride e contratos TS. |
| Validação da correção | Inspecionar payload HTTP sintético de todos os perfis permitidos: nenhuma chave sensível mesmo em relações aninhadas. |
| Esforço/incerteza | médio; alcance exige busca de todos os user:true |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-006"></a>

## GYM-AUD-006 — Leitura de aluno autoriza alteração cadastral

| Campo | Diagnóstico |
|---|---|
| Categoria | Autorização |
| Severidade e fundamento | **alta**. Mudança indevida de identidade, operação e dados compartilhados com outras academias. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | PATCH students/[id] |
| Arquivos/funções/linhas | [src/app/api/gym/students/[id]/route.ts:49](<../../../src/app/api/gym/students/[id]/route.ts#L49>); [src/modules/workspaces/application/gym-student-service.ts:744](<../../../src/modules/workspaces/application/gym-student-service.ts#L744>) |
| Evidência concreta | PATCH exige students.read. Serviço altera User, perfil/member, plano/unidade e isActive; FINANCE/ASSISTANT têm leitura sem gestão na matriz. |
| Comportamento atual | PATCH exige students.read. Serviço altera User, perfil/member, plano/unidade e isActive; FINANCE/ASSISTANT têm leitura sem gestão na matriz. |
| Esperado e fundamento | Escrita exige students.manage e escopo do campo/ator. A capability separada existente é o fundamento. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: FINANCE/ASSISTANT envia PATCH com ID de aluno da própria academia. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Mudança indevida de identidade, operação e dados compartilhados com outras academias. |
| Causa demonstrada/provável | Guard de leitura reaproveitado na mutação; faltam limites de campo. |
| Correção recomendada | Exigir gestão; separar identidade global de dados locais e permitir apenas campos pertinentes à responsabilidade. |
| Dependências/efeitos | Ficha aluno, contratos, privacy e outros vínculos do User. |
| Validação da correção | Perfis somente leitura não alteram qualquer campo; gerente/recepção legítimos alteram só dados locais autorizados. |
| Esforço/incerteza | médio; política da identidade global precisa definição |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-007"></a>

## GYM-AUD-007 — Leitura operacional expõe saúde sem direito de saúde/atribuição

| Campo | Diagnóstico |
|---|---|
| Categoria | Privacidade |
| Severidade e fundamento | **alta**. Exposição de saúde a operadores sem finalidade implementada para esse acesso. |
| Grau de confirmação | Fato confirmado; payload real não consultado |
| Página/fluxo/operação | Lista/detalhe de alunos, avaliações e página financeiro |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-student-service.ts:97](<../../../src/modules/workspaces/application/gym-student-service.ts#L97>); [src/modules/workspaces/application/gym-student-service.ts:272](<../../../src/modules/workspaces/application/gym-student-service.ts#L272>); [src/modules/workspaces/application/gym-assessment-service.ts:66](<../../../src/modules/workspaces/application/gym-assessment-service.ts#L66>); [src/app/(gym)/gym/finance/page.tsx:67](<../../../src/app/(gym)/gym/finance/page.tsx#L67>) |
| Evidência concreta | students.read retorna medicalClearance/notes. Restrição de atribuição depende de memberRole===TRAINER, não de todas as roles. Avaliações não impõem assignment em todos os caminhos; financeiro reutiliza lista ampla. |
| Comportamento atual | students.read retorna medicalClearance/notes. Restrição de atribuição depende de memberRole===TRAINER, não de todas as roles. Avaliações não impõem assignment em todos os caminhos; financeiro reutiliza lista ampla. |
| Esperado e fundamento | health.read.assigned deve governar dados médicos e health.manage.assigned as alterações; matriz já distingue saúde de cadastro. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Financeiro/recepção/assistente consulta; trainer multi-role ou aluno não atribuído. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Exposição de saúde a operadores sem finalidade implementada para esse acesso. |
| Causa demonstrada/provável | DTO operacional mistura saúde; checks inconsistentes de papel primário. |
| Correção recomendada | DTO por finalidade/capability e filtro por vínculo de atendimento; não remover dado necessário de quem tem direito. |
| Dependências/efeitos | Avaliações, arquivos, responsáveis e ficha compartilhada. |
| Validação da correção | Perfis operacionais veem cadastro, não saúde; trainer só atribuídos; responsável respeita hasHealthAccess. |
| Esforço/incerteza | médio; inventário de campos precisa fechar com produto |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-008"></a>

## GYM-AUD-008 — Busca de duplicidade consulta pessoas de outras academias

| Campo | Diagnóstico |
|---|---|
| Categoria | Isolamento de dados |
| Severidade e fundamento | **alta**. Confirmação de identidade/contatos e possível vínculo indevido; abuso em escala depende de rate limit/config. |
| Grau de confirmação | Fato confirmado no código; enumeração não executada |
| Página/fluxo/operação | students/check-duplicate |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-student-service.ts:373](<../../../src/modules/workspaces/application/gym-student-service.ts#L373>); [src/app/api/gym/students/check-duplicate/route.ts:8](<../../../src/app/api/gym/students/check-duplicate/route.ts#L8>) |
| Evidência concreta | Pesquisa User global por CPF/e-mail/telefone pode devolver ID/nome/contato/data de nascimento de pessoa sem vínculo com o tenant; máscaras não eliminam todo dado. |
| Comportamento atual | Pesquisa User global por CPF/e-mail/telefone pode devolver ID/nome/contato/data de nascimento de pessoa sem vínculo com o tenant; máscaras não eliminam todo dado. |
| Esperado e fundamento | Reusar identidade exige fluxo controlado de vinculação e minimização, não diretório global para operador local. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador autorizado consulta identificadores conhecidos de pessoa de outra academia. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Confirmação de identidade/contatos e possível vínculo indevido; abuso em escala depende de rate limit/config. |
| Causa demonstrada/provável | Deduplicação global confundida com permissão de leitura. |
| Correção recomendada | Retornar informação mínima e desafio/consentimento para vincular; limitar buscas/abuso e registrar evento. |
| Dependências/efeitos | Cadastro, importação, User global. |
| Validação da correção | Consulta cross-tenant não devolve dados pessoais nem IDs utilizáveis; vínculo legítimo continua possível. |
| Esforço/incerteza | médio; desafio de vinculação é decisão de produto |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-009"></a>

## GYM-AUD-009 — Pedido de exclusão local anonimiza identidade global imediatamente

| Campo | Diagnóstico |
|---|---|
| Categoria | Privacidade e integridade |
| Severidade e fundamento | **alta**. Perda de identidade/login nos outros vínculos, sessão JWT anterior ainda possível, purga incompleta e garantia enganosa. |
| Grau de confirmação | Fato confirmado no código; execução real proibida |
| Página/fluxo/operação | privacy/delete-request |
| Arquivos/funções/linhas | [src/app/api/gym/privacy/delete-request/route.ts:8](<../../../src/app/api/gym/privacy/delete-request/route.ts#L8>); [src/modules/workspaces/application/gym-offboarding-service.ts:529](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L529>) |
| Evidência concreta | Endpoint aceita students.manage/workspace.manage e executa anon User/PrivacyConsent global, desativando só o member local. Não comprova pedido do titular; preserva DOB/gender/arquivos/evaluations e exclui PENDING_ACCEPTANCE do cancelamento. |
| Comportamento atual | Endpoint aceita students.manage/workspace.manage e executa anon User/PrivacyConsent global, desativando só o member local. Não comprova pedido do titular; preserva DOB/gender/arquivos/evaluations e exclui PENDING_ACCEPTANCE do cancelamento. |
| Esperado e fundamento | Autoridade da academia é local; exclusão global exige titular/autoridade verificável e processo coordenado. Rota e texto prometem anonimização/purga completa. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Recepcionista/gestor informa ID de membro que também participa de outros workspaces. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Perda de identidade/login nos outros vínculos, sessão JWT anterior ainda possível, purga incompleta e garantia enganosa. |
| Causa demonstrada/provável | Request e execução final confundidos; dados globais tratados como locais. |
| Correção recomendada | Separar solicitação/validação/execução; desligamento local próprio; dossier de escopo e retenção; revogação de sessão e confirmação de purga. |
| Dependências/efeitos | Auth, saúde/arquivos, contratos, consentimento e hardware. |
| Validação da correção | Usuário com dois vínculos: ato local não destrói o outro; ato global legítimo cobre todos os dados ou explicita retenção e ACK. |
| Esforço/incerteza | grande; envolve política de privacidade e serviços externos |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-010"></a>

## GYM-AUD-010 — Exportação do titular tem alçada excessiva e cobertura incompleta

| Campo | Diagnóstico |
|---|---|
| Categoria | Privacidade |
| Severidade e fundamento | **alta**. Acesso amplo a finanças/saúde e entrega incompleta rotulada completa. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | privacy/export |
| Arquivos/funções/linhas | [src/app/api/gym/privacy/export/route.ts:8](<../../../src/app/api/gym/privacy/export/route.ts#L8>); [src/modules/workspaces/application/gym-offboarding-service.ts:332](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L332>) |
| Evidência concreta | Guard aceita reports.operational/students.manage/workspace.manage em vez de privacy.manage. Dossier agrega contratos/finanças/saúde/consents globais sem atribuição; limita logs a 500/aulas a 200 e omite arquivos/evaluations/workouts. |
| Comportamento atual | Guard aceita reports.operational/students.manage/workspace.manage em vez de privacy.manage. Dossier agrega contratos/finanças/saúde/consents globais sem atribuição; limita logs a 500/aulas a 200 e omite arquivos/evaluations/workouts. |
| Esperado e fundamento | Portabilidade precisa autoridade e escopo do titular; UI afirma conter todos os dados, exigindo completude ou indicação de recorte. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: TRAINER com relatório operacional pede dossiê de qualquer member do tenant. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Acesso amplo a finanças/saúde e entrega incompleta rotulada completa. |
| Causa demonstrada/provável | Permissão de relatório usada como permissão de privacidade; lista manual de entidades. |
| Correção recomendada | Usar fluxo autorizado do titular/privacidade; export explícito por escopo com paginação/completude e retenção. |
| Dependências/efeitos | Seção LGPD, User global e relações shared. |
| Validação da correção | Trainer não autorizado recebe 403; export sintético com >limites declara/completa todos os registros pertinentes. |
| Esforço/incerteza | grande; classificação dos dados e retenção incertas |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-011"></a>

## GYM-AUD-011 — IDs de unidade e relações locais não garantem pertencimento composto

| Campo | Diagnóstico |
|---|---|
| Categoria | Integridade/tenant |
| Severidade e fundamento | **alta**. Registros incompatíveis, leitura/controle indevido e relatórios incorretos. |
| Grau de confirmação | Risco identificado com ausência de validação confirmada |
| Página/fluxo/operação | Enrollment, staff, conta, schedule/manual session e import |
| Arquivos/funções/linhas | [src/modules/workspaces/application/enrollment-service.ts:154](<../../../src/modules/workspaces/application/enrollment-service.ts#L154>); [src/modules/workspaces/application/staff-service.ts:514](<../../../src/modules/workspaces/application/staff-service.ts#L514>); [src/modules/workspaces/application/cash-drawer-expense-service.ts:209](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L209>); [src/modules/workspaces/application/gym-class-service.ts:1234](<../../../src/modules/workspaces/application/gym-class-service.ts#L1234>); [prisma/schema.prisma:2760](<../../../prisma/schema.prisma#L2760>) |
| Evidência concreta | FKs de workspaceId/unit/member/recurso são independentes. Caminhos recebem unitId sem validar tenant; manual session valida sala, mas não todos os demais IDs/consistência com unidade. |
| Comportamento atual | FKs de workspaceId/unit/member/recurso são independentes. Caminhos recebem unitId sem validar tenant; manual session valida sala, mas não todos os demais IDs/consistência com unidade. |
| Esperado e fundamento | Entidades locais relacionadas devem pertencer ao mesmo workspace/unidade; o isolamento do módulo fundamenta essa regra. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Ator envia ID válido de outro tenant/unidade junto ao workspace próprio; efeito depende da combinação e FK real. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Registros incompatíveis, leitura/controle indevido e relatórios incorretos. |
| Causa demonstrada/provável | Validação de existência separada de validação de pertencimento. |
| Correção recomendada | Resolver IDs no contexto tenant; aplicar FKs compostas onde adequadas após avaliar dados existentes. |
| Dependências/efeitos | Schema/migrations, todos serviços e unidade scope. |
| Validação da correção | Matriz de IDs estrangeiros para cada mutação; nenhuma associação cross-tenant persistida. |
| Esforço/incerteza | grande; dados existentes/baseline precisam ser conhecidos |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-012"></a>

## GYM-AUD-012 — Settings BigInt bruto quebra respostas de configuração e dependentes

| Campo | Diagnóstico |
|---|---|
| Categoria | Contrato/serialização |
| Severidade e fundamento | **média**. Página/GET ou save que serializa atualização falha; confirmação de erro HTTP exige ambiente isolado. |
| Grau de confirmação | TypeError JSON reproduzido isoladamente; respostas HTTP não executadas |
| Página/fluxo/operação | superadmin workspaces/gym-config e guardian dependents |
| Arquivos/funções/linhas | [src/app/api/superadmin/workspaces/[id]/route.ts:6](<../../../src/app/api/superadmin/workspaces/[id]/route.ts#L6>); [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:7](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L7>); [src/modules/workspaces/application/minor-service.ts:406](<../../../src/modules/workspaces/application/minor-service.ts#L406>); [prisma/schema.prisma:2515](<../../../prisma/schema.prisma#L2515>) |
| Evidência concreta | GymSettings contém maxReceptionistDiscountInCents BigInt; handlers devolvem settings bruto. Portal também stringify de objeto com settings. JSON.stringify(2000n) reproduziu TypeError. |
| Comportamento atual | GymSettings contém maxReceptionistDiscountInCents BigInt; handlers devolvem settings bruto. Portal também stringify de objeto com settings. JSON.stringify(2000n) reproduziu TypeError. |
| Esperado e fundamento | DTO HTTP/SSR deve ser JSON-serializável; valores monetários precisam conversão contratada. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Academia com GymSettings carregado e resposta JSON/serialization correspondente. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Página/GET ou save que serializa atualização falha; confirmação de erro HTTP exige ambiente isolado. |
| Causa demonstrada/provável | Conversão seletiva não cobre settings compartilhado. |
| Correção recomendada | DTO de settings/guardian/superadmin consistente e testes de serialização reais do payload. |
| Dependências/efeitos | Handlers GET/PATCH/POST relacionados e tipos cliente. |
| Validação da correção | Criar fixture com settings completo; GET/PATCH retornam JSON sem erro e com centavos corretos. |
| Esforço/incerteza | pequeno a médio; validar todas as superfícies |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-013"></a>

## GYM-AUD-013 — Configuração individual envia campos diferentes do contrato servidor

| Campo | Diagnóstico |
|---|---|
| Categoria | Funcional/contrato |
| Severidade e fundamento | **alta**. Operador recebe sucesso sem alterações pretendidas ou erro Prisma; limites exibidos podem ser defaults fictícios. |
| Grau de confirmação | Fato confirmado no código; save real não executado |
| Página/fluxo/operação | superadmin/workspaces/[id] |
| Arquivos/funções/linhas | [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx:166](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx#L166>); [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:68](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L68>); [src/modules/workspaces/application/superadmin-service.ts:129](<../../../src/modules/workspaces/application/superadmin-service.ts#L129>) |
| Evidência concreta | Cliente envia licenseLimits/policies; API lê settings/subscription/reason. Limites são lidos de data.settings, mas estão em subscription. UI usa HYBRID e endereço objeto enquanto modelo usa modo/string diferentes. |
| Comportamento atual | Cliente envia licenseLimits/policies; API lê settings/subscription/reason. Limites são lidos de data.settings, mas estão em subscription. UI usa HYBRID e endereço objeto enquanto modelo usa modo/string diferentes. |
| Esperado e fundamento | Salvar as configurações exibidas deve persistir os mesmos campos e reapresentá-los após reload; finalidade explícita da tela. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Editar limite/política/adicionar unidade e salvar. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Operador recebe sucesso sem alterações pretendidas ou erro Prisma; limites exibidos podem ser defaults fictícios. |
| Causa demonstrada/provável | Dois DTOs independentes e dados locais não tipados. |
| Correção recomendada | Contratos compartilhados de settings/license/unit e mapping claro; razão e validação; reabrir após salvar. |
| Dependências/efeitos | BigInt GYM-AUD-012 e licença/FeatureFlags. |
| Validação da correção | Alterar um campo de cada seção, GET confirmar e reload manter; unit address e enum válidos. |
| Esforço/incerteza | médio; significado do modo biométrico precisa resolver |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-014"></a>

## GYM-AUD-014 — Listagem omite isActive e impede reativação coerente

| Campo | Diagnóstico |
|---|---|
| Categoria | Funcional |
| Severidade e fundamento | **média**. Status visual falso e tentativa repetida de suspender em vez de reativar. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | Superadmin workspace list |
| Arquivos/funções/linhas | [src/app/api/superadmin/workspaces/route.ts:8](<../../../src/app/api/superadmin/workspaces/route.ts#L8>); [src/app/(superadmin)/superadmin/workspaces/page.tsx:167](<../../../src/app/(superadmin)/superadmin/workspaces/page.tsx#L167>) |
| Evidência concreta | GET formatado omite isActive; cliente usa ws.isActive para status/toggle e assume valor quando undefined. |
| Comportamento atual | GET formatado omite isActive; cliente usa ws.isActive para status/toggle e assume valor quando undefined. |
| Esperado e fundamento | Uma ação de suspender/reativar deve usar estado persistido, campo existente no Workspace. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Listar academia suspensa e clicar toggle. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Status visual falso e tentativa repetida de suspender em vez de reativar. |
| Causa demonstrada/provável | DTO de lista não inclui campo usado pelo consumidor. |
| Correção recomendada | Incluir status contratual no DTO e usar PATCH explícito do estado desejado. |
| Dependências/efeitos | Store superadmin e bloqueio de suspensão. |
| Validação da correção | Academias ativa/inativa na mesma lista exibem e alternam corretamente após reload. |
| Esforço/incerteza | pequeno; execução depende de fixture |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-015"></a>

## GYM-AUD-015 — Flags globais armazenadas não bloqueiam funcionalidades no servidor

| Campo | Diagnóstico |
|---|---|
| Categoria | Entitlements/configuração |
| Severidade e fundamento | **alta**. Falso senso de controle de segurança/uso e continuidade de ações físicas/financeiras. |
| Grau de confirmação | Fato confirmado no código; requests reais não executados |
| Página/fluxo/operação | gym-settings, APIs, agente e navegação |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-feature-flags-service.ts:60](<../../../src/modules/workspaces/application/gym-feature-flags-service.ts#L60>); [src/modules/workspaces/application/entitlements-service.ts:29](<../../../src/modules/workspaces/application/entitlements-service.ts#L29>); [src/app/api/gym/devices/agent/pull/route.ts:16](<../../../src/app/api/gym/devices/agent/pull/route.ts#L16>); [src/app/(gym)/gym/reception/reception-client.tsx:162](<../../../src/app/(gym)/gym/reception/reception-client.tsx#L162>) |
| Evidência concreta | Só turnstilesEnabled participa de entitlements/UI; assertCanPerform não tem caller localizado. APIs de device/access/biometry continuam sem flag. Outras flags/defaults apenas persistem; recepção continua polling/hardware com off. |
| Comportamento atual | Só turnstilesEnabled participa de entitlements/UI; assertCanPerform não tem caller localizado. APIs de device/access/biometry continuam sem flag. Outras flags/defaults apenas persistem; recepção continua polling/hardware com off. |
| Esperado e fundamento | UI promete bloquear/ocultar recursos; políticas globais precisam enforcement compatível, ou indicação clara de ainda não implementadas. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Superadmin desliga módulo/2FA/export/biometria/catracas e ator chama URL/API diretamente. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Falso senso de controle de segurança/uso e continuidade de ações físicas/financeiras. |
| Causa demonstrada/provável | FeatureFlags desacoplado de guards/services e settings conflitados. |
| Correção recomendada | Definir composição global/licença/local; aplicar em servidor/agente/jobs e UI; não anunciar garantia inexistente. |
| Dependências/efeitos | Entitlements, layout/nav, device/cache e cron. |
| Validação da correção | Cada flag off: API rejeita, UI não oferece, jobs/agent obedecem; caso de recuperação definido. |
| Esforço/incerteza | grande; módulos já em uso precisam estratégia de transição |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-016"></a>

## GYM-AUD-016 — Configuração global aceita valores sem schema e salva sem baseline

| Campo | Diagnóstico |
|---|---|
| Categoria | Configuração/UX |
| Severidade e fundamento | **média**. Config incoerente e perda de mudança; impacto maior das flags está em GYM-AUD-015. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | PATCH global gym-settings |
| Arquivos/funções/linhas | [src/app/api/superadmin/gym-settings/route.ts:22](<../../../src/app/api/superadmin/gym-settings/route.ts#L22>); [src/modules/workspaces/application/gym-feature-flags-service.ts:130](<../../../src/modules/workspaces/application/gym-feature-flags-service.ts#L130>); [src/app/(superadmin)/superadmin/gym-settings/page.tsx:195](<../../../src/app/(superadmin)/superadmin/gym-settings/page.tsx#L195>) |
| Evidência concreta | Body configs validado só como objeto; service String converte valores; UI salva todo draft com razão genérica, sem dirty/baseline/version, status local pode parecer aplicado. |
| Comportamento atual | Body configs validado só como objeto; service String converte valores; UI salva todo draft com razão genérica, sem dirty/baseline/version, status local pode parecer aplicado. |
| Esperado e fundamento | Admin deve enviar enums/limites/bools válidos e identificar estado aplicado/pending; evitar sobrescrever alteração concorrente silenciosamente. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Body inválido ou dois administradores com drafts distintos; editar durante save. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Config incoerente e perda de mudança; impacto maior das flags está em GYM-AUD-015. |
| Causa demonstrada/provável | DTO aberto e formulário sem ciclo de edição explícito. |
| Correção recomendada | Schema tipado/faixas, GET/response DTO, baseline/dirty e validação de conflito/version se multiadmin. |
| Dependências/efeitos | SystemSetting/audit e proposta visual seção13. |
| Validação da correção | Invalid enum/negative/NaN/type rejeitados; pending só vira applied na resposta; conflito explícito. |
| Esforço/incerteza | médio; versionamento pode ser evolução, validar necessidade |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-017"></a>

## GYM-AUD-017 — Aprovação de desconto é texto do cliente e não alçada comprovada

| Campo | Diagnóstico |
|---|---|
| Categoria | Financeiro/autorização |
| Severidade e fundamento | **alta**. Desconto sem aprovação, valores/recebimento falsos e divergência contábil. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | Criar GymInvoice |
| Arquivos/funções/linhas | [src/modules/workspaces/application/invoice-service.ts:40](<../../../src/modules/workspaces/application/invoice-service.ts#L40>); [src/app/api/gym/finance/invoices/route.ts:55](<../../../src/app/api/gym/finance/invoices/route.ts#L55>) |
| Evidência concreta | Acima do limite a regra permite continuar se discountAuthorizedByUserId foi enviado, sem validar aprovador/autorização. Desconto negativo não é rejeitado em todos os checks; total zerado usa paidAmount inconsistente. |
| Comportamento atual | Acima do limite a regra permite continuar se discountAuthorizedByUserId foi enviado, sem validar aprovador/autorização. Desconto negativo não é rejeitado em todos os checks; total zerado usa paidAmount inconsistente. |
| Esperado e fundamento | Alçada explicitamente implementada requer aprovação de ator autorizado; desconto não pode virar acréscimo sem semântica própria. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador invoices.issue envia string de aprovador ou valores extremos. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Desconto sem aprovação, valores/recebimento falsos e divergência contábil. |
| Causa demonstrada/provável | Identificador informado tratado como ato de autorização. |
| Correção recomendada | Aprovação server-side vinculada ao ator/valor; validação centavos/total; invoice gratuita sem recebimento fictício. |
| Dependências/efeitos | Settings discount, recibo, analytics e recepção. |
| Validação da correção | Desconto acima limite sem autorização 403; limites e zero/negativo testados; saldo/total/pago fecham. |
| Esforço/incerteza | médio; fluxo de aprovação a definir |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-018"></a>

## GYM-AUD-018 — Sangria pode creditar conta financeira de outra academia

| Campo | Diagnóstico |
|---|---|
| Categoria | Isolamento financeiro |
| Severidade e fundamento | **alta**. Saldo de outro tenant alterado; fechamento e livro local não correspondem à conta real. |
| Grau de confirmação | Fato confirmado no código; transferência real não executada |
| Página/fluxo/operação | cash-drawer movement BLEED |
| Arquivos/funções/linhas | [src/modules/workspaces/application/cash-drawer-expense-service.ts:1102](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L1102>); [src/modules/workspaces/application/cash-drawer-expense-service.ts:1002](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L1002>); [src/app/api/gym/finance/cash-drawer/movements/route.ts:8](<../../../src/app/api/gym/finance/cash-drawer/movements/route.ts#L8>) |
| Evidência concreta | destinationAccountId de BLEED é atualizado por id sem filtro de workspace. Abertura recebe financialAccountId sem validação tenant suficiente. |
| Comportamento atual | destinationAccountId de BLEED é atualizado por id sem filtro de workspace. Abertura recebe financialAccountId sem validação tenant suficiente. |
| Esperado e fundamento | Movimentação de caixa só opera contas do mesmo workspace e relação correta com sessão. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador autorizado usa sessão própria e destinationAccountId válido estrangeiro. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Saldo de outro tenant alterado; fechamento e livro local não correspondem à conta real. |
| Causa demonstrada/provável | FK valida existência, não domínio; update global por ID. |
| Correção recomendada | Buscar sessão/contas sob tenant, validar vínculo/unidade, efetuar lançamentos atômicos. |
| Dependências/efeitos | Transfer/accounts/ledger e GYM-AUD-011. |
| Validação da correção | IDs estrangeiros 403/404 e nenhum saldo alterado; BLEED legítima lança ambos os lados uma vez. |
| Esforço/incerteza | médio; histórico incorreto precisa investigação posterior |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-019"></a>

## GYM-AUD-019 — Aceite representado não prova identidade do responsável

| Campo | Diagnóstico |
|---|---|
| Categoria | Menores/segurança |
| Severidade e fundamento | **alta**. Assinatura atribuída indevidamente e falsa impressão de matrícula regularizada. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | guardian accept-terms / MinorService |
| Arquivos/funções/linhas | [src/modules/workspaces/application/minor-service.ts:290](<../../../src/modules/workspaces/application/minor-service.ts#L290>); [src/app/api/guardian/dependents/[id]/accept-terms/route.ts:6](<../../../src/app/api/guardian/dependents/[id]/accept-terms/route.ts#L6>) |
| Evidência concreta | Sessão autenticada fornece guardianUserId, mas service não exige igualdade/vínculo suficiente com GymGuardian nem verificação para esse ato. Cadastro permite guardianUserId enviado e CPF só length. Aceite é LegalAcceptance genérico, não GymContractAcceptance. |
| Comportamento atual | Sessão autenticada fornece guardianUserId, mas service não exige igualdade/vínculo suficiente com GymGuardian nem verificação para esse ato. Cadastro permite guardianUserId enviado e CPF só length. Aceite é LegalAcceptance genérico, não GymContractAcceptance. |
| Esperado e fundamento | Representação requer responsável do aluno autorizado e ato específico de documento/contrato; campos legalRepresentative/verifiedAt já existem. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Ator conhece guardianId/workspace e grava aceite em nome de representante. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Assinatura atribuída indevidamente e falsa impressão de matrícula regularizada. |
| Causa demonstrada/provável | Acesso ao portal/CPF e assinatura representada não compartilham regra de identidade. |
| Correção recomendada | Validar guardian ownership/verified/legal status; separate termo global de contrato da matrícula; CPF check. |
| Dependências/efeitos | Cadastro menor, portal, contrato e setup. |
| Validação da correção | Usuário alheio não aceita; representante legítimo só do dependente; versões/documentos e signer preservados. |
| Esforço/incerteza | médio; identidade legal precisa critério de verificação |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-020"></a>

## GYM-AUD-020 — Cadastro cria aluno sem ingresso completo no portal

| Campo | Diagnóstico |
|---|---|
| Categoria | Funcional/auth |
| Severidade e fundamento | **alta**. Conta sem senha/caminho de ativação, ou login aceito mas rota rejeitada. |
| Grau de confirmação | Fato confirmado no código; entrega real não testada |
| Página/fluxo/operação | RegisterStudent, CRM e import |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-student-service.ts:478](<../../../src/modules/workspaces/application/gym-student-service.ts#L478>); [src/modules/workspaces/application/gym-crm-service.ts:335](<../../../src/modules/workspaces/application/gym-crm-service.ts#L335>); [src/modules/workspaces/application/gym-import-service.ts:652](<../../../src/modules/workspaces/application/gym-import-service.ts#L652>); [src/app/(student)/layout.tsx:31](<../../../src/app/(student)/layout.tsx#L31>) |
| Evidência concreta | Register cria setupToken sem distribuição/retorno funcional; CRM cria USER sem setup; import USER com token sem distribuição. Layout aluno aceita STUDENT, não USER, embora middleware admita USER. |
| Comportamento atual | Register cria setupToken sem distribuição/retorno funcional; CRM cria USER sem setup; import USER com token sem distribuição. Layout aluno aceita STUDENT, não USER, embora middleware admita USER. |
| Esperado e fundamento | Usuário cadastrado para operação do módulo deve ter caminho de ingresso/autorização coerente; portal aluno já existe. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Novo aluno vindo de CRM/import/cadastro assistido tenta login/ativação. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Conta sem senha/caminho de ativação, ou login aceito mas rota rejeitada. |
| Causa demonstrada/provável | Modelos de identidade/ativação pessoal e gym não foram unificados. |
| Correção recomendada | Fluxo explícito de convite/setup com stub de entrega; papel local governa portal e contexto; permitir identidade multipapel. |
| Dependências/efeitos | Auth/setup/minor, context/defaultRoute e selector. |
| Validação da correção | Cadastrar em cada origem, ativar por canal simulado, entrar e selecionar academy; aluno menor segue regra definida. |
| Esforço/incerteza | grande; ingresso de menor e múltiplos papéis são decisões |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-021"></a>

## GYM-AUD-021 — Aceite de matrícula tem backend mas não consumidor de interface

| Campo | Diagnóstico |
|---|---|
| Categoria | Fluxo incompleto |
| Severidade e fundamento | **alta**. Matrícula permanece pendente ou usuário procura atalhos/bypass. |
| Grau de confirmação | Fato confirmado quanto ao endpoint; consumidor não localizado |
| Página/fluxo/operação | Enrollment PENDING_ACCEPTANCE |
| Arquivos/funções/linhas | [src/app/api/gym/enrollments/[id]/accept/route.ts:9](<../../../src/app/api/gym/enrollments/[id]/accept/route.ts#L9>); [src/modules/workspaces/application/enrollment-service.ts:313](<../../../src/modules/workspaces/application/enrollment-service.ts#L313>); [src/app/(gym)/gym/enrollments/enrollments-client.tsx:246](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx#L246>) |
| Evidência concreta | Matrícula nasce PENDING_ACCEPTANCE; endpoint/service de aceite existe. Busca de chamadas/imports UI não encontrou consumo de /accept. Portal guardian aceita outro termo. |
| Comportamento atual | Matrícula nasce PENDING_ACCEPTANCE; endpoint/service de aceite existe. Busca de chamadas/imports UI não encontrou consumo de /accept. Portal guardian aceita outro termo. |
| Esperado e fundamento | Fluxo implementado exige aceite para ativar, então deve disponibilizar entrada ao signer autorizado. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador cria matrícula e deseja ativar pelo fluxo normal. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Matrícula permanece pendente ou usuário procura atalhos/bypass. |
| Causa demonstrada/provável | Jornada de assinatura não conectada ao gerenciamento/portal. |
| Correção recomendada | Expor contrato/snapshot/version e assinatura do próprio aluno/representante; sem inventar pagamento verificado. |
| Dependências/efeitos | Minor/setup/activation e anti-bypass GYM-AUD-022. |
| Validação da correção | Aluno/guardian lê contrato correto, aceita e ativa conforme pagamento; ninguém alheio assina. |
| Esforço/incerteza | médio; experiência de assinatura e maioridade precisam fechar |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-022"></a>

## GYM-AUD-022 — Ciclo de matrícula permite direitos sem verificação financeira/contratual coerente

| Campo | Diagnóstico |
|---|---|
| Categoria | Regra de negócio |
| Severidade e fundamento | **alta**. Acesso sem condição, cobrança/desconto sem lançamento e bloqueio em data incorreta. |
| Grau de confirmação | Fato confirmado; efeito físico não testado |
| Página/fluxo/operação | activate/pause/renew/change-plan |
| Arquivos/funções/linhas | [src/modules/workspaces/application/enrollment-service.ts:452](<../../../src/modules/workspaces/application/enrollment-service.ts#L452>); [src/modules/workspaces/application/enrollment-service.ts:1268](<../../../src/modules/workspaces/application/enrollment-service.ts#L1268>); [src/modules/workspaces/application/enrollment-service.ts:548](<../../../src/modules/workspaces/application/enrollment-service.ts#L548>); [src/modules/workspaces/application/enrollment-service.ts:1119](<../../../src/modules/workspaces/application/enrollment-service.ts#L1119>) |
| Evidência concreta | activate confia paymentVerified/override do cliente; UI default true. renew pode ativar pendência sem contrato. Pausa futura muda status já; troca calcula amountToPay/credit sem fatura nem sincronização externa. |
| Comportamento atual | activate confia paymentVerified/override do cliente; UI default true. renew pode ativar pendência sem contrato. Pausa futura muda status já; troca calcula amountToPay/credit sem fatura nem sincronização externa. |
| Esperado e fundamento | Invariante escrita no service diz acesso após aceite e pagamento. Datas e ajustes comerciais devem gerar efeitos previstos ou estado pendente explícito. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Marcar checkbox, renovar pendente, pausar no futuro ou trocar plano recorrente. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Acesso sem condição, cobrança/desconto sem lançamento e bloqueio em data incorreta. |
| Causa demonstrada/provável | Transições financeiras/contratuais espalhadas e estado sobrescrito fora de máquina única. |
| Correção recomendada | Derivar pagamento de fatos; política única de transitions/vigência; gerar cobrança/aceite e sync externa para mudança. |
| Dependências/efeitos | Invoice/subscription/access/booking/cache. |
| Validação da correção | Matriz de estados, datas e pagamento parcial; todas superfícies decidem o mesmo direito; externa/local preços convergem. |
| Esforço/incerteza | grande; política de troca/renovação precisa definição |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-023"></a>

## GYM-AUD-023 — Cancelamento local não cancela recorrência externa nem converge reservas

| Campo | Diagnóstico |
|---|---|
| Categoria | Operação/financeiro |
| Severidade e fundamento | **alta**. Cobrança continua, vaga fica ocupada/contadores errados, bloqueio antecipado e inconsistência de sessão. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | Enrollment cancel e cancelStudentWithHardwarePurge |
| Arquivos/funções/linhas | [src/modules/workspaces/application/enrollment-service.ts:719](<../../../src/modules/workspaces/application/enrollment-service.ts#L719>); [src/modules/workspaces/application/gym-offboarding-service.ts:187](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L187>) |
| Evidência concreta | Cancelamento simples não chama cancelSubscription externa. Avançado cancela bookings sem ajustar contadores/promover fila, queue purga local e member pode continuar ativo. immediate=false já altera status/acesso. |
| Comportamento atual | Cancelamento simples não chama cancelSubscription externa. Avançado cancela bookings sem ajustar contadores/promover fila, queue purga local e member pode continuar ativo. immediate=false já altera status/acesso. |
| Esperado e fundamento | Encerramento deve parar cobrança conforme data acordada e retirar direito com consistência; filas/counters fazem parte do booking implementado. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Cancelar matrícula recorrente agora ou programada, com reservas futuras. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Cobrança continua, vaga fica ocupada/contadores errados, bloqueio antecipado e inconsistência de sessão. |
| Causa demonstrada/provável | Dois cancelamentos não coordenam domínios. |
| Correção recomendada | Comando de encerramento orquestrado com fases/pendências; cancelar provider e reservas pela rotina de booking; aplicar effectiveDate. |
| Dependências/efeitos | Assinatura, membro/access/cache/hardware e aulas. |
| Validação da correção | Cancelar em sandbox, confirmar externa e local; futurecancel respeita data; counters/fila e sessão convergem. |
| Esforço/incerteza | grande; política de retenção/cobrança posterior precisa fechar |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-024"></a>

## GYM-AUD-024 — Desligamento avançado e titularidade não são um fluxo confiável único

| Campo | Diagnóstico |
|---|---|
| Categoria | Operação/integridade |
| Severidade e fundamento | **média**. Aulas sem handover e operação parcial; transferência pode falhar em validação do client. |
| Grau de confirmação | Fato confirmado da desconexão; upsert null é risco não reproduzido com Prisma |
| Página/fluxo/operação | Staff terminate / ownership transfer |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-offboarding-service.ts:68](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L68>); [src/modules/workspaces/application/ownership-service.ts:153](<../../../src/modules/workspaces/application/ownership-service.ts#L153>); [src/app/(gym)/gym/staff/staff-client.tsx:298](<../../../src/app/(gym)/gym/staff/staff-client.tsx#L298>) |
| Evidência concreta | UI usa remoção simples; repasse aulas só em terminate, em transações separadas. Ownership/GymService upsert compound nullable usando null as any; a chave Prisma requer valor compatível. |
| Comportamento atual | UI usa remoção simples; repasse aulas só em terminate, em transações separadas. Ownership/GymService upsert compound nullable usando null as any; a chave Prisma requer valor compatível. |
| Esperado e fundamento | Remover profissional com alunos/aulas deve deixar responsabilidade definida; transferência transacional prometida deve funcionar com chave real. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Profissional com aula futura é removido; transfer owner cria grant global null. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Aulas sem handover e operação parcial; transferência pode falhar em validação do client. |
| Causa demonstrada/provável | Dois fluxos de offboarding e chave nullable não validada em DB. |
| Correção recomendada | Unificar UI no comando completo, atomicidade/recovery e substituir upsert nullable por operação segura/constraint apropriada. |
| Dependências/efeitos | Último dono, rolegrants, alunos e aulas. |
| Validação da correção | Banco sintético: transferir duas vezes e owner protection; falha no handover não deixa metade concluída. |
| Esforço/incerteza | médio; desempenho da transação e baseline incertos |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-025"></a>

## GYM-AUD-025 — Pagamento pode duplicar e disputar saldo; idempotência não é tenant-scoped

| Campo | Diagnóstico |
|---|---|
| Categoria | Integridade financeira |
| Severidade e fundamento | **alta**. Recebimentos duplicados, perda de atualização de saldo, quitação incorreta ou retorno cross-tenant. |
| Grau de confirmação | Código confirmado; corrida não reproduzida em banco |
| Página/fluxo/operação | recordInPersonPayment |
| Arquivos/funções/linhas | [src/modules/workspaces/application/invoice-service.ts:322](<../../../src/modules/workspaces/application/invoice-service.ts#L322>); [prisma/schema.prisma:3079](<../../../prisma/schema.prisma#L3079>); [src/app/(gym)/gym/finance/finance-client.tsx:213](<../../../src/app/(gym)/gym/finance/finance-client.tsx#L213>) |
| Evidência concreta | Lookup da chave é global e pode devolver pagamento de outro tenant. Cliente não fornece chave estável; servidor cria UUID a cada retry. Saldo/alocações são lidos antes de writes, sem lock/CAS nem unique por invoice/payment que elimine duplicidade. |
| Comportamento atual | Lookup da chave é global e pode devolver pagamento de outro tenant. Cliente não fornece chave estável; servidor cria UUID a cada retry. Saldo/alocações são lidos antes de writes, sem lock/CAS nem unique por invoice/payment que elimine duplicidade. |
| Esperado e fundamento | Repetir a mesma operação deve devolver o mesmo resultado no mesmo tenant; pagamentos concorrentes não podem sobrealocar. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Retry UI/rede ou dois operadores pagam mesma fatura; chave estrangeira conhecida. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Recebimentos duplicados, perda de atualização de saldo, quitação incorreta ou retorno cross-tenant. |
| Causa demonstrada/provável | Idempotência nominal e checks fora da proteção de concorrência. |
| Correção recomendada | Chave estável scoped, claim/unique, agregação das alocações e saldo protegido por lock/CAS/isolamento com retry. |
| Dependências/efeitos | Invoice/payment/receipt/cash/analytics. |
| Validação da correção | Duas conexões concorrentes e retry HTTP: uma operação, balance correto; mesma chave em tenants distintos não compartilha retorno. |
| Esforço/incerteza | grande; recuperação de registros existentes depende de dados |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-026"></a>

## GYM-AUD-026 — Recebimento, reversão e despesas não convergem com o caixa

| Campo | Diagnóstico |
|---|---|
| Categoria | Integridade financeira |
| Severidade e fundamento | **alta**. Caixa/conta divergentes, despesa falsamente quitada e saldo negativo concorrente. |
| Grau de confirmação | Fato confirmado; saldo real não alterado |
| Página/fluxo/operação | CASH/reverse/payExpense/transfers |
| Arquivos/funções/linhas | [src/modules/workspaces/application/invoice-service.ts:577](<../../../src/modules/workspaces/application/invoice-service.ts#L577>); [src/modules/workspaces/application/cash-drawer-expense-service.ts:758](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L758>); [src/modules/workspaces/application/cash-drawer-expense-service.ts:276](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L276>) |
| Evidência concreta | CASH pode existir sem caixa aberto; reversal não desfaz CashDrawerMovement/account de forma equivalente. payExpense marca PAID com paidAmount arbitrário/sem balance-check consistente; transferência verifica saldo antes tx. |
| Comportamento atual | CASH pode existir sem caixa aberto; reversal não desfaz CashDrawerMovement/account de forma equivalente. payExpense marca PAID com paidAmount arbitrário/sem balance-check consistente; transferência verifica saldo antes tx. |
| Esperado e fundamento | Saldo deve refletir lançamentos reais; parcial não quita integral; reversão é lançamento compensatório. Contas/caixa/allocations existentes fundamentam invariantes. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Estornar dinheiro, pagar parcialmente ou transferir simultaneamente com saldo próximo do limite. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Caixa/conta divergentes, despesa falsamente quitada e saldo negativo concorrente. |
| Causa demonstrada/provável | Modelos de pagamento e caixa atualizados em rotinas distintas. |
| Correção recomendada | Livro de lançamentos atômicos/compensação, sem apagar histórico; decidir obrigatoriedade de sessão/operador e proteger saldo. |
| Dependências/efeitos | Receipt, analytics, cashier e GYM-AUD-025. |
| Validação da correção | Pagamento e reversal deixam net zero em todas as projeções; despesa parcial permanece saldo; concorrência não ultrapassa limite. |
| Esforço/incerteza | grande; regra de caixa precisa decisão operacional |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-027"></a>

## GYM-AUD-027 — Pagador e associação financeira podem apontar para usuário alheio

| Campo | Diagnóstico |
|---|---|
| Categoria | Tenant/financeiro |
| Severidade e fundamento | **alta**. Cobrança/dados pessoais de terceiro, obligation atribuída à identidade errada. |
| Grau de confirmação | Fato confirmado de confiança excessiva; cobrança real não executada |
| Página/fluxo/operação | Invoice/billing payer/enrollment |
| Arquivos/funções/linhas | [src/modules/workspaces/application/invoice-service.ts:30](<../../../src/modules/workspaces/application/invoice-service.ts#L30>); [src/modules/workspaces/application/gym-financial-service.ts:322](<../../../src/modules/workspaces/application/gym-financial-service.ts#L322>); [src/modules/workspaces/application/gym-financial-service.ts:517](<../../../src/modules/workspaces/application/gym-financial-service.ts#L517>) |
| Evidência concreta | Invoice aceita studentUserId separado do member.userId; enrollment/payer IDs e billingUser podem ser fornecidos. Resolver consulta User global e guardian do workspace sem provar toda relação legal/financeira com o aluno. |
| Comportamento atual | Invoice aceita studentUserId separado do member.userId; enrollment/payer IDs e billingUser podem ser fornecidos. Resolver consulta User global e guardian do workspace sem provar toda relação legal/financeira com o aluno. |
| Esperado e fundamento | Cobrança deve atingir o aluno/pagador autorizado daquela obrigação e tenant, sem IDs conflitantes. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador financeiro envia IDs de usuário ou guardian não responsável pelo aluno selecionado. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Cobrança/dados pessoais de terceiro, obligation atribuída à identidade errada. |
| Causa demonstrada/provável | Snapshot fornecido e identidade global tratados como prova de vínculo. |
| Correção recomendada | Resolver pagador no servidor a partir da obrigação; custom payer explícito verificado; validar enrol/invoice/member/guardian consistentemente. |
| Dependências/efeitos | Menores, GatewayCustomer, webhook e privacidade. |
| Validação da correção | IDs cruzados negados; adulto/responsável legítimo recebe cobrança única com identidade correta. |
| Esforço/incerteza | médio; custom payer necessita política explícita |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-028"></a>

## GYM-AUD-028 — Provisionamento externo pode deixar conta órfã e autenticação de subconta é incerta

| Campo | Diagnóstico |
|---|---|
| Categoria | Integração/confiabilidade |
| Severidade e fundamento | **alta**. Contas duplicadas, credencial perdida ou cobrança fora/falha no contexto pretendido. |
| Grau de confirmação | Fato confirmado da ordem; contrato de subconta é risco a validar |
| Página/fluxo/operação | Onboarding Asaas |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-financial-service.ts:208](<../../../src/modules/workspaces/application/gym-financial-service.ts#L208>); [src/modules/payments/providers/asaas/asaas-adapter.ts:65](<../../../src/modules/payments/providers/asaas/asaas-adapter.ts#L65>) |
| Evidência concreta | Conta externa é criada antes de persistir/criptografar; erro de encriptação pode ser capturado sem impedir continuidade. Adapter no caminho gym usa master key/header asaas-account e não a apiKey salva da subconta. |
| Comportamento atual | Conta externa é criada antes de persistir/criptografar; erro de encriptação pode ser capturado sem impedir continuidade. Adapter no caminho gym usa master key/header asaas-account e não a apiKey salva da subconta. |
| Esperado e fundamento | Operação externa deve ser recuperável/idempotente; autenticação precisa cumprir contrato provider. Docs oficiais explicam autenticar subconta por sua apiKey. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Chave de encriptação inválida, falha local depois do create, retry onboarding ou gateway sem aceitar header. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Contas duplicadas, credencial perdida ou cobrança fora/falha no contexto pretendido. |
| Causa demonstrada/provável | Validação de config tardia e contrato provider presumido. |
| Correção recomendada | Validar configuração antes; registrar fases/reference e recuperar conta; autenticação sandbox comprovada com key correta. |
| Dependências/efeitos | PaymentProviderAccount, secrets/rotate e webhooks por subconta. |
| Validação da correção | Falha simulada após create é recuperada sem nova conta; requests sandbox comprovam tenant/env sem usar valores reais no relatório. |
| Esforço/incerteza | grande; API e configuração de deploy não foram testadas |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-029"></a>

## GYM-AUD-029 — Retry remove split e chamadas externas podem duplicar antes do registro local

| Campo | Diagnóstico |
|---|---|
| Categoria | Financeiro/integração |
| Severidade e fundamento | **alta**. Comissão prevista não recebida e cobranças duplicadas; ledger estimado diverge. |
| Grau de confirmação | Condição confirmada no código; falha Asaas não reproduzida |
| Página/fluxo/operação | createGymBilling / Asaas createCharge |
| Arquivos/funções/linhas | [src/modules/payments/providers/asaas/asaas-adapter.ts:35](<../../../src/modules/payments/providers/asaas/asaas-adapter.ts#L35>); [src/modules/workspaces/application/gym-financial-service.ts:517](<../../../src/modules/workspaces/application/gym-financial-service.ts#L517>) |
| Evidência concreta | Em erro contendo split o adapter tenta cobrança sem split. Local mantém estimativas de comissão. Cobrança externa antecede unique/idempotência local, sem lookup/claim suficiente antes do request. |
| Comportamento atual | Em erro contendo split o adapter tenta cobrança sem split. Local mantém estimativas de comissão. Cobrança externa antecede unique/idempotência local, sem lookup/claim suficiente antes do request. |
| Esperado e fundamento | Não alterar distribuição comercial silenciosamente; retry precisa identificar a mesma operação externa. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Provider recusa split ou resposta é perdida/falha a persistência; operador repete. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Comissão prevista não recebida e cobranças duplicadas; ledger estimado diverge. |
| Causa demonstrada/provável | Fallback muda semântica financeira e persistência é tardia. |
| Correção recomendada | Falhar explicitamente ou política de compensação aprovada; externalReference/idem e fases recuperáveis. |
| Dependências/efeitos | Wallet/fees/checkout/webhook. |
| Validação da correção | Erro split nunca retorna sucesso com fee fictícia; timeout+retry cria um único charge. |
| Esforço/incerteza | grande; idempotência provider precisa contrato verificado |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-030"></a>

## GYM-AUD-030 — Assinatura diverge da fatura inicial, carteira e cancelamento real

| Campo | Diagnóstico |
|---|---|
| Categoria | Recorrência financeira |
| Severidade e fundamento | **alta**. Saldo indevidamente quitado, receita ausente na carteira ou cobrança continua após cancelamento. |
| Grau de confirmação | Fato confirmado; gateway não testado |
| Página/fluxo/operação | setup/reconcile/cancel subscription |
| Arquivos/funções/linhas | [src/modules/workspaces/application/subscription-service.ts:113](<../../../src/modules/workspaces/application/subscription-service.ts#L113>); [src/modules/workspaces/application/subscription-service.ts:601](<../../../src/modules/workspaces/application/subscription-service.ts#L601>); [src/modules/workspaces/application/subscription-service.ts:512](<../../../src/modules/workspaces/application/subscription-service.ts#L512>) |
| Evidência concreta | Value externo é price, invoice inicial inclui enrollmentFee. Reconcile quita usando valor pago sem comparar total. Cancel externo falha e local fica CANCELLED. Ciclos pagos geram GymPayment mas não StudentBilling/ledger da wallet; setup pode criar outra assinatura antes de verificar primeira invoice. |
| Comportamento atual | Value externo é price, invoice inicial inclui enrollmentFee. Reconcile quita usando valor pago sem comparar total. Cancel externo falha e local fica CANCELLED. Ciclos pagos geram GymPayment mas não StudentBilling/ledger da wallet; setup pode criar outra assinatura antes de verificar primeira invoice. |
| Esperado e fundamento | Preço/taxa/pagamento/cancelamento devem convergir com obrigação e carteira; estados precisam indicar pendência externa. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Taxa de adesão positiva, subpagamento, timeout de cancel/setup ou ciclo externo confirmado. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Saldo indevidamente quitado, receita ausente na carteira ou cobrança continua após cancelamento. |
| Causa demonstrada/provável | Dois subsistemas financeiros e lifecycle externo não coordenados. |
| Correção recomendada | Relacionar ciclo/obrigação/ledger; conferir amount; cobrar taxa explicitamente; cancel pending e retry; setup idem. |
| Dependências/efeitos | Invoices, billing wallet, changeplan e cancelstudent. |
| Validação da correção | Sandbox com taxa, pagamento parcial, retry e falha cancel: ledger/total/estado coerentes e só uma subscription. |
| Esforço/incerteza | grande; unificação de fatos financeiros exige migração gradual |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-031"></a>

## GYM-AUD-031 — Webhook pode concluir evento falho e perder falha de transferência

| Campo | Diagnóstico |
|---|---|
| Categoria | Assíncrono financeiro |
| Severidade e fundamento | **alta**. Saques presos/sem compensação, pagamento perdido sem retry, baixa em obrigação indevida. |
| Grau de confirmação | Fato confirmado no código; concorrência é risco |
| Página/fluxo/operação | WebhookProcessor/handleSubscriptionWebhook |
| Arquivos/funções/linhas | [src/modules/payments/webhooks/webhook-processor.ts:134](<../../../src/modules/payments/webhooks/webhook-processor.ts#L134>); [src/modules/payments/webhooks/webhook-processor.ts:389](<../../../src/modules/payments/webhooks/webhook-processor.ts#L389>); [src/modules/workspaces/application/subscription-service.ts:744](<../../../src/modules/workspaces/application/subscription-service.ts#L744>) |
| Evidência concreta | Branch genérico TRANSFER_ intercepta FAILED/CANCELLED antes do branch de falha/compensação e pode marcar PROCESSING. Falha em handler subscription é capturada e outer pode marcar PROCESSED; recebimento retorna status processed/HTTP200. Unique event não é claim exclusivo; baixa legada usa primeiro member sem billing.workspaceId. |
| Comportamento atual | Branch genérico TRANSFER_ intercepta FAILED/CANCELLED antes do branch de falha/compensação e pode marcar PROCESSING. Falha em handler subscription é capturada e outer pode marcar PROCESSED; recebimento retorna status processed/HTTP200. Unique event não é claim exclusivo; baixa legada usa primeiro member sem billing.workspaceId. |
| Esperado e fundamento | Evento válido deve processar uma vez até convergir, ou ficar falho/retryable; transferência falha devolve fundos; obrigação baixada é a exata do tenant. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: TRANSFER_FAILED/CANCELLED, falha no handler gym ou entregas simultâneas; usuário com vários vínculos no legado. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Saques presos/sem compensação, pagamento perdido sem retry, baixa em obrigação indevida. |
| Causa demonstrada/provável | Ordem de branches, catch que suprime falha e fallback de identidade. |
| Correção recomendada | Máquina de eventos e claim/lease; branch específico primeiro; propagar estado falho; link exato billing/invoice/member. |
| Dependências/efeitos | Ledger, subscription, receipt/notifications e reprocessamento. |
| Validação da correção | Repetição/ordem invertida/falha parcial/concurrency: uma baixa correta, failed com retry, transferência compensada. |
| Esforço/incerteza | grande; recovery dos eventos existentes é pendência |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-032"></a>

## GYM-AUD-032 — Leitura de aulas permite alterar reservas e presença de terceiros

| Campo | Diagnóstico |
|---|---|
| Categoria | Autorização de recurso |
| Severidade e fundamento | **alta**. Cancelamento e presença falsos, ocupação de vaga/filas e alteração de outro aluno. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | book/cancel/attendance/revert/waitlist |
| Arquivos/funções/linhas | [src/app/api/gym/classes/bookings/[id]/attendance/route.ts:26](<../../../src/app/api/gym/classes/bookings/[id]/attendance/route.ts#L26>); [src/app/api/gym/classes/bookings/[id]/cancel/route.ts:26](<../../../src/app/api/gym/classes/bookings/[id]/cancel/route.ts#L26>); [src/app/api/gym/classes/sessions/[id]/book/route.ts:34](<../../../src/app/api/gym/classes/sessions/[id]/book/route.ts#L34>); [src/modules/workspaces/application/gym-booking-service.ts:98](<../../../src/modules/workspaces/application/gym-booking-service.ts#L98>) |
| Evidência concreta | Guards aceitam classes.read, disponível para STUDENT/ASSISTANT/TRAINER. Serviço valida tenant, mas IDs de booking/student não são ligados ao ator nem à finalidade de atendimento. |
| Comportamento atual | Guards aceitam classes.read, disponível para STUDENT/ASSISTANT/TRAINER. Serviço valida tenant, mas IDs de booking/student não são ligados ao ator nem à finalidade de atendimento. |
| Esperado e fundamento | Aluno age na própria reserva; gestão/presença exige bookings.manage/classes.manage conforme ação. Matriz já separa leitura/gestão. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Aluno ou assistente manipula bookingId/studentMemberId do mesmo tenant. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Cancelamento e presença falsos, ocupação de vaga/filas e alteração de outro aluno. |
| Causa demonstrada/provável | Capability de leitura em mutação e ausência de object-level check. |
| Correção recomendada | Endpoints de autoatendimento usam member da sessão; endpoints gestão exigem alçada/atribuição e escopo. |
| Dependências/efeitos | Portal aluno/guardian e BookingService. |
| Validação da correção | Matriz positiva/negativa por ação; student nunca muda reserva alheia nem attendance administrativa. |
| Esforço/incerteza | médio; self check-in deve ter regra própria |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-033"></a>

## GYM-AUD-033 — Última vaga, reserva e fila não têm proteção concorrente efetiva

| Campo | Diagnóstico |
|---|---|
| Categoria | Concorrência |
| Severidade e fundamento | **alta**. Overbooking, duplicidade e contadores negativos; impacto condicionado à disputa real. |
| Grau de confirmação | Risco identificado; prechecks/schema confirmados, DB não testado |
| Página/fluxo/operação | Book/cancel/waitlist |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-booking-service.ts:98](<../../../src/modules/workspaces/application/gym-booking-service.ts#L98>); [src/modules/workspaces/application/gym-booking-service.ts:464](<../../../src/modules/workspaces/application/gym-booking-service.ts#L464>); [prisma/schema.prisma:3509](<../../../prisma/schema.prisma#L3509>); [prisma/schema.prisma:3540](<../../../prisma/schema.prisma#L3540>) |
| Evidência concreta | Capacidade e booking existente lidos antes de increment/claim; não localizado unique de reserva ativa/fila no schema/SQL, apesar de mocks simular P2002. Cancelamento repetido pode decrementar e promover mais de uma vez. |
| Comportamento atual | Capacidade e booking existente lidos antes de increment/claim; não localizado unique de reserva ativa/fila no schema/SQL, apesar de mocks simular P2002. Cancelamento repetido pode decrementar e promover mais de uma vez. |
| Esperado e fundamento | Uma vaga deve gerar um booking; contador/fila devem corresponder aos estados. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Duas conexões reservam última vaga ou cancelam o mesmo booking juntas. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Overbooking, duplicidade e contadores negativos; impacto condicionado à disputa real. |
| Causa demonstrada/provável | Transação sem invariant protegido e teste simula constraint inexistente. |
| Correção recomendada | Claim/CAS/locking e restrição de unique apropriada com histórico; cancel condicional; posição de fila consistente. |
| Dependências/efeitos | Migrations baseline e notifications. |
| Validação da correção | Teste DB concorrente com barreira e duas conexões; resultado/counters/fila invariantes, sem depender de mock P2002. |
| Esforço/incerteza | grande; constraint depende de modelo histórico |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-034"></a>

## GYM-AUD-034 — Grade ignora timezone e cancelamento de aula não resolve reservas

| Campo | Diagnóstico |
|---|---|
| Categoria | Aulas/regra |
| Severidade e fundamento | **média**. Sessão em horário errado e aluno mantém reserva sem aviso; vínculos incompatíveis. |
| Grau de confirmação | Fato confirmado; render/DB não testados |
| Página/fluxo/operação | GenerateSessions/cancelSession/updateSchedule |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-class-service.ts:859](<../../../src/modules/workspaces/application/gym-class-service.ts#L859>); [src/modules/workspaces/application/gym-class-service.ts:1180](<../../../src/modules/workspaces/application/gym-class-service.ts#L1180>); [src/modules/workspaces/application/gym-class-service.ts:693](<../../../src/modules/workspaces/application/gym-class-service.ts#L693>) |
| Evidência concreta | Geração usa UTC day/setUTCHours sem timezone GymUnit. Cancel session altera só status/audit; bookings/notify/counters permanecem. Atualização de agenda valida menos IDs que criação; instrutor pode ser qualquer active member. |
| Comportamento atual | Geração usa UTC day/setUTCHours sem timezone GymUnit. Cancel session altera só status/audit; bookings/notify/counters permanecem. Atualização de agenda valida menos IDs que criação; instrutor pode ser qualquer active member. |
| Esperado e fundamento | Horário configurado deve representar horário local; aula cancelada deve comunicar/encerrar reservas; instrutor autorizado daquela unidade. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Unidade São Paulo com aula 10h, cancel com alunos ou troca de instrutor/modality. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Sessão em horário errado e aluno mantém reserva sem aviso; vínculos incompatíveis. |
| Causa demonstrada/provável | Timezones e lifecycle da aula desacoplados de bookings. |
| Correção recomendada | Conversão local→UTC única; cancel via BookingService/notifications; validação simétrica e role instrutor. |
| Dependências/efeitos | Unit scope, assignment e cron geração. |
| Validação da correção | Aula 10h local mantém 10h no portal em timezone; cancel resolve reservas/fila; IDs inválidos recusados. |
| Esforço/incerteza | médio; DST e scheduler precisam cenário definido |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-035"></a>

## GYM-AUD-035 — Responsável precisa membership indevido e pode cancelar reserva de outro dependente

| Campo | Diagnóstico |
|---|---|
| Categoria | Portal responsável |
| Severidade e fundamento | **alta**. Fluxo legítimo bloqueado e possível cancelamento de terceiro no tenant. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | Guardian book/cancel |
| Arquivos/funções/linhas | [src/app/api/guardian/dependents/[id]/classes/book/route.ts:3](<../../../src/app/api/guardian/dependents/[id]/classes/book/route.ts#L3>); [src/app/api/guardian/dependents/[id]/classes/cancel/route.ts:15](<../../../src/app/api/guardian/dependents/[id]/classes/cancel/route.ts#L15>); [src/modules/workspaces/application/minor-service.ts:379](<../../../src/modules/workspaces/application/minor-service.ts#L379>) |
| Evidência concreta | Portal reconhece guardian por relation/CPF; book/cancel exige membership ativo. Cancel verifica dependente da rota, mas não que bookingId pertença a esse dependente. |
| Comportamento atual | Portal reconhece guardian por relation/CPF; book/cancel exige membership ativo. Cancel verifica dependente da rota, mas não que bookingId pertença a esse dependente. |
| Esperado e fundamento | Representação autorizada deve valer sem cargo staff/aluno adicional, e só agir na reserva do dependente reconhecido. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Guardian puro tenta reservar; guardian com membership e dependent válido informa booking de outro aluno. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Fluxo legítimo bloqueado e possível cancelamento de terceiro no tenant. |
| Causa demonstrada/provável | Membership de operador substitui papel de representante; vínculo da reserva não é cruzado. |
| Correção recomendada | Guard de guardian/dependent verificado; derivar studentMember e exigir booking desse aluno. |
| Dependências/efeitos | Minor, auth/session e GYM-AUD-032. |
| Validação da correção | Guardian sem membership reserva para dependente; não lê/muta terceiros; expiry/legalpermission aplicados. |
| Esforço/incerteza | médio; identidade por CPF exige verificação definida |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-036"></a>

## GYM-AUD-036 — Indicadores misturam bases e filtros e podem subestimar recebimento líquido

| Campo | Diagnóstico |
|---|---|
| Categoria | Relatórios |
| Severidade e fundamento | **média**. Decisão financeira/operacional baseada em indicadores incorretos. |
| Grau de confirmação | Fato confirmado na fórmula; números reais não medidos |
| Página/fluxo/operação | Analytics e superadmin métricas |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-analytics-service.ts:43](<../../../src/modules/workspaces/application/gym-analytics-service.ts#L43>); [src/modules/workspaces/application/gym-analytics-service.ts:124](<../../../src/modules/workspaces/application/gym-analytics-service.ts#L124>); [src/app/api/superadmin/workspaces/[id]/route.ts:67](<../../../src/app/api/superadmin/workspaces/[id]/route.ts#L67>) |
| Evidência concreta | Gross soma confirmados, depois subtrai reversed já excluídos: reversão é debitada duas vezes no net. Expenses usa valor nominal; filtros unit/assigned não abrangem todos conjuntos. Passagens incluem EXIT/negações; MRR superadmin usa legado/all-time. |
| Comportamento atual | Gross soma confirmados, depois subtrai reversed já excluídos: reversão é debitada duas vezes no net. Expenses usa valor nominal; filtros unit/assigned não abrangem todos conjuntos. Passagens incluem EXIT/negações; MRR superadmin usa legado/all-time. |
| Esperado e fundamento | Rótulo financeiro/treino/MRR precisa mesma definição e recorte em numerador/denominador. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Período com reversal/despesa parcial, unidade selecionada, tenant com pagamentos legados. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Decisão financeira/operacional baseada em indicadores incorretos. |
| Causa demonstrada/provável | Agregações independentes e rótulos sem definição financeira comum. |
| Correção recomendada | Definir fatos/competência/filtros; corrigir fórmulas e rotular aproximações; dados conhecidos de referência. |
| Dependências/efeitos | Wallet/invoice/payments/expenses/access e dashboard. |
| Validação da correção | Fixture com recebimento+reversal+parcial e duas unidades produz valores esperados conciliados ao ledger. |
| Esforço/incerteza | médio; definição MRR real precisa negócio |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-037"></a>

## GYM-AUD-037 — Conciliação e reprocessamento podem mascarar divergência sem reparar lançamentos

| Campo | Diagnóstico |
|---|---|
| Categoria | Financeiro/recuperação |
| Severidade e fundamento | **alta**. Relatório diz resolvido enquanto dinheiro/ledger/balance permanece incorreto. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | runReconciliation/reprocessDivergence/refund |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:412](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L412>); [src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:663](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L663>); [src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:739](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L739>) |
| Evidência concreta | GET persiste divergências, mas comparação é local e não consulta estado atual provider. Reprocess marca invoice PAID sem Payment/Allocation/ledger; outros casos só RESOLVED. Partial refund usa base total/limita repetição e externa primeiro. |
| Comportamento atual | GET persiste divergências, mas comparação é local e não consulta estado atual provider. Reprocess marca invoice PAID sem Payment/Allocation/ledger; outros casos só RESOLVED. Partial refund usa base total/limita repetição e externa primeiro. |
| Esperado e fundamento | Recuperação deve recompor invariantes, comprovando divergência externa/local e registrar compensação exata. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador reprocessa pagamento não baixado ou pede partial refund. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Relatório diz resolvido enquanto dinheiro/ledger/balance permanece incorreto. |
| Causa demonstrada/provável | Reprocessamento trata status como substituto de fatos contábeis. |
| Correção recomendada | Mesma rotina idempotente de settlement/refund; trazer provider state; evidência/residual e retry externos. |
| Dependências/efeitos | Invoice/Wallet/Provider e runbook. |
| Validação da correção | Falha webhook→reprocess gera um Payment/Allocation/ledger certo; refunds parciais sucessivos somam sem extrapolar; no zero falso. |
| Esforço/incerteza | grande; API externa/histórico precisam sandbox e decisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-038"></a>

## GYM-AUD-038 — Políticas de acesso divergem do contrato, vigência e contexto

| Campo | Diagnóstico |
|---|---|
| Categoria | Acesso/regra |
| Severidade e fundamento | **alta**. Direito físico indevido ou bloqueio de saída/entrada; alcance depende do agente efetivo. |
| Grau de confirmação | Fato confirmado no código; abertura física não testada |
| Página/fluxo/operação | evaluateAccess/check-access/projectGrants |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-access-policy-service.ts:155](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L155>); [src/modules/workspaces/application/enrollment-service.ts:954](<../../../src/modules/workspaces/application/enrollment-service.ts#L954>); [src/app/api/gym/access/evaluate/route.ts:8](<../../../src/app/api/gym/access/evaluate/route.ts#L8>) |
| Evidência concreta | Avaliação não aplica todas as condições de workspace/unit active, start/end, accessGranted/contract/minor. Seleção de uma matrícula ACTIVE ignora resolução de múltiplas. Timestamp vem do cliente; direction EXIT não é passado pelo handler. |
| Comportamento atual | Avaliação não aplica todas as condições de workspace/unit active, start/end, accessGranted/contract/minor. Seleção de uma matrícula ACTIVE ignora resolução de múltiplas. Timestamp vem do cliente; direction EXIT não é passado pelo handler. |
| Esperado e fundamento | Contrato do serviço diz acesso após aceite/pagamento; vigência/tenant/EXIT devem ser consistentemente decididos no servidor. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Enrollment expirado ainda ACTIVE, futurestart, sem aceite; timestamp manipulado; tentativa EXIT via API. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Direito físico indevido ou bloqueio de saída/entrada; alcance depende do agente efetivo. |
| Causa demonstrada/provável | Três políticas/projeções paralelas e inputs confiados. |
| Correção recomendada | Uma decisão canônica com server time e context; exceções auditadas; encaminhar direction com política EXIT explícita. |
| Dependências/efeitos | Booking/cache/entitlement/suspensão e agente. |
| Validação da correção | Mesmas fixtures de datas/finance/minor em evaluate/check/cache; EXIT separado; provider/device simulado confirma comando correto. |
| Esforço/incerteza | grande; exceções operacionais precisam decisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-039"></a>

## GYM-AUD-039 — Comando de dispositivo pode atravessar tenant e fila perde recuperação de SENT

| Campo | Diagnóstico |
|---|---|
| Categoria | Hardware/isolamento |
| Severidade e fundamento | **alta**. Controle físico cruzado possível, comando duplicado/perdido e ressincronização incompleta. |
| Grau de confirmação | Fato confirmado da falta de cruzamento; concorrência/efeito físico não testados |
| Página/fluxo/operação | evaluate→queue / pull / replay / replace |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-access-policy-service.ts:35](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L35>); [src/modules/workspaces/application/gym-device-service.ts:395](<../../../src/modules/workspaces/application/gym-device-service.ts#L395>); [src/modules/workspaces/application/gym-recovery-service.ts:58](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L58>); [src/modules/workspaces/application/gym-recovery-service.ts:211](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L211>) |
| Evidência concreta | Evaluate usa deviceId cliente sem provar tenant e cria command com ws independente. Pull lê PENDING e atualiza SENT sem claim exclusivo; SENT sem ACK não tem retry/expiry equivalente. Replay TTL1h pode repetir RELEASE depois da janela original. Replace manda SYNC_USER com reason, não full dataset. |
| Comportamento atual | Evaluate usa deviceId cliente sem provar tenant e cria command com ws independente. Pull lê PENDING e atualiza SENT sem claim exclusivo; SENT sem ACK não tem retry/expiry equivalente. Replay TTL1h pode repetir RELEASE depois da janela original. Replace manda SYNC_USER com reason, não full dataset. |
| Esperado e fundamento | Comando pertence ao tenant/dispositivo certo; release expira curto e não deve ser repetido tardio; delivery precisa lease/ACK/recovery. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: ID dispositivo estrangeiro, dois pulls, queda após entrega ou replay de liberação. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Controle físico cruzado possível, comando duplicado/perdido e ressincronização incompleta. |
| Causa demonstrada/provável | FKs independentes e fila sem protocolo de claim/capacidade expirada. |
| Correção recomendada | Tenant-check do device; lease/claim/ACK idem; TTL por tipo; replace re-sync payload definido com agente. |
| Dependências/efeitos | Device/Access/Recovery/driver e GYM-AUD-011. |
| Validação da correção | IDs cross negados; pulls concorrentes só entregam uma vez sob política; timeout recupera sem late-open; replace converge grants. |
| Esforço/incerteza | grande; contrato agente real ausente |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-040"></a>

## GYM-AUD-040 — Eventos e cache offline não garantem pertença e convergência

| Campo | Diagnóstico |
|---|---|
| Categoria | Hardware/offline |
| Severidade e fundamento | **alta**. Logs contaminados, perda de reconciliação e direito offline obsoleto; extensão real depende cliente. |
| Grau de confirmação | Fato confirmado; impacto depende de agente/token |
| Página/fluxo/operação | passage/sync-offline/cache |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-device-service.ts:530](<../../../src/modules/workspaces/application/gym-device-service.ts#L530>); [src/modules/workspaces/application/gym-offline-reconciliation-service.ts:107](<../../../src/modules/workspaces/application/gym-offline-reconciliation-service.ts#L107>) |
| Evidência concreta | StudentMemberId recebido não é cruzado com tenant do device em todos registros. Idem key cliente é global; log→divergência são etapas não atômicas. Cache ACTIVE/validUntil omite isActive/validFrom e condições financeiras; assinatura tem fallback. |
| Comportamento atual | StudentMemberId recebido não é cruzado com tenant do device em todos registros. Idem key cliente é global; log→divergência são etapas não atômicas. Cache ACTIVE/validUntil omite isActive/validFrom e condições financeiras; assinatura tem fallback. |
| Esperado e fundamento | Token do device só autoriza eventos próprios e cache coerente com decisão; retry não pode pular divergência perdida. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Agente/token válido envia member estrangeiro; falha entre log/divergence; usuário suspenso após cache. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Logs contaminados, perda de reconciliação e direito offline obsoleto; extensão real depende cliente. |
| Causa demonstrada/provável | Evento raw confiado e projeção incompleta sem entrega atômica. |
| Correção recomendada | Validar identidade/tempo/device, escopar idem, log+divergence tx/outbox; cache derivado da regra canônica e assinatura obrigatória. |
| Dependências/efeitos | Suspensão/policy, agent, monitoramento. |
| Validação da correção | Retry/falha entre fases não perde divergence; membro foreign rejeitado; offline revoga conforme TTL/política aprovada. |
| Esforço/incerteza | grande; tolerância offline é produto e segurança |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-041"></a>

## GYM-AUD-041 — Biometria facial/digital vira QR e purga é declarada antes do ACK

| Campo | Diagnóstico |
|---|---|
| Categoria | Biometria/clareza |
| Severidade e fundamento | **alta**. Identificação incompatível, acesso sem direito e garantia de eliminação não comprovada. |
| Grau de confirmação | Fato confirmado no código; equipamento não executado |
| Página/fluxo/operação | enroll/revoke biometric |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-biometrics-service.ts:94](<../../../src/modules/workspaces/application/gym-biometrics-service.ts#L94>); [src/modules/workspaces/application/control-id-adapter.ts:49](<../../../src/modules/workspaces/application/control-id-adapter.ts#L49>) |
| Evidência concreta | Tipos FACIAL/BIOMETRIC mapeiam para QR_CODE/payload de credencial string; serviço pode ativar grant sem matrícula válida. Consentimento usa checkbox/guardian verificado sem evidência assinada; revogar null QR e mensagem presume fallback/purga antes ACK. |
| Comportamento atual | Tipos FACIAL/BIOMETRIC mapeiam para QR_CODE/payload de credencial string; serviço pode ativar grant sem matrícula válida. Consentimento usa checkbox/guardian verificado sem evidência assinada; revogar null QR e mensagem presume fallback/purga antes ACK. |
| Esperado e fundamento | Modalidades anunciadas precisam driver e prova de consentimento; purga/fallback só concluídos após estado observável do equipamento. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador seleciona face/digital ou revoke e aceita mensagem de conclusão. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Identificação incompatível, acesso sem direito e garantia de eliminação não comprovada. |
| Causa demonstrada/provável | Nome de recurso/estado UI excede adapter e protocolo implementados. |
| Correção recomendada | Suportar só modalidade efetiva ou implementar enrollment device real; consent artifact e fases queued/acked; QR fallback real. |
| Dependências/efeitos | Driver/grants/minor/privacy/offline. |
| Validação da correção | Device sandbox/equipamento: face/digital real ou indisponível; revoke retorna pendente até ACK e credencial antiga rejeitada. |
| Esforço/incerteza | grande; protocolo/hardware e requisitos de consentimento incertos |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-042"></a>

## GYM-AUD-042 — Licença/defaults/quotas não são aplicados de forma atômica ou completa

| Campo | Diagnóstico |
|---|---|
| Categoria | Entitlements |
| Severidade e fundamento | **alta**. Uso além de licença, plano exibido incoerente e bloqueio comercial inexato. |
| Grau de confirmação | Fato confirmado; disputa é risco |
| Página/fluxo/operação | WorkspaceSubscription e quotas |
| Arquivos/funções/linhas | [src/modules/workspaces/application/entitlements-service.ts:39](<../../../src/modules/workspaces/application/entitlements-service.ts#L39>); [src/modules/workspaces/application/entitlements-service.ts:25](<../../../src/modules/workspaces/application/entitlements-service.ts#L25>); [src/modules/workspaces/application/gym-feature-flags-service.ts:20](<../../../src/modules/workspaces/application/gym-feature-flags-service.ts#L20>) |
| Evidência concreta | Trial criado na leitura com 30 dias/limites hardcoded, ignora defaults globais; TRIAL não verifica trialEndsAt/endDate. Limit0 usa fallback; device usage0. Quotas pré-create/convite fora tx; accept/import/provisionamento não revalidam todos limites. |
| Comportamento atual | Trial criado na leitura com 30 dias/limites hardcoded, ignora defaults globais; TRIAL não verifica trialEndsAt/endDate. Limit0 usa fallback; device usage0. Quotas pré-create/convite fora tx; accept/import/provisionamento não revalidam todos limites. |
| Esperado e fundamento | Licença e defaults apresentados devem refletir uso e término; zero precisa semântica definida, criação deve respeitar quota real. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Trial expirado, device quota, limites reduzidos ou duas inclusões simultâneas; import grande. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Uso além de licença, plano exibido incoerente e bloqueio comercial inexato. |
| Causa demonstrada/provável | Entitlements de leitura separados de enforcement e várias entradas de criação. |
| Correção recomendada | Fonte única de defaults/license; comando de provisioning explícito; quota atômica e downgrade policy sem apagar dados. |
| Dependências/efeitos | Superadmin/UI/import/staff/device/storage. |
| Validação da correção | Trial expirado e limite0/downgrade testados; todas entradas sob quota; devices count real; simultâneos não extrapolam. |
| Esforço/incerteza | grande; política PAST_DUE/zero/downgrade precisa decisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-043"></a>

## GYM-AUD-043 — Cron legado é fail-open e pode emitir recibo ao criar dívida

| Campo | Diagnóstico |
|---|---|
| Categoria | Cron/financeiro |
| Severidade e fundamento | **alta**. Processamento não autorizado, comunicação financeira falsa e expiração que falha/ não roda. |
| Grau de confirmação | Fato confirmado; job real não executado |
| Página/fluxo/operação | process-recurrence / enrollment cron-expire |
| Arquivos/funções/linhas | [src/app/api/cron/process-recurrence/route.ts:8](<../../../src/app/api/cron/process-recurrence/route.ts#L8>); [src/lib/recurrence.ts:215](<../../../src/lib/recurrence.ts#L215>); [src/modules/workspaces/application/enrollment-service.ts:1395](<../../../src/modules/workspaces/application/enrollment-service.ts#L1395>) |
| Evidência concreta | Recurrence GET só exige auth se secret existe; percorre membros sem filtro GYM e cria WorkspacePayment legado. AUTOMATIC pendente ainda dispara recibo de pagamento. ExpireEnrollment audit usa SYSTEM_CRON como User FK; autoRenew pula expiry e scheduler não comprovado. |
| Comportamento atual | Recurrence GET só exige auth se secret existe; percorre membros sem filtro GYM e cria WorkspacePayment legado. AUTOMATIC pendente ainda dispara recibo de pagamento. ExpireEnrollment audit usa SYSTEM_CRON como User FK; autoRenew pula expiry e scheduler não comprovado. |
| Esperado e fundamento | Cron financeiro deve negar sem config obrigatória; recibo significa pagamento; job precisa identidade auditável e agenda efetiva. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Deploy sem secret, request externa, GYM com legacybilling ou job sem User SYSTEM_CRON. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Processamento não autorizado, comunicação financeira falsa e expiração que falha/ não roda. |
| Causa demonstrada/provável | Rotina pessoal reutilizada sem fronteira e config fail-open. |
| Correção recomendada | Fail-closed/config validation, separar emissão de obrigação/recebimento, excluir ou migrar GYM, ator de sistema compatível e scheduler documentado. |
| Dependências/efeitos | Email/WorkspacePayment/Subscription/AuditLog. |
| Validação da correção | Sem secret 401/503 e zero writes; gerar dívida não envia recibo; job fixture expira corretamente uma vez. |
| Esforço/incerteza | médio a grande; job externo não inspecionado |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-044"></a>

## GYM-AUD-044 — Canal de comunicação solicitado não é enviado e efeitos pós-transação podem se perder

| Campo | Diagnóstico |
|---|---|
| Categoria | Comunicação/confiabilidade |
| Severidade e fundamento | **média**. Comunicação não chega pelo canal esperado; UI/receptores desatualizados sem recovery. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | Targeted notification e efeitos compartilhados |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-communication-service.ts:56](<../../../src/modules/workspaces/application/gym-communication-service.ts#L56>); [src/modules/payments/webhooks/webhook-processor.ts:15](<../../../src/modules/payments/webhooks/webhook-processor.ts#L15>); [src/modules/workspaces/application/cash-drawer-expense-service.ts:10](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L10>) |
| Evidência concreta | channel EMAIL/PUSH/ALL é aceito mas targeted só createMany Notification; links student/classes/access não localizados. Publishes/e-mails depois tx/catch/fire-forget não têm outbox para recuperar entrega perdida. |
| Comportamento atual | channel EMAIL/PUSH/ALL é aceito mas targeted só createMany Notification; links student/classes/access não localizados. Publishes/e-mails depois tx/catch/fire-forget não têm outbox para recuperar entrega perdida. |
| Esperado e fundamento | Ação de enviar pelo canal deve entregar ou declarar pendente/falha; operação financeira confirmada não deve perder recibo silenciosamente. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador seleciona EMAIL/ALL; Resend/Ably indisponível após commit. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Comunicação não chega pelo canal esperado; UI/receptores desatualizados sem recovery. |
| Causa demonstrada/provável | Persistência de notificação confundida com delivery e efeitos acoplados sem fila. |
| Correção recomendada | Canais efetivos, rotas reais e outbox/delivery status com retry idem; não duplicar operação principal. |
| Dependências/efeitos | Resend/FCM/Ably/notifications e UI. |
| Validação da correção | Serviços stub falham e recuperam: uma mensagem por canal, erro/pending explícito e link válido. |
| Esforço/incerteza | médio; infraestrutura de delivery pode crescer |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-045"></a>

## GYM-AUD-045 — Rotas de tarefa redirecionam e acessos chama endpoint ausente

| Campo | Diagnóstico |
|---|---|
| Categoria | Integração frontend/backend |
| Severidade e fundamento | **média**. Tarefa indisponível, feed vazio/erro silencioso, 404 e confirmação física enganosa. |
| Grau de confirmação | Fato confirmado por código/busca; HTTP não executado |
| Página/fluxo/operação | classes/crm/workouts/access/reception |
| Arquivos/funções/linhas | [src/app/(gym)/gym/classes/page.tsx:1](<../../../src/app/(gym)/gym/classes/page.tsx#L1>); [src/app/(gym)/gym/crm/page.tsx:1](<../../../src/app/(gym)/gym/crm/page.tsx#L1>); [src/app/(gym)/gym/workouts/page.tsx:1](<../../../src/app/(gym)/gym/workouts/page.tsx#L1>); [src/app/(gym)/gym/access/access-client.tsx:165](<../../../src/app/(gym)/gym/access/access-client.tsx#L165>); [src/app/api/gym/reception/feed/route.ts:12](<../../../src/app/api/gym/reception/feed/route.ts#L12>) |
| Evidência concreta | Três wrappers redirecionam dashboard apesar de clientes completos/APIs. Access solicita feed sem unitId obrigatório e POST checkin não localizado. Reception evaluate sem deviceId mostra liberação apesar de só decisão local. |
| Comportamento atual | Três wrappers redirecionam dashboard apesar de clientes completos/APIs. Access solicita feed sem unitId obrigatório e POST checkin não localizado. Reception evaluate sem deviceId mostra liberação apesar de só decisão local. |
| Esperado e fundamento | Função navegável deve ter destino operacional e contrato existente; física requer comando/ACK. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Abrir menu classes/CRM/workouts; atualizar access; usar check-in rápido. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Tarefa indisponível, feed vazio/erro silencioso, 404 e confirmação física enganosa. |
| Causa demonstrada/provável | Rotas simplificadas não integraram clientes; endpoints evoluíram separadamente. |
| Correção recomendada | Decidir destino/integração real por tarefa; corrigir contratos e feedback staged antes de ativar clientes. |
| Dependências/efeitos | Permissões de aulas/access/CRM e hardware. |
| Validação da correção | Smoke browser de cada menu; feed correto, mutation endpoint real e queued/ACK visíveis. |
| Esforço/incerteza | médio; não ativar cliente antes de segurança |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-046"></a>

## GYM-AUD-046 — Histórico de migrations não reconstrói o schema do checkout

| Campo | Diagnóstico |
|---|---|
| Categoria | Banco/reprodutibilidade |
| Severidade e fundamento | **alta**. Ambiente não reproduzível e risco de deploy/migration incorreta. Não prova corrupção/ausência em produção. |
| Grau de confirmação | Fato confirmado na cadeia SQL; migrations não aplicadas |
| Página/fluxo/operação | Setup/deploy DB |
| Arquivos/funções/linhas | [prisma/migrations/20260514191258_init_atlasfit_schema/migration.sql:2](<../../../prisma/migrations/20260514191258_init_atlasfit_schema/migration.sql#L2>); [prisma/schema.prisma:1764](<../../../prisma/schema.prisma#L1764>) |
| Evidência concreta | Dicionário lista tabelas alteradas/referenciadas sem CREATE em nenhuma migration. Baseline só cobre parte do modelo; evoluções User/Subscription/roles e tabelas anteriores ao gym ausentes. |
| Comportamento atual | Dicionário lista tabelas alteradas/referenciadas sem CREATE em nenhuma migration. Baseline só cobre parte do modelo; evoluções User/Subscription/roles e tabelas anteriores ao gym ausentes. |
| Esperado e fundamento | Checkout deve declarar baseline/evolução aplicável; diagnóstico anterior já documenta essa lacuna. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Banco limpo aplica toda cadeia; deploy depende de estado manual externo. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Ambiente não reproduzível e risco de deploy/migration incorreta. Não prova corrupção/ausência em produção. |
| Causa demonstrada/provável | Histórico incompleto ou alterações feitas fora de migrations; causa histórica não confirmada. |
| Correção recomendada | Inventariar estado real e baseline externo, reconciliar em DB descartável; só então planejar migrations compatíveis. |
| Dependências/efeitos | Todas verificações DB e constraints de tenant/concurrency. |
| Validação da correção | Banco vazio com baseline aprovado atinge schema esperado; comparação drift e upgrade de snapshot sintético. |
| Esforço/incerteza | grande; origem do baseline exige confirmação |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-047"></a>

## GYM-AUD-047 — Uploads e arquivos reutilizam alçadas/cotas pessoais e deixam lacunas de escopo

| Campo | Diagnóstico |
|---|---|
| Categoria | Arquivos/segurança |
| Severidade e fundamento | **alta**. Objeto público indevido, saúde/arquivo fora do escopo e custo/quota não representativos. |
| Grau de confirmação | Fato confirmado de controles; abuso de objeto não executado |
| Página/fluxo/operação | Storage presigned/file |
| Arquivos/funções/linhas | [src/app/api/storage/presigned/route.ts:58](<../../../src/app/api/storage/presigned/route.ts#L58>); [src/app/api/storage/file/route.ts:19](<../../../src/app/api/storage/file/route.ts#L19>); [src/lib/storage-quota.service.ts:237](<../../../src/lib/storage-quota.service.ts#L237>) |
| Evidência concreta | campaign_banner não passa mesma exigência SUPERADMIN de campaign nem quota/workspace. Presigned confia size, sem conferir objeto final. Health/progress usam papéis legados sem assignment; quota é Subscription do dono pessoal, não WorkspaceSubscription; chat file acessível por membro sem participant-check em caminho examinado. |
| Comportamento atual | campaign_banner não passa mesma exigência SUPERADMIN de campaign nem quota/workspace. Presigned confia size, sem conferir objeto final. Health/progress usam papéis legados sem assignment; quota é Subscription do dono pessoal, não WorkspaceSubscription; chat file acessível por membro sem participant-check em caminho examinado. |
| Esperado e fundamento | Upload/GET precisa finalidade, pertencimento e quota do domínio; metadado cliente não prova tamanho/tipo final. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Login comum upload banner; trainer consulta aluno não atribuído; membro tenta arquivo de conversa alheia. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Objeto público indevido, saúde/arquivo fora do escopo e custo/quota não representativos. |
| Causa demonstrada/provável | Endpoint multiuso com autorizações divergentes e quotas de outro produto. |
| Correção recomendada | Contrato por target, guardian/assignment/conversation scope, HEAD/size+type e quota gym; ACL pública explícita. |
| Dependências/efeitos | R2/S3, File/progress/chat e privacidade. |
| Validação da correção | Targets por perfil testados; size falsificado rejeitado após upload; arquivo alheio 403; quotas correspondem à licença. |
| Esforço/incerteza | grande; ACL de produção não inspecionada |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-048"></a>

## GYM-AUD-048 — Workspace ativo diverge entre cookie e store; redirecionamentos quebram jornadas

| Campo | Diagnóstico |
|---|---|
| Categoria | Contexto/UX |
| Severidade e fundamento | **média**. Operador acredita estar em outra academia e executa no contexto anterior, ou encontra rota de auth ausente. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | Switcher/layouts/auth |
| Arquivos/funções/linhas | [src/components/application/workspace-switcher.tsx:127](<../../../src/components/application/workspace-switcher.tsx#L127>); [src/components/application/actions.ts:6](<../../../src/components/application/actions.ts#L6>); [src/modules/workspaces/application/actions.ts:12](<../../../src/modules/workspaces/application/actions.ts#L12>); [src/auth.config.ts:25](<../../../src/auth.config.ts#L25>) |
| Evidência concreta | Switcher só altera store/localStorage, não cookie/server refresh. Lista só OWNER/TRAINER/ASSISTANT e plan pessoal. GymLayout não inicializa store da mesma forma. Auth redireciona superadmin para /auth/superadmin, não localizada (real /auth/admin); guardian usa /auth/login ausente. O botão de pedido de upgrade apenas mostra toast de solicitação enviada, sem action/API de solicitação nesse handler. |
| Comportamento atual | Switcher só altera store/localStorage, não cookie/server refresh. Lista só OWNER/TRAINER/ASSISTANT e plan pessoal. GymLayout não inicializa store da mesma forma. Auth redireciona superadmin para /auth/superadmin, não localizada (real /auth/admin); guardian usa /auth/login ausente. O botão de pedido de upgrade apenas mostra toast de solicitação enviada, sem action/API de solicitação nesse handler. |
| Esperado e fundamento | Seleção visível precisa ser mesmo tenant da sessão de requests; login deve levar a rota existente. Mensagem de solicitação enviada deve corresponder a registro/entrega real ou indicar função indisponível. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Membro multi-workspace troca pelo header; gerente tenta switch; sessão expirada no superadmin/guardian. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Operador acredita estar em outra academia e executa no contexto anterior, ou encontra rota de auth ausente. |
| Causa demonstrada/provável | Switcher pessoal reaproveitado sem action segura/contexto único. |
| Correção recomendada | Uma action validada para seleção+cookie+store+refresh e opções por roles reais; redirects canônicos. Conectar o upgrade a fluxo definido ou apresentar indisponibilidade; um novo workflow de pedido é evolução, não requisito presumido. |
| Dependências/efeitos | Layout/navbar/select/defaultRoute e APIs que recebem workspaceId. |
| Validação da correção | Duas academias: header, page e requests convergem; gerente/financeiro navegam; cada redirect resolve. |
| Esforço/incerteza | médio; consumidores antigos do store precisam revisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-049"></a>

## GYM-AUD-049 — Token Ably não restringe capacidade aos canais do usuário

| Campo | Diagnóstico |
|---|---|
| Categoria | Realtime/segurança |
| Severidade e fundamento | **alta**. Leitura/publicação cruzada plausível; não confirmado na produção. |
| Grau de confirmação | Risco identificado condicionado à chave implantada |
| Página/fluxo/operação | GET ably/token |
| Arquivos/funções/linhas | [src/app/api/ably/token/route.ts:20](<../../../src/app/api/ably/token/route.ts#L20>) |
| Evidência concreta | Token autenticado usa clientId sem capability. Ably documenta que token sem capability herda key capabilities; não se inspecionou a chave real. |
| Comportamento atual | Token autenticado usa clientId sem capability. Ably documenta que token sem capability herda key capabilities; não se inspecionou a chave real. |
| Esperado e fundamento | Credencial de browser só deve permitir canais/actions dos vínculos legítimos, mesmo com chave de servidor ampla. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Chave server permite wildcard ou publish/subscribe cross-workspace; ator pede token e manipula canal. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Leitura/publicação cruzada plausível; não confirmado na produção. |
| Causa demonstrada/provável | Identidade de cliente usada como substituto de ACL. |
| Correção recomendada | Gerar capabilities de membership ativo/participant, mínimo publish/subscribe; refresh/revocation conforme lifecycle. |
| Dependências/efeitos | Ably config/server publish/chat/finance. |
| Validação da correção | Chave sandbox ampla e dois tenants: browser só acessa canais próprios e não publica eventos financeiros. |
| Esforço/incerteza | médio; key scope externo precisa confirmar |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-050"></a>

## GYM-AUD-050 — Testes mockados e backlog concluído não demonstram homologação

| Campo | Diagnóstico |
|---|---|
| Categoria | Qualidade/documentação |
| Severidade e fundamento | **média**. Problemas de contrato/concurrency/driver chegam à operação sem detecção. |
| Grau de confirmação | Problema reproduzido da suíte; lacuna de integração confirmada |
| Página/fluxo/operação | GYM-080/021/backlog/pilot |
| Arquivos/funções/linhas | [src/modules/workspaces/__tests__/gym-021.test.ts:109](<../../../src/modules/workspaces/__tests__/gym-021.test.ts#L109>); [src/modules/workspaces/__tests__/gym-080.test.ts:4](<../../../src/modules/workspaces/__tests__/gym-080.test.ts#L4>); [docs/gym/backlog.md:754](<../../../docs/gym/backlog.md#L754>) |
| Evidência concreta | Suite: 420/421, flag esperada true retorna false. Testes de jornada mockam prisma/auth/provider; constraints/transactions simuladas não provam schema. Backlog marca fluxos/homologação concluídos sem evidência real correspondente. |
| Comportamento atual | Suite: 420/421, flag esperada true retorna false. Testes de jornada mockam prisma/auth/provider; constraints/transactions simuladas não provam schema. Backlog marca fluxos/homologação concluídos sem evidência real correspondente. |
| Esperado e fundamento | Status de entrega distingue código, testes isolados, integração e homologação; documentação deve representar evidência atual. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Usar sinal CONCLUÍDO/testes como critério para operar pagamento/equipamento. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Problemas de contrato/concurrency/driver chegam à operação sem detecção. |
| Causa demonstrada/provável | Métricas de teste e nomes de suíte confundidos com ponta a ponta. |
| Correção recomendada | Reclassificar evidências, corrigir fixture da flag conforme contrato e adicionar homologação real em ambiente isolado para invariantes prioritários. |
| Dependências/efeitos | Baseline DB, sandbox provider e agent/browser. |
| Validação da correção | Matriz de cobertura por flow e evidências executáveis HTTP/DB/browser; suite verde sem mascarar mudanças de requisito. |
| Esforço/incerteza | médio a grande; infraestrutura externa precisa preparação |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-051"></a>

## GYM-AUD-051 — Página global tem excesso de texto e feedback que confunde rascunho com estado real

| Campo | Diagnóstico |
|---|---|
| Categoria | UX/UI |
| Severidade e fundamento | **baixa**. Mais esforço para achar controle e pouca confiança no estado; impacto de enforcement tratado separadamente em015. |
| Grau de confirmação | Fato confirmado no código; avaliação visual não realizada |
| Página/fluxo/operação | Superadmin gym-settings |
| Arquivos/funções/linhas | [src/app/(superadmin)/superadmin/gym-settings/page.tsx:59](<../../../src/app/(superadmin)/superadmin/gym-settings/page.tsx#L59>); [src/components/application/gym-page.tsx:7](<../../../src/components/application/gym-page.tsx#L7>) |
| Evidência concreta | Cinco seções customizadas longas, gaps/ícones/badges/descrições e texto10px; labels/switches sem associação uniforme. GET erro mantém skeleton. Toast/draft/badge presume estado antes save; fabricante anunciado sem driver. |
| Comportamento atual | Cinco seções customizadas longas, gaps/ícones/badges/descrições e texto10px; labels/switches sem associação uniforme. GET erro mantém skeleton. Toast/draft/badge presume estado antes save; fabricante anunciado sem driver. |
| Esperado e fundamento | Direção solicitada: mínima, moderna e consistente. Informação essencial/consequências permanecem; aplicado e pending são distintos. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Editar/desligar; GET falha; leitura em mobile/teclado. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Mais esforço para achar controle e pouca confiança no estado; impacto de enforcement tratado separadamente em015. |
| Causa demonstrada/provável | Apresentação mistura ajuda técnica, controles e garantias. |
| Correção recomendada | Proposta seção13: tabs/rows compactas, ajuda secundária, applied/pending, erro retry e componentes compartilhados. |
| Dependências/efeitos | Contratos/flags reais antes da UI; acessibilidade. |
| Validação da correção | Desktop/mobile 360–1280px, keyboard/foco/labels; localizar tarefa e recuperar erro sem skeleton permanente. |
| Esforço/incerteza | médio; visual/contraste requer navegador |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-052"></a>

## GYM-AUD-052 — Consultas crescem sem limite e métricas carregam dados além da tarefa

| Campo | Diagnóstico |
|---|---|
| Categoria | Desempenho |
| Severidade e fundamento | **média**. Payload/tempo/memória crescentes e degradação plausível; não há p95 real. |
| Grau de confirmação | Risco identificado; custo/latência não medidos |
| Página/fluxo/operação | Reception/Analytics/Wallet/CRM/Superadmin/Quota |
| Arquivos/funções/linhas | [src/app/(gym)/gym/reception/page.tsx:30](<../../../src/app/(gym)/gym/reception/page.tsx#L30>); [src/modules/workspaces/application/gym-analytics-service.ts:124](<../../../src/modules/workspaces/application/gym-analytics-service.ts#L124>); [src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:122](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L122>); [src/lib/storage-quota.service.ts:196](<../../../src/lib/storage-quota.service.ts#L196>) |
| Evidência concreta | Recepção lê todos alunos; analytics e wallet/reconciliation materializam muitas linhas; quota faz queries por workspace/usuário; superadmin listas/agregações amplas. Finance page carrega várias tabs/dados de pagador na render inicial. |
| Comportamento atual | Recepção lê todos alunos; analytics e wallet/reconciliation materializam muitas linhas; quota faz queries por workspace/usuário; superadmin listas/agregações amplas. Finance page carrega várias tabs/dados de pagador na render inicial. |
| Esperado e fundamento | Operação deve manter desempenho previsível no volume pretendido; aplicar paginação/projeção/agregação com medidas. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Base com muitos alunos, pagamentos e logs; vários usuários atualizam simultaneamente. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Payload/tempo/memória crescentes e degradação plausível; não há p95 real. |
| Causa demonstrada/provável | Leitura completa e agregação em memória, sem lazyload por tarefa. |
| Correção recomendada | Medir payload/plano/p95, paginar/buscar server-side, aggregate/índices pertinentes; cache só após política de invalidação. |
| Dependências/efeitos | DB schema/index e filtros/permissões. |
| Validação da correção | Fixture volumosa com EXPLAIN e métricas; p95/meta acordada, payload limitado e precisão equivalente. |
| Esforço/incerteza | médio a grande; escala e meta ainda não definidas |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-053"></a>

## GYM-AUD-053 — Trilha administrativa não preserva ator original e etapas completas

| Campo | Diagnóstico |
|---|---|
| Categoria | Auditoria/observabilidade |
| Severidade e fundamento | **média**. Não se determina quem fez mudança ou que etapa externa/local terminou. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | Impersonation/AuditLog/efeitos |
| Arquivos/funções/linhas | [src/lib/logger.ts:86](<../../../src/lib/logger.ts#L86>); [src/app/api/superadmin/impersonate/route.ts:8](<../../../src/app/api/superadmin/impersonate/route.ts#L8>); [src/modules/workspaces/application/staff-service.ts:168](<../../../src/modules/workspaces/application/staff-service.ts#L168>) |
| Evidência concreta | Impersonation registra início pelo admin, mas rotinas usam context.userId do alvo e logger auth também, sem originalAdminUserId. Muitas mutações/audit são etapas separadas; texto de ação não tem before/after/correlation padronizados. |
| Comportamento atual | Impersonation registra início pelo admin, mas rotinas usam context.userId do alvo e logger auth também, sem originalAdminUserId. Muitas mutações/audit são etapas separadas; texto de ação não tem before/after/correlation padronizados. |
| Esperado e fundamento | Ação administrativa deve ser rastreável a executor real e entidade/fases; UI promete rastrear ações como superadmin. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Admin impersona e altera; audit/publish falha após persistência. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Não se determina quem fez mudança ou que etapa externa/local terminou. |
| Causa demonstrada/provável | Actor/context e audit não modelam impersonação/fases de comando. |
| Correção recomendada | Audit ator real+effective actor, correlação/antes-depois e resultado; transação/outbox conforme criticidade. |
| Dependências/efeitos | Auth JWT, todos comandos/admin e logs. |
| Validação da correção | Impersonação gera ambos atores; falha posterior não oculta write; timeline reconstrói operação sem segredos. |
| Esforço/incerteza | médio; avaliar retenção e formato sem expor PII |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-054"></a>

## GYM-AUD-054 — Setup de senha registra aceite sem conferir escolha e regra de idade diverge

| Campo | Diagnóstico |
|---|---|
| Categoria | Legal/onboarding |
| Severidade e fundamento | **média**. Trilha de aceite não comprova manifestação e onboarding contraditório entre origens. |
| Grau de confirmação | Fato confirmado no código |
| Página/fluxo/operação | setupPassword e ingresso menor |
| Arquivos/funções/linhas | [src/components/auth/actions.ts:432](<../../../src/components/auth/actions.ts#L432>); [src/lib/privacy/age-validator.ts:19](<../../../src/lib/privacy/age-validator.ts#L19>) |
| Evidência concreta | acceptedTerms/acceptedPrivacy recebidos não condicionam gravação de LegalAcceptance. Idade18+ só validada se User.birthDate ausente; DOB previamente cadastrado passa sem mesma verificação, inclusive menores gym. |
| Comportamento atual | acceptedTerms/acceptedPrivacy recebidos não condicionam gravação de LegalAcceptance. Idade18+ só validada se User.birthDate ausente; DOB previamente cadastrado passa sem mesma verificação, inclusive menores gym. |
| Esperado e fundamento | Aceite registrado deve representar ação explícita; idade/representação deve seguir política uniforme do perfil e não depender do campo já existir. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Form chama action com aceite false ou usuário possui DOB menor previamente salvo. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Trilha de aceite não comprova manifestação e onboarding contraditório entre origens. |
| Causa demonstrada/provável | Setup compartilhado com parâmetros ignorados e validação condicional. |
| Correção recomendada | Conferir aceites exigidos server-side e documentos atuais; definir fluxo menor/guardian sem regra18+ implícita global. |
| Dependências/efeitos | Termos/privacy/minor/setup de todas origens. |
| Validação da correção | False ausente não grava aceite nem finaliza; menor por qualquer origem segue mesma representação. |
| Esforço/incerteza | médio; política legal/produto necessita validação |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-055"></a>

## GYM-AUD-055 — Commit de importação confia prévia do cliente e ativa direitos sem invariantes

| Campo | Diagnóstico |
|---|---|
| Categoria | Importação/integridade |
| Severidade e fundamento | **alta**. Ativa direitos/valores indevidos, duplicidade e dados incompatíveis. Não gera charge Asaas no commit examinado, aspecto positivo preservado. |
| Grau de confirmação | Fato confirmado; adulteração real não executada |
| Página/fluxo/operação | import preview/commit |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-import-service.ts:521](<../../../src/modules/workspaces/application/gym-import-service.ts#L521>); [src/modules/workspaces/application/gym-import-service.ts:758](<../../../src/modules/workspaces/application/gym-import-service.ts#L758>); [src/app/api/gym/import/commit/route.ts:8](<../../../src/app/api/gym/import/commit/route.ts#L8>) |
| Evidência concreta | Hash é calculado do CSV no preview, mas commit recebe hash/rows livres sem ligar à prévia validada. Confia isMinor/hasGuardianData/action/preço; não revalida quota/cpf/contrato; cria enrollment ACTIVE e RFID grant ACTIVE mesmo sem contrato. Warning sem override não impede maioria dos warnings. |
| Comportamento atual | Hash é calculado do CSV no preview, mas commit recebe hash/rows livres sem ligar à prévia validada. Confia isMinor/hasGuardianData/action/preço; não revalida quota/cpf/contrato; cria enrollment ACTIVE e RFID grant ACTIVE mesmo sem contrato. Warning sem override não impede maioria dos warnings. |
| Esperado e fundamento | Importação assistida promete conferência/idempotência e bloqueio menor; entrada do cliente não pode substituir validação/invariantes do servidor. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador altera payload ou duas requisições mesmo lote; CSV com homônimo, minor, quota ou saldo. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Ativa direitos/valores indevidos, duplicidade e dados incompatíveis. Não gera charge Asaas no commit examinado, aspecto positivo preservado. |
| Causa demonstrada/provável | Preview tratado como confiança do cliente; criação contorna serviços canônicos. |
| Correção recomendada | Prévia persistida/signed vinculada a hash/tenant/ator e revalidada no commit; idem atômica; serviço de matrícula/acesso com modo legado explícito. |
| Dependências/efeitos | ImportJob, quotas, identity/minor, enrollment/financial/grants. |
| Validação da correção | Payload alterado recusado; retry/concurrency um lote; menor/aceite/quota corretos e saldo histórico nunca cobra gateway automaticamente. |
| Esforço/incerteza | grande; política de contratos legados requer decisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-056"></a>

## GYM-AUD-056 — Saques usam alçada alternativa e snapshot sem reserva atômica

| Campo | Diagnóstico |
|---|---|
| Categoria | Financeiro/saque |
| Severidade e fundamento | **alta**. Saque além da alçada declarada, duplicado ou acima de reserva local; controle final pode depender do provider. |
| Grau de confirmação | Código confirmado; duplicação e efeito externo são riscos |
| Página/fluxo/operação | wallet/payout |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:277](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L277>); [src/app/api/gym/finance/wallet/payout/route.ts:42](<../../../src/app/api/gym/finance/wallet/payout/route.ts#L42>) |
| Evidência concreta | MANAGER sem wallet.withdraw é autorizado por workspace.manage. Snapshot antigo governa saldo; KYC/titularidade de destino não validados localmente; request externa precede registro/unique e update usa saldo pré-lido sem reserva protegida. |
| Comportamento atual | MANAGER sem wallet.withdraw é autorizado por workspace.manage. Snapshot antigo governa saldo; KYC/titularidade de destino não validados localmente; request externa precede registro/unique e update usa saldo pré-lido sem reserva protegida. |
| Esperado e fundamento | A alçada de saque deve ser uma política única; reservar saldo/idempotência antes de submit externo e declarar verificação de destino/KYC existente. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Gerente solicita saque; duas requests usam mesmo saldo ou retry após falha local; gateway pode impor limites próprios não inspecionados. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Saque além da alçada declarada, duplicado ou acima de reserva local; controle final pode depender do provider. |
| Causa demonstrada/provável | Permissão alternativa contradiz matriz e snapshot é tratado como saldo transacional. |
| Correção recomendada | Decidir withdraw vs workspace.manage, validar account status/destino, claim/idem/reserva atômica e submit recuperável. |
| Dependências/efeitos | Asaas/WalletLedger/Snapshot/webhook failed-compensation. |
| Validação da correção | Sandbox duas requests/timeout: um submit por key e reserva correta; perfis autorizados explícitos; KYC/destino inválido negados. |
| Esforço/incerteza | grande; provider pode já limitar destinos, validar antes de afirmar exploração |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-057"></a>

## GYM-AUD-057 — Endpoint pessoal pode excluir academia sem encerramento coordenado

| Campo | Diagnóstico |
|---|---|
| Categoria | Ciclo de vida/dados |
| Severidade e fundamento | **alta**. Apaga dados locais ou falha parcialmente no feedback, mantém cobrança/hardware/arquivos ou resíduos sem workspace. |
| Grau de confirmação | Fato confirmado; delete real não executado |
| Página/fluxo/operação | DELETE personal/workspace |
| Arquivos/funções/linhas | [src/app/api/personal/workspace/route.ts:6](<../../../src/app/api/personal/workspace/route.ts#L6>); [prisma/schema.prisma:172](<../../../prisma/schema.prisma#L172>); [prisma/schema.prisma:764](<../../../prisma/schema.prisma#L764>) |
| Evidência concreta | Handler exige ownerId mas não type PERSONAL e faz workspace.delete direto; audit depois. GYM com financeiro Restrict pode falhar; outros dependentes podem cascade, enquanto campos workspaceId sem FK/serviços externos permanecem. |
| Comportamento atual | Handler exige ownerId mas não type PERSONAL e faz workspace.delete direto; audit depois. GYM com financeiro Restrict pode falhar; outros dependentes podem cascade, enquanto campos workspaceId sem FK/serviços externos permanecem. |
| Esperado e fundamento | Exclusão de academia precisa lifecycle próprio com retenção/purga/cancel externo e não ser acionada por API de produto pessoal. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Dono GYM envia workspaceId à rota pessoal; outcome depende dos dependentes instalados. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Apaga dados locais ou falha parcialmente no feedback, mantém cobrança/hardware/arquivos ou resíduos sem workspace. |
| Causa demonstrada/provável | Endpoint shared sem fronteira de tipo e sem orquestração de encerramento. |
| Correção recomendada | Bloquear GYM nesse endpoint; criar desativação/encerramento coordenado e política explícita para dados/integrações. |
| Dependências/efeitos | Schema/cascade/restrict, signature/subscription/device/files/privacy. |
| Validação da correção | GYM rejeitado pela rota pessoal; fluxo próprio sintético confirma retenção, cancel externo e purga sem órfãos. |
| Esforço/incerteza | grande; retenção e dados existentes requerem decisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-058"></a>

## GYM-AUD-058 — Página de recepção entrega lista de alunos sem capability

| Campo | Diagnóstico |
|---|---|
| Categoria | Autorização/PII |
| Severidade e fundamento | **alta**. Exposição da lista pessoal de todos alunos da academia e acesso a interface operacional. |
| Grau de confirmação | Fato confirmado no SSR; browser não executado |
| Página/fluxo/operação | GET /gym/reception |
| Arquivos/funções/linhas | [src/app/(gym)/gym/reception/page.tsx:7](<../../../src/app/(gym)/gym/reception/page.tsx#L7>); [src/app/(gym)/layout.tsx:37](<../../../src/app/(gym)/layout.tsx#L37>) |
| Evidência concreta | Page resolve contexto e consulta todos members STUDENT ativos com nome/e-mail/CPF/foto sem requireWorkspaceAccess. Layout apenas contexto GYM não concede capability; estudante ativo pode navegar URL manualmente. |
| Comportamento atual | Page resolve contexto e consulta todos members STUDENT ativos com nome/e-mail/CPF/foto sem requireWorkspaceAccess. Layout apenas contexto GYM não concede capability; estudante ativo pode navegar URL manualmente. |
| Esperado e fundamento | Consulta de recepção deve exigir acesso à operação/lista e escopo de unidade; esconder menu não autoriza payload. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: STUDENT/ASSISTANT ou outro membro sem capability navega diretamente à rota. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Exposição da lista pessoal de todos alunos da academia e acesso a interface operacional. |
| Causa demonstrada/provável | Server page não repete autorização das tarefas. |
| Correção recomendada | Guard capability e unidade antes de queries; DTO mínimo; buscar/paginar em servidor. |
| Dependências/efeitos | Layout/sidebar/student identity e GYM-AUD-052. |
| Validação da correção | SSR/HTTP como student nega sem payload; reception legítimo só alunos do escopo. |
| Esforço/incerteza | pequeno a médio; validar capacidade de recepção escolhida |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-059"></a>

## GYM-AUD-059 — CSV preserva prefixos de fórmula em campos controláveis

| Campo | Diagnóstico |
|---|---|
| Categoria | Exportação/segurança |
| Severidade e fundamento | **média**. Planilha pode interpretar conteúdo como fórmula; impacto real depende do app/ação do operador, sem RCE afirmada. |
| Grau de confirmação | Risco identificado; nenhuma planilha executada |
| Página/fluxo/operação | Analytics CSV |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-analytics-service.ts:716](<../../../src/modules/workspaces/application/gym-analytics-service.ts#L716>) |
| Evidência concreta | EscapeCsv envolve aspas e duplica aspas, mas preserva nome/contatos começando com =/+/-/@. Interpretar fórmula depende da planilha consumidora. A orientação OWASP identifica esse risco e ressalva que quoting sozinho não basta. |
| Comportamento atual | EscapeCsv envolve aspas e duplica aspas, mas preserva nome/contatos começando com =/+/-/@. Interpretar fórmula depende da planilha consumidora. A orientação OWASP identifica esse risco e ressalva que quoting sozinho não basta. |
| Esperado e fundamento | CSV de leitura humana deve preservar campo como texto; mitigação deve ser compatível com consumidor e não corromper valores numéricos legítimos. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Nome editado contendo fórmula inofensiva é exportado e aberto em Excel/LibreOffice. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Planilha pode interpretar conteúdo como fórmula; impacto real depende do app/ação do operador, sem RCE afirmada. |
| Causa demonstrada/provável | Escaping sintático CSV confundido com neutralização de fórmula. |
| Correção recomendada | Definir export de texto seguro para planilhas ou formato tipado; neutralizar campos controláveis e testar save/reopen no consumidor escolhido. |
| Dependências/efeitos | Analytics export/Student identity; não mudar import programático sem contrato. |
| Validação da correção | Dados sintéticos =1+1 e variantes exibidos como texto no app alvo após reabrir, mantendo dinheiro/data corretos. |
| Esforço/incerteza | pequeno a médio; não há mitigação universal para todos consumidores |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-060"></a>

## GYM-AUD-060 — Idade, cadastro do menor e matrícula numérica divergem entre entradas

| Campo | Diagnóstico |
|---|---|
| Categoria | Cadastro/integridade |
| Severidade e fundamento | **média**. Regra de representante/check-in incorreta, cadastro bloqueado e matrícula duplicada possível. |
| Grau de confirmação | Fato confirmado; colisão é risco concorrente |
| Página/fluxo/operação | Register/update/import minor |
| Arquivos/funções/linhas | [src/modules/workspaces/application/gym-student-service.ts:478](<../../../src/modules/workspaces/application/gym-student-service.ts#L478>); [src/modules/workspaces/application/gym-student-service.ts:744](<../../../src/modules/workspaces/application/gym-student-service.ts#L744>); [src/modules/workspaces/application/gym-student-service.ts:461](<../../../src/modules/workspaces/application/gym-student-service.ts#L461>); [src/app/(gym)/gym/students/students-client.tsx:75](<../../../src/app/(gym)/gym/students/students-client.tsx#L75>) |
| Evidência concreta | Register determina minor pela data fornecida, não necessariamente pelo User existente; omitir data em vínculo global menor pode marcar adulto. PATCH de DOB não recalcula isMinor. Form não coleta guardian obrigatório. Registration number count+1 após criação não é único/atômico. |
| Comportamento atual | Register determina minor pela data fornecida, não necessariamente pelo User existente; omitir data em vínculo global menor pode marcar adulto. PATCH de DOB não recalcula isMinor. Form não coleta guardian obrigatório. Registration number count+1 após criação não é único/atômico. |
| Esperado e fundamento | Condição minor precisa derivar de DOB canônica e representação; número administrativo não pode colidir se usado para identificar pessoa/hardware. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Vincular menor já existente sem DOB, alterar DOB, cadastrar menor pelo form ou dois registros juntos. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Regra de representante/check-in incorreta, cadastro bloqueado e matrícula duplicada possível. |
| Causa demonstrada/provável | Idade/contagem implementadas por entrada e sem invariant de dados. |
| Correção recomendada | Validador/derivação comum, fluxo guardian no form e transição de maioridade; sequência/unique matrícula por escopo decidido. |
| Dependências/efeitos | Minor/access/contract e import; registration também usado no hardware. |
| Validação da correção | Mesma DOB por todas origens gera minor igual; guardian legítimo completa cadastro; concorrência sem matrícula duplicada. |
| Esforço/incerteza | médio; escopo da matrícula e maioridade exigem decisão |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-061"></a>

## GYM-AUD-061 — Provisionamento confirma workspace antes de concluir configuração e licença

| Campo | Diagnóstico |
|---|---|
| Categoria | Confiabilidade/funcional |
| Severidade e fundamento | **média**. Academia incompleta e recuperação manual/confusa; não foi verificado estado real existente. |
| Grau de confirmação | Fato confirmado da sequência; falha externa/DB não injetada |
| Página/fluxo/operação | Superadmin createWorkspace GYM |
| Arquivos/funções/linhas | [src/modules/workspaces/application/superadmin-service.ts:47](<../../../src/modules/workspaces/application/superadmin-service.ts#L47>); [src/modules/workspaces/application/backfill-service.ts:47](<../../../src/modules/workspaces/application/backfill-service.ts#L47>) |
| Evidência concreta | Workspace/owner/grant/audit são transacionados, mas settings/unidade/subscription e limites são etapas posteriores. Falha deixa entidade principal já criada; retry por slug pode ser recusado sem completar configuração. |
| Comportamento atual | Workspace/owner/grant/audit são transacionados, mas settings/unidade/subscription e limites são etapas posteriores. Falha deixa entidade principal já criada; retry por slug pode ser recusado sem completar configuração. |
| Esperado e fundamento | Criar academia funcional requer todos pré-requisitos ou estado de provisioning recuperável; UI promete inicialização completa. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Falha em backfill/subscription após commit inicial; operador repete. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Academia incompleta e recuperação manual/confusa; não foi verificado estado real existente. |
| Causa demonstrada/provável | Boundary transacional termina antes dos pré-requisitos locais. |
| Correção recomendada | Mesma transação para pré-requisitos locais ou state machine de provisioning idempotente; API retorna etapa/pending e retoma por referência. |
| Dependências/efeitos | Config/license/unit/owner e global defaults. |
| Validação da correção | Fault injection por etapa e retry do mesmo request resultam em uma academia completa ou pending recuperável, sem duplicata. |
| Esforço/incerteza | médio; provider onboarding separado não deve entrar numa transação longa |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-062"></a>

## GYM-AUD-062 — Identidade externa muda entre sincronização, credencial, revogação e passagem

| Campo | Diagnóstico |
|---|---|
| Categoria | Hardware/integridade |
| Severidade e fundamento | **alta**. Credencial associada a outra identidade ou inexistente, passagem não atribuída e purga inefetiva plausíveis no agente. |
| Grau de confirmação | Mapeamento divergente reproduzido isoladamente; efeito físico não testado |
| Página/fluxo/operação | Control iD / queue/passage/offboarding |
| Arquivos/funções/linhas | [src/modules/workspaces/application/control-id-adapter.ts:17](<../../../src/modules/workspaces/application/control-id-adapter.ts#L17>); [src/modules/workspaces/application/gym-device-service.ts:302](<../../../src/modules/workspaces/application/gym-device-service.ts#L302>); [src/modules/workspaces/application/gym-device-service.ts:335](<../../../src/modules/workspaces/application/gym-device-service.ts#L335>); [src/modules/workspaces/application/gym-device-service.ts:558](<../../../src/modules/workspaces/application/gym-device-service.ts#L558>); [src/modules/workspaces/application/gym-offboarding-service.ts:276](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L276>) |
| Evidência concreta | SYNC_USER pode mapear matrícula numérica custom, SYNC_CREDENTIAL/DELETE usam hash do member. Prova real mostrou IDs diferentes para mesma pessoa. Passage procura registrationNumber igual externalPersonId, sem reverse map do hash; offboarding grava member.id bruto no payload de delete. |
| Comportamento atual | SYNC_USER pode mapear matrícula numérica custom, SYNC_CREDENTIAL/DELETE usam hash do member. Prova real mostrou IDs diferentes para mesma pessoa. Passage procura registrationNumber igual externalPersonId, sem reverse map do hash; offboarding grava member.id bruto no payload de delete. |
| Esperado e fundamento | Cadastro, credencial, logs e purga devem usar um único identificador externo persistido por device/tenant. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Aluno com matrícula numérica ou matrícula textual com hash, depois sincronização/credencial/revoke/evento. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Credencial associada a outra identidade ou inexistente, passagem não atribuída e purga inefetiva plausíveis no agente. |
| Causa demonstrada/provável | Mapeamento opcional e reverso não persistido; alguns comandos contornam adapter. |
| Correção recomendada | Persistir mapping estável único e usar em todas operações; adaptar payload de purga ao protocolo e map reverso de passagem. |
| Dependências/efeitos | Driver/agent/registrationNumber/biometry/offboarding e migrations. |
| Validação da correção | Equipamento/simulador: mesma pessoa usa mesmo ID em create/credential/event/delete; numerais e CUID/texto, sem colisão. |
| Esforço/incerteza | grande; IDs já instalados exigem reconciliação física |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-063"></a>

## GYM-AUD-063 — Contingência marca banco mas não configura o equipamento nem automatiza expiração

| Campo | Diagnóstico |
|---|---|
| Categoria | Hardware/recuperação |
| Severidade e fundamento | **média**. Continuidade não garantida ou modo obsoleto; impacto real depende de agente externo desconhecido. |
| Grau de confirmação | Fato confirmado da rota; agente/deploy não inspecionados |
| Página/fluxo/operação | devices/[id]/contingency / RecoveryService |
| Arquivos/funções/linhas | [src/app/api/gym/devices/[id]/contingency/route.ts:11](<../../../src/app/api/gym/devices/[id]/contingency/route.ts#L11>); [src/modules/workspaces/application/gym-recovery-service.ts:110](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L110>); [src/modules/workspaces/application/gym-offline-reconciliation-service.ts:489](<../../../src/modules/workspaces/application/gym-offline-reconciliation-service.ts#L489>) |
| Evidência concreta | Rota usa RecoveryService: altera contingencyMode/expiresAt e audit, sem comando físico. Outra implementação offline tem limite/ação diferente. Não foi localizado consumidor que efetivamente aplique e expire o modo da rota no equipamento. |
| Comportamento atual | Rota usa RecoveryService: altera contingencyMode/expiresAt e audit, sem comando físico. Outra implementação offline tem limite/ação diferente. Não foi localizado consumidor que efetivamente aplique e expire o modo da rota no equipamento. |
| Esperado e fundamento | Ação chamada contingência física precisa efeito/estado observável e normalização automática ou instrução manual explícita; runbook promete operação. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Operador ativa e espera acesso de contingência/retorno após TTL. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Continuidade não garantida ou modo obsoleto; impacto real depende de agente externo desconhecido. |
| Causa demonstrada/provável | Campo administrativo e modo de equipamento tratados como equivalentes; serviços duplicados. |
| Correção recomendada | Um protocolo de contingency com efeito/aplicação/ACK/TTL e fallback manual descrito; remover garantias sem consumidor. |
| Dependências/efeitos | Agent/device/recovery/runbooks e safety policy. |
| Validação da correção | Teste com simulador/equipamento: enable aplicado, tempo expira e disable confirmado; falta de ACK mostra pending/failure. |
| Esforço/incerteza | médio a grande; pode haver consumidor externo a confirmar |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-064"></a>

## GYM-AUD-064 — Credentials autentica só com senha sem impor 2FA/3FA do fluxo de login

| Campo | Diagnóstico |
|---|---|
| Categoria | Autenticação |
| Severidade e fundamento | **alta**. Segundo fator não protege emissão direta de sessão, inclusive superadmin; nenhuma conta real explorada. |
| Grau de confirmação | Fato confirmado no authorize; bypass HTTP não executado |
| Página/fluxo/operação | NextAuth Credentials e superadmin/gym login |
| Arquivos/funções/linhas | [src/auth.ts:19](<../../../src/auth.ts#L19>); [src/components/auth/actions.ts:21](<../../../src/components/auth/actions.ts#L21>); [src/app/api/auth/[...nextauth]/route.ts:1](<../../../src/app/api/auth/[...nextauth]/route.ts#L1>) |
| Evidência concreta | Server Action login implementa OTP/TOTP/3FA e rateLimit, mas authorize do provider aceita e-mail/senha e retorna User sem validar desafio 2FA/3FA nem rateLimit desse caminho. Handler NextAuth expõe esse provider. |
| Comportamento atual | Server Action login implementa OTP/TOTP/3FA e rateLimit, mas authorize do provider aceita e-mail/senha e retorna User sem validar desafio 2FA/3FA nem rateLimit desse caminho. Handler NextAuth expõe esse provider. |
| Esperado e fundamento | Toda emissão de sessão para conta com 2FA deve exigir prova do segundo fator, independentemente do formulário/caller; configuração real de 2FA existe. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Com senha correta, caller usa fluxo Credentials diretamente em ambiente isolado, sem completar Action login/OTP; respeitar protocolo/CSRF do framework. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Segundo fator não protege emissão direta de sessão, inclusive superadmin; nenhuma conta real explorada. |
| Causa demonstrada/provável | Desafio aplicado no wrapper e não na fronteira autenticadora. |
| Correção recomendada | Authorize exige prova server-side única/expirada do desafio ou executa todo protocolo MFA; rateLimit no autenticador; não confiar em bool cliente. |
| Dependências/efeitos | Auth/actions/NextAuth/OTP/totp e sessão; flag gym não substitui MFA real. |
| Validação da correção | HTTP sintético do provider com senha correta e MFA ativo nega sem desafio e aceita uma vez com prova válida; replay/expiry negados. |
| Esforço/incerteza | grande; protocolo MFA/compatibilidade precisa preservar todos perfis |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

<a id="gym-aud-065"></a>

## GYM-AUD-065 — Papel global e sessões não são revogados após mudança administrativa

| Campo | Diagnóstico |
|---|---|
| Categoria | Sessões/privilégios |
| Severidade e fundamento | **alta**. Privilégio global antigo continua ou titular anônimo conserva sessão; prazo/config de produção não verificados. |
| Grau de confirmação | Fato confirmado no callback; janela real depende config |
| Página/fluxo/operação | Role SUPERADMIN/USER e anonimização |
| Arquivos/funções/linhas | [src/auth.config.ts:64](<../../../src/auth.config.ts#L64>); [src/auth.ts:151](<../../../src/auth.ts#L151>); [src/auth.ts:179](<../../../src/auth.ts#L179>); [src/modules/workspaces/application/gym-offboarding-service.ts:649](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L649>) |
| Evidência concreta | JWT copia role no login; session consulta perfil sem role/status/version e mantém token.role. Usuário existente com password null continua válido; apenas ausência de User invalida sessão. Demover SUPERADMIN pode manter role/admin capabilities na sessão antiga. |
| Comportamento atual | JWT copia role no login; session consulta perfil sem role/status/version e mantém token.role. Usuário existente com password null continua válido; apenas ausência de User invalida sessão. Demover SUPERADMIN pode manter role/admin capabilities na sessão antiga. |
| Esperado e fundamento | Retirar privilégio/encerrar acesso precisa valer em sessão existente segundo lifecycle implementado; password null não revoga token. |
| Condições/passos de reprodução | Em ambiente isolado com dados sintéticos: Admin muda role global ou operação anônima remove senha; sessão anterior ainda autenticada. Leitura estática não foi chamada de teste HTTP. |
| Impacto | Privilégio global antigo continua ou titular anônimo conserva sessão; prazo/config de produção não verificados. |
| Causa demonstrada/provável | Role em JWT não é revalidado e não há versão/revocation de sessão consultada. |
| Correção recomendada | Session version/revocation/check de role/status coerente; separar bloqueio login de revogação de sessão; manter performance controlada. |
| Dependências/efeitos | Middleware/superadmin guards/impersonation/deletion. |
| Validação da correção | Sessão prévia após demotion/revoke imediatamente perde API/admin; login novo e sessão regular continuam funcionais. |
| Esforço/incerteza | médio; política de expiração/refresh precisa definir |
| Prioridade de execução | Consultar etapas/dependências na seção16 do diagnóstico; não derivar só da severidade. |

## Fontes externas usadas para delimitar riscos

A herança de capabilities de token sem capability é descrita em [Ably capabilities](https://ably.com/docs/auth/capabilities), fundamentando GYM-AUD-049 sem afirmar configuração da chave de produção. Autenticação por apiKey de subconta: [Asaas criação de subcontas](https://docs.asaas.com/docs/criacao-de-subcontas), usada em GYM-AUD-028 como divergência a validar em sandbox. Isolamento de transações/retentativas: [Prisma transactions](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions); uma transação não prova sozinha invariantes concorrentes de GYM-AUD-025/033. Para GYM-AUD-059, [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection) descreve interpretação de fórmulas e limitações das estratégias de escape; não foi executada planilha nem payload com rede/comandos.
