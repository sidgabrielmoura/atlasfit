---
trigger: always_on
---

Sempre que criar uma nova tela, página, dashboard, seção ou componente que dependa de dados carregados do banco/API, siga estas regras obrigatoriamente:

1. Toda interface que carregue dados assíncronos DEVE possuir estado de loading visual.

2. O loading DEVE utilizar Skeletons do shadcn/ui importados de:

/components/ui/skeleton

3. Nunca use:
- "Loading..."
- spinners isolados
- tela branca
- conteúdo piscando
- loaders genéricos sem estrutura visual

4. O Skeleton deve representar fielmente o layout final da interface:
- tabelas → skeleton de linhas/colunas
- cards → skeleton de cards
- listas → skeleton de itens
- avatar → skeleton circular
- gráficos → skeleton proporcional
- formulários → skeleton dos campos
- dashboards → estrutura completa simulada

5. Sempre preserve:
- espaçamento real
- altura real
- largura aproximada
- responsividade
- grid/layout final

6. Estrutura obrigatória:
- loading state
- empty state
- success state
- error state

7. Sempre que houver:
- fetch
- query
- server action
- async component
- React Query
- SWR
- Prisma
- Supabase
- API request
- banco de dados

o componente DEVE implementar skeleton loading.

8. Exemplo obrigatório de import:

import { Skeleton } from "@/components/ui/skeleton"

9. Prioridades da UI:
- evitar layout shift
- melhorar percepção de performance
- manter estabilidade visual
- carregar conteúdo progressivamente

10. Em tabelas:
- renderize múltiplas linhas skeleton
- mantenha headers visíveis
- preserve paginação/layout

11. Em cards:
- renderize placeholders reais
- simule imagem, título e descrição

12. Em dashboards:
- carregue widgets com skeleton independente
- não bloqueie a tela inteira se apenas parte estiver carregando

13. Nunca espere todos os dados terminarem para renderizar a UI inteira se partes já puderem aparecer.

14. Sempre use composição com componentes do shadcn/ui.

15. Se existir dúvida entre usar spinner ou skeleton:
- SEMPRE use skeleton.

16. Toda nova tela gerada deve já nascer preparada para estados assíncronos.