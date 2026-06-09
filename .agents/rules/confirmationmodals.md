---
trigger: always_on
---

Sempre que implementar qualquer ação sensível, destrutiva ou irreversível, siga estas regras obrigatoriamente:

1. Toda ação potencialmente perigosa DEVE exigir confirmação explícita do usuário antes da execução.

2. A confirmação DEVE acontecer através de:
- Alert Dialog
- Dialog
- Modal de confirmação

utilizando componentes do shadcn/ui importados de:

/components/ui/alert-dialog

ou

/components/ui/dialog

3. Ações que OBRIGATORIAMENTE precisam de confirmação:
- deletar registros
- remover usuários
- excluir arquivos
- cancelar pagamentos
- resetar dados
- limpar tabelas
- revogar permissões
- ações irreversíveis
- operações em massa
- publish/deploy
- desativar contas
- logout crítico
- remoção de integrações
- alteração crítica de configuração
- qualquer operação destrutiva

4. Nunca execute ações destrutivas:
- diretamente no onClick
- sem confirmação visual
- sem contexto do impacto
- sem opção de cancelamento

5. O modal deve conter obrigatoriamente:
- título claro
- descrição objetiva do impacto
- botão de cancelar
- botão de confirmar
- destaque visual para ação destrutiva

6. Botões destrutivos devem usar:
variant="destructive"

7. Estrutura recomendada:

- Título:
"Tem certeza?"

- Descrição:
"Essa ação não poderá ser desfeita."

8. Sempre deixar explícito:
- o que será afetado
- se a ação é irreversível
- possíveis consequências

9. O foco inicial do modal deve ser:
- botão cancelar
- nunca o botão destrutivo

10. O usuário deve precisar realizar uma ação consciente para confirmar.

11. Em operações críticas:
- exigir confirmação dupla quando necessário
- ex: digitar "DELETE" ou nome do recurso

12. Durante a execução:
- desabilitar botões
- mostrar loading
- impedir múltiplas confirmações
- exibir feedback visual

13. Após sucesso:
- mostrar toast de confirmação
- atualizar UI imediatamente

14. Após erro:
- mostrar mensagem clara
- preservar contexto
- permitir retry seguro

15. Imports recomendados:

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

16. Nunca usar:
- window.confirm
- alert nativo
- confirmação silenciosa
- deleção instantânea
- ações destrutivas sem contexto visual

17. Sempre priorizar:
- segurança do usuário
- prevenção de erro humano
- clareza
- UX defensiva
- confirmação explícita

18. Se existir dúvida se uma ação precisa de confirmação:
- SEMPRE considere que precisa.