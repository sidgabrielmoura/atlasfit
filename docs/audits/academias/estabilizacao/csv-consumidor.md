# CSV em consumidor nativo — 08/10/2026

O achado 059 passou com exportações reais do serviço `GymAnalyticsService`, contendo dez alunos e faturas exclusivamente sintéticos. O LibreOffice Calc 26.8.1 abriu cada CSV, salvou como planilha ODS, exportou novamente para CSV e reabriu o arquivo salvo. A inspeção dos documentos ODS verificou os valores e tipos das células nos dois momentos.

Nenhuma célula executou fórmula. Foram conferidos os prefixos `=`, `+`, `-`, `@`, caracteres Unicode/controle, telefone, acentos, aspas e ponto e vírgula. O prefixo protetor permaneceu após salvar e reabrir. CR/LF do conteúdo humano podem ser normalizados pelo consumidor; não se trata de formato para intercâmbio binário ou restauração dos dados originais.

A primeira execução revelou perda de centavos ao salvar `90071992547409.93` como número. O exportador agora conserva valores com mais de 15 dígitos significativos como texto explícito. Quantias menores, incluindo um centavo e `123.45`, continuam numéricas. Os arquivos finais mantiveram a precisão na abertura e na reabertura.

O pacote veio do [download oficial do LibreOffice](https://download.documentfoundation.org/libreoffice/stable/26.8.1/win/x86_64/LibreOffice_26.8.1_Win_x86-64.msi); o SHA-256 oficial foi conferido antes da extração administrativa na pasta temporária. Não houve instalação global ou mudança do perfil pessoal do LibreOffice. Os parâmetros seguem a [documentação oficial do filtro CSV](https://help.libreoffice.org/latest/en-US/text/shared/guide/csv_params.html).

O ensaio usa UTF-8, separador `;`, interpretação de fórmulas habilitada e datas ISO importadas explicitamente como texto. Os decimais do CSV original usam inglês dos EUA. O consumidor desta máquina salva números com decimal brasileiro; a reabertura usa português do Brasil. A aprovação se refere a esse consumidor e a esses parâmetros, sem afirmar verificação no Excel ou autodetecção universal de localidade.

O [manifesto](verificacoes-csv-consumidor.json) registra os hashes dos arquivos, seis conversões nativas, quatro inspeções e 264 integrações aprovadas nesse checkpoint. CSVs, ODSs e células inspecionadas estão em `csv-consumidor/`. Não contém dados reais de clientes.
