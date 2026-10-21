# Entrega técnica e aceites externos — Academias

Atualizado em 13/10/2026. Código finalizado para publicação manual, incluindo PERSONAL vinculado à academia.

A regressão final passou: **262 unitários, 351 integrações PostgreSQL e 79 casos HTTP**. Build com TypeScript, instalação limpa, oito migrations em banco novo e transição legada passaram. Navegador: seis cenários no build de produção, sem erro JavaScript/overflow. Ver [entrega final](entrega-final-manual.md) e [manifesto](verificacoes-entrega-final.json).

O catálogo conserva 65 IDs: **48 corrigidos e verificados**, **13 retirados do escopo** e **quatro aceites externos**. Esses quatro achados não foram fechados com evidência sintética. Não há alegação de implantação ou homologação financeira real.

| Achado | Aceite externo necessário |
|---|---|
| GYM-AUD-029 | Homologação financeira externa em sandbox protegido: split, taxas, pagamento e estorno. Obter vínculo documental das sete cobranças PERSONAL antigas; sem novo POST para resolver timeout. Gateway GYM permanece retirado. |
| GYM-AUD-030 | Conferir documentos das sete cobranças PERSONAL e a origem do saldo GYM de R$ 150,00. O inventário em leitura não encontrou fatos que permitam atribuir esses valores. Financeiro GYM é local/manual. |
| GYM-AUD-046 | Publicação manual pelo usuário: configurar ambiente protegido, executar a transição revisada, repetir o preflight, conferir migrations e instalar scheduler/monitoramento. Fonte e instruções estão prontas; banco configurado não foi migrado. |
| GYM-AUD-050 | Aceites humanos e do ambiente publicado: leitor de tela, identidade/representação/documentos, piloto, treinamento e volume/latência. Verificações locais e navegador não substituem esses aceites. |

PERSONAL vinculado foi [implementado](personal-vinculado-implementacao.md): papéis locais sem promoção global, operação GYM, bloqueio comercial, criação privada com trial/quota próprios, paywall e retorno à academia. O estudo anterior é histórico.

A cadeia tem oito migrations. O ensaio preservou sete cobranças sintéticas, os 36 nomes/checksums históricos e 201 gatilhos. O preflight configurado permanece sem autorização para migrar. Os [guias de implantação](implantacao-manual-hostinger.md) e [homologação](homologacao-manual-quatro.md) acompanham a entrega.

Suspensão interrompe mensalidades; retomada pula vencimentos da pausa, sem retroatividade. Uma matrícula vigente por aluno/academia conserva o vínculo pausado. Encerramento agenda purga em até um mês calendário e preserva contas compartilhadas. Não se inventam recebimentos, saldos ou vínculos.

Turmas, CRM, hardware e gateway GYM permanecem retirados. Financeiro GYM é local/manual. Evidências anteriores de R2, Ably e Resend conservam seus limites: SENT indica aceite do provedor e não comprova entrega. Retenção de payload de webhook continua desabilitada até configuração.

Publicação manual a partir da pasta do projeto, sem ZIP, conforme a escolha do usuário. Não houve migration/backfill no banco configurado, comando financeiro externo, commit ou push.
