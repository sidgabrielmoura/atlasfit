# Homologação ainda necessária

13/10/2026. Os testes automatizados delimitam correções locais; nenhuma atividade abaixo foi declarada como realizada por uma pessoa ou em produção. Publicação na Hostinger será manual, conforme o usuário.

| Área | Execução e evidência necessária |
|---|---|
| Cobranças PERSONAL legadas | Para cada um dos sete casos de `evidencias-cobrancas-legadas.json`, identificar titular, obrigação e evento de pagamento por documento e referência do provedor. Não preencher workspace por nome, valor ou vínculo de aluno isolado. As duas contas reais não têm chave cifrada de subconta registrada. |
| Saldo GYM | Conferir a origem dos R$ 150,00 da conta interna com extrato/comprovante ou documento de abertura. O inventário não encontrou faturas, recebimentos ou despesas GYM que expliquem esse saldo. Não gerar pagamento ou despesa fictícios para fechá-lo. |
| Asaas controlado | Após disponibilizar conta/chave do ambiente de homologação, conferir cobrança e split, taxas efetivas, pagamento parcial e estorno documentado. Timeout deve conservar revisão e a mesma referência, sem novo POST. Não usar operações reais de clientes como teste. |
| Implantação e jobs | Executar o plano revisado de transição, comparar schema e invariantes, configurar agendas e monitoramento. Guardar recibos e observar recuperação, lease/retry, atrasos, retenção configurada e backlog no ambiente publicado. |
| Acessibilidade humana | Uma pessoa deve percorrer login, convite, cadastro, importação, fatura, caixa, revisão, aceite e privacidade com teclado e leitor de tela. Registrar sistema/leitor/versão, perfil e resultado; confirmar nomes, erros, foco em modal e retorno de foco. Automação Chrome não substitui esse aceite. |
| Representação e documentos | Conferência humana de identidade, maioridade e poderes do responsável; revisão dos textos e hashes exibidos por quem responde pelos documentos. Um aceite de fixture não comprova representação real nem revisão jurídica. |
| Piloto e desempenho | Treinar os perfis em uso, conferir importação/saldos e um fechamento real, definir responsável por incidentes e observar volume/latência. Medições sintéticas locais não estabelecem capacidade da Hostinger nem SLO de produção. |

O usuário não conhece a fonte documental das cobranças antigas. A investigação local foi realizada e não encontrou prova suficiente. Este roteiro registra a dependência, sem repetir uma pergunta que ele já respondeu.

PERSONAL vinculado à academia foi implementado e validado localmente; conferir no host a alternância GYM/PERSONAL, papéis por unidade, agenda por autor, paywall e retorno à academia. Ver [implementação](personal-vinculado-implementacao.md). Turmas, CRM, hardware e gateway GYM permanecem retirados. O financeiro da academia é local/manual.
