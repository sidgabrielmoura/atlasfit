# Agregação de armazenamento — 08/10/2026

A quota PERSONAL soma tamanhos e quantidade de arquivos no PostgreSQL, em duas agregações para o conjunto de assessorias. Antes, carregava cada arquivo/foto e repetia duas consultas por workspace. O contrato de retorno e o conjunto de vínculos PERSONAL permanecem os mesmos; documentos GYM não entram no cálculo.

Uma falha na agregação propaga o erro. Ela não é mais ignorada para continuar com um consumo parcial ou zero e liberar upload. Totais fora do intervalo inteiro seguro também são rejeitados.

O lote PostgreSQL verificou 2.400 arquivos, fotos, tamanhos nulos e documentos de outro titular/GYM. Confirmou totais por workspace e titular. Uma falha de leitura injetada confirmou que a quota não libera upload nem cria aviso de sucesso. Os testes de autoridade e isolamento existentes passaram juntos: 24 casos.

Isso é uma conclusão parcial do achado 052. A listagem administrativa ainda percorre titulares e precisa de paginação/agregação global. Catálogos, indicadores, reservas concorrentes PERSONAL e medições com volume real continuam pendentes. Os tamanhos deste ensaio são metadados sintéticos no banco descartável; não são uma nova homologação R2.

O manifesto e os resultados arquivados ficam em `verificacoes-storage-agregacao.json`.
