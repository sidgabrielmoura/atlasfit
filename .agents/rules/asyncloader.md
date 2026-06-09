---
trigger: always_on
---

Sempre que implementar qualquer operação assíncrona na aplicação, siga estas regras obrigatoriamente:

1. Toda ação assíncrona DEVE possuir feedback visual imediato para o usuário.

2. Nunca permita que uma ação assíncrona execute sem indicar claramente que está em andamento.

3. Operações que exigem feedback visual obrigatório:
- submit de formulários
- login/logout
- uploads
- deleções
- salvamentos
- atualizações
- sincronizações
- requests HTTP
- server actions
- chamadas de API
- mutations
- pagamentos
- geração de arquivos
- exportações
- importações
- carregamento de dados
- filtros
- buscas
- paginação
- qualquer promise assíncrona

4. Sempre implemente pelo menos UM destes mecanismos:
- loading state
- disabled state
- skeleton
- spinner
- progress bar
- toast de progresso
- botão com estado loading
- overlay de bloqueio
- feedback visual contextual

5. Botões assíncronos DEVEM:
- ficar disabled durante execução
- impedir múltiplos cliques
- mostrar spinner/loading
- alterar texto temporariamente

Exemplo:
"Salvar" → "Salvando..."
"Excluir" → "Excluindo..."
"Enviar" → "Enviando..."

6. Sempre evitar:
- double submit
- race conditions causadas por múltiplos cliques
- ações silenciosas
- ausência de feedback
- interface congelada sem explicação

7. Toda operação assíncrona crítica DEVE possuir:
- estado idle
- estado loading
- estado success
- estado error

8. Sempre mostrar feedback de sucesso ou erro usando:
- Sonner
- Toast
- Alert
- mensagens contextuais

9. Imports preferenciais:

import { toast } from "sonner"

ou componentes existentes em:

/components/ui

10. Em operações demoradas:
- exibir progresso parcial quando possível
- manter usuário informado
- evitar sensação de travamento

11. Em formulários:
- bloquear submit duplicado
- preservar valores durante loading
- indicar campos inválidos claramente

12. Em listas/tabelas:
- indicar item específico em loading
- evitar bloquear a tela inteira desnecessariamente

13. Em deleções:
- usar confirmação visual
- mostrar estado de remoção
- prevenir clique repetido

14. Em uploads:
- sempre mostrar progresso
- tamanho/processamento
- estado final

15. Nunca use:
- ações silenciosas
- promises sem tratamento
- async sem try/catch
- loading global desnecessário

16. Toda async operation deve ser resiliente visualmente.

17. Sempre priorize:
- clareza
- previsibilidade
- segurança de interação
- UX responsiva
- prevenção de erro humano

18. Se existir dúvida sobre adicionar feedback visual:
- SEMPRE adicione.