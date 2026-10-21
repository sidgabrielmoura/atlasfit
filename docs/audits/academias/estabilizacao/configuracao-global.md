# Configuração global das academias

Lote incremental de 02/10/2026. Não altera registros financeiros, integrações PERSONAL, licenças existentes ou migrations. Avaliação visual ainda pendente.

## Contrato e persistência

`GET /api/superadmin/gym-settings` continua retornando o DTO completo tipado pelo schema Zod. Valores legados inválidos recebem defaults somente na leitura, sem reescrita automática. Contagens e centavos precisam ser inteiros; percentuais admitem fração. Controle de acesso global exige `true` explícito.

`PATCH` exige `configs` parcial não vazio e `baseline` com os mesmos campos. O baseline contém os valores apresentados antes da edição; não concede autoridade. O servidor compara esses valores dentro de transação Serializable, após revalidar o papel atual SUPERADMIN. Alteração concorrente do mesmo campo retorna 409; alterações independentes podem ser mescladas. A ausência de baseline retorna 400. Consumidor localizado: esta página do superadmin. O serviço preserva compatibilidade de chamadas administrativas internas sem baseline, sempre revalidando o papel atual; nenhum outro consumidor HTTP foi localizado.

JSON inválido retorna 400; o corpo real é limitado a 16 KiB, independentemente de Content-Length. Campos extras, tipos, limites e enums são rejeitados. Configurações e auditoria são atômicas; falha da auditoria não deixa alteração parcial. Foi removido o IP fictício `127.0.0.1` do registro administrativo; não foi inventado o endereço do operador.

Não há versão global nova nem migration: a comparação dos campos alterados usa os registros existentes. Os defaults de licença e operação são copiados no provisionamento; não modificam academias anteriores e não criam licença GYM no PERSONAL.

## Interface

| Área | Comportamento implementado | Limite |
|---|---|---|
| Cabeçalho | Título, indicação aplicada/pendente e salvar | Marca global do superadmin mantida |
| Módulos | Controle de acesso e importação; disponibilidade aplicada separada do switch em edição | Enforcement de outros módulos não é presumido |
| Novas academias | Limites e políticas financeiras agrupados; texto distingue defaults de licença individual | Limite zero de unidades não permite provisionar unidade inicial |
| Integrações/segurança | Estado físico explicitamente pendente; recursos indisponíveis identificados | Não homologa equipamento, biometria ou purga |
| Ajuda secundária | Valores consolidados para conferência; registro legado preservado | Não promete que todo campo armazenado tenha efeito |
| Recuperação | Erro encerra skeleton, oferece retry; descarte e recarga disponíveis | Navegador/teclado ainda não inspecionados |
| Gravação | Apenas campos alterados; valida resposta e relê GET antes do toast | Falha da confirmação conserva pendências e mostra erro |

Foram reutilizados Card, Input, Label, Switch, Badge, Skeleton, Button e AlertDialog da biblioteca existente. Grids reorganizam campos em uma, duas ou três colunas; header e ações permitem quebra. Labels são associados aos campos. Isso é evidência de código, não homologação mobile ou de acessibilidade.

Controles sem garantia operacional completa (biometria/facial, abertura contínua, purga automática, flag específica de MFA de gestores, tuning do agente e switches globais de aulas/CRM) foram retirados da edição nesta página. Valores históricos não foram apagados. A política efetiva de autenticação permanece no fluxo de segurança existente. Enforcement completo de aulas/CRM e demais escritores de dispositivo continua em GYM-AUD-015.

## Evidência e cobertura

- Banco descartável real: defaults inválidos, leitura sem escrita, patch parcial, papel revogado, provisionamento posterior, ausência de licença GYM no PERSONAL, concorrência no mesmo/diferente campo e rollback por falha de auditoria.
- HTTP local: conta comum negada, payload malformado/excessivo/inválido, baseline obrigatório, conflito explícito, gravação e nova consulta, papel revogado durante sessão existente. Resultados atuais: [verificacoes-isoladas.json](verificacoes-isoladas.json), entradas `postgresql-config` e `http-config`.
- O lote de banco inclui cinco casos de treinos como regressão do leitor JSON compartilhado. Não substitui a suíte completa.
- TypeScript executado. Não houve build de produção, navegador, e-mails, gateway, uploads externos ou hardware neste lote.

GYM-AUD-016 e GYM-AUD-051 aguardam verificação específica da interface: editar durante save, conflito, falha de GET/PATCH/confirmar, desktop 360–1280 px, teclado/foco e contraste. Não são marcados como corrigidos só porque o servidor passou nos testes.
