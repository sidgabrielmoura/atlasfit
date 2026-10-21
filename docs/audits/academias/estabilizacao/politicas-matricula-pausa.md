# Matrícula vigente única e geração suspensa na pausa — 05/10/2026

Decisões recebidas do usuário nesta sessão: **“Suspender a geração durante a pausa”** e **“Uma matrícula ativa por aluno”**. Substituem as dúvidas anteriores sobre esses dois pontos. O financeiro GYM permanece local/manual.

## Matrícula vigente única

Cadastro independente, ativação, retomada e geração de mensalidade verificam outros contratos ACTIVE/PAUSED do aluno na mesma academia dentro da transação Serializable. A pausa conserva o contrato vigente: não permite abrir outro contrato independente para contornar a suspensão. Ativações concorrentes de dois contratos pendentes deixam somente um ativo; o outro retorna 409 com ACTIVE_ENROLLMENT_EXISTS.

Troca e renovação mantêm o caminho de revisão existente, com aceite próprio, aprovação/obrigação inicial quando exigidas e cancelamento/substituição do anterior na mesma transação. A checagem de unicidade permite somente o predecessor declarado e validado dessa revisão. Matrícula CANCELLED/EXPIRED não impede um contrato novo; histórico e aceites são preservados. A regra é por academia: a mesma identidade pode manter vínculo ativo em outra empresa.

Uma duplicidade criada por escritor legado bloqueia retomada e novas cobranças; o comando não escolhe qual contrato cancelar. O índice parcial da migration `20261005010000_gym_single_live_enrollment` protege ACTIVE/PAUSED por workspace/studentMember. O preflight recusa duplicidades antes de criar o índice. **A migration foi preparada e seu SQL é verificado em tabela temporária no PostgreSQL descartável. Não foi aplicada à tabela pública do banco de testes, ao banco configurado nem a produção.** Revisão do legado e implantação da cadeia de migrations continuam pendentes nos achados 011/046.

## Geração de mensalidades durante pausa

A emissão recusa matrícula PAUSED e também intervalo de pausa aberto que já começou, mesmo quando o job de estado ainda não rodou. Responde 409 com BILLING_PAUSED sem emitir fatura, incrementar ciclo ou avançar vencimento. Pausa futura não suspende antecipadamente. O job de recorrência exclui pausas em curso antes do limite de 500 candidatos, evitando que elas ocupem toda a primeira página; a transação revalida a pausa caso comece durante o processamento.

Repetir uma emissão que já existia retorna a obrigação anterior; não cria uma cobrança durante a pausa. Dívidas, pagamentos, recebimentos e vencimentos existentes são preservados. Após a retomada, a geração volta a usar o calendário contratual existente. Não foram criados desconto, estorno, prorrata ou recalendário automático. O tratamento de competências vencidas durante pausas longas ainda requer definição operacional/verificação específica antes de anunciar um ciclo financeiro completo sem cobranças retroativas.

O diálogo de pausa explica que acesso e geração de novas mensalidades ficam suspensos, conservando as anteriores. A checagem do servidor aplica a regra independentemente da interface.

## Evidências e restante

**Resultado final: 46 testes PostgreSQL, dois HTTP e dois do SQL da migration passaram, sem falhas; TypeScript completo saiu com código 0.** O filtro HTTP deixou 42 casos fora da execução. Resultados brutos, comandos e hashes estão em [verificacoes-politicas-matricula.json](verificacoes-politicas-matricula.json). A primeira rodada de seis casos novos falhou na fixture por usar phone em vez de whatsapp; corrigiu-se a fixture, sem mudar os guards. Uma chamada HTTP sem a origem de teste exigida foi rejeitada pela proteção do runner; a execução foi repetida com a configuração isolada correta. Somente PostgreSQL/API descartáveis e dados sintéticos são usados. Testes de concorrência, dívida/replay, outra academia, revisão contratual e SQL da migration são distintos de homologação visual completa ou implantação.

GYM-AUD-022 permanece parcial: transições e jornadas completas, competências após retomada e legado ainda precisam de trabalho. As duas decisões acima não são mais perguntas pendentes. A [lista completa do restante](pendencias-restantes.md) cobre os 40 achados abertos e Personal vinculado por último.
