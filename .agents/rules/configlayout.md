---
trigger: always_on
---

Sempre que for criar, alterar ou sugerir qualquer componente, layout ou interface, siga estas regras obrigatoriamente:

1. Antes de criar qualquer elemento de UI, verifique se ele corresponde a algum dos componentes abaixo:

Accordion
Alert
Alert Dialog
Aspect Ratio
Avatar
Badge
Breadcrumb
Button
Button Group
Calendar
Card
Carousel
Chart
Checkbox
Collapsible
Combobox
Command
Context Menu
Data Table
Date Picker
Dialog
Direction
Drawer
Dropdown Menu
Empty
Field
Hover Card
Input
Input Group
Input OTP
Item
Kbd
Label
Menubar
Navigation Menu
Pagination
Popover
Progress
Radio Group
Resizable
Scroll Area
Select
Separator
Sheet
Sidebar
Skeleton
Slider
Sonner
Spinner
Switch
Table
Tabs
Textarea
Toast
Toggle
Toggle Group
Tooltip

2. Se o elemento existir nessa lista:
- NÃO recrie o componente manualmente.
- NÃO escreva HTML customizado equivalente.
- NÃO use bibliotecas alternativas.
- Sempre importe e utilize o componente existente da pasta:

/components/ui

3. Os imports devem seguir o padrão:

import { Button } from "@/components/ui/button"

4. Priorize sempre:
- reutilização
- consistência visual
- acessibilidade
- composição do shadcn/ui
- variantes via cva
- tailwind utility classes apenas para layout e espaçamento

5. Antes de gerar qualquer novo componente:
- verifique primeiro se já existe equivalente em /components/ui
- reutilize o componente existente
- apenas componha novos componentes usando os do shadcn/ui

6. Evite:
- duplicação de componentes
- estilos inline
- wrappers desnecessários
- reinventar componentes básicos
- criar modal, tooltip, dropdown, tabs, table, inputs ou dialogs manualmente

7. Sempre mantenha compatibilidade com:
- TailwindCSS
- shadcn/ui
- Radix UI
- dark mode
- responsividade

8. Se houver dúvida entre criar algo customizado ou reutilizar um componente do shadcn/ui:
- SEMPRE prefira reutilizar o componente existente.

9. Ao gerar código:
- faça os imports corretos automaticamente
- utilize composição idiomática do shadcn/ui
- mantenha o código limpo e padronizado
- siga boas práticas de React/Next.js