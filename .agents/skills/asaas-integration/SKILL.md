---
name: asaas-integration
description: Guia de integração oficial do Asaas MCP Server (https://docs.asaas.com/mcp) e API v3 para subcontas, split de pagamentos, transferências Pix e webhooks no AtlasFit.
---

# Asaas Integration & MCP Server Guide

Este skill orienta a integração com a API v3 do Asaas e a utilização do servidor **MCP oficial do Asaas** (`https://docs.asaas.com/mcp`).

---

## 1. Servidor MCP Oficial do Asaas

O Asaas disponibiliza um servidor MCP oficial com acesso à documentação de mais de 120 endpoints da API v3:

- **Endpoint SSE/MCP**: `https://docs.asaas.com/mcp`
- **Configuração no Projeto**: Arquivos `.mcp.json` e `mcp.json` na raiz da aplicação.

```json
{
  "mcpServers": {
    "asaas": {
      "url": "https://docs.asaas.com/mcp"
    }
  }
}
```

> [!CAUTION]
> **Segurança com Chaves de API**: NUNCA envie sua chave de API diretamente em prompts de chat ou repositórios públicos. Utilize variáveis de ambiente protegidas (`ASAAS_API_KEY`) no arquivo `.env.local`.

---

## 2. Endpoints Principais da API v3 (Asaas)

### Base URLs:
- **Sandbox (Testes)**: `https://sandbox.asaas.com/api/v3`
- **Produção**: `https://www.asaas.com/api/v3`

### Autenticação:
```http
access_token: $YOUR_ASAAS_API_KEY
User-Agent: AtlasFit/1.0
Content-Type: application/json
```

---

## 3. Padrões de Implementação para a AtlasFit Wallet

### A. Criação de Subcontas (`POST /v3/accounts`)
Cria a subconta bancária para o Personal Trainer receber pagamentos dos seus alunos.

```json
{
  "name": "João Personal Trainer",
  "email": "joao@exemplo.com",
  "cpfCnpj": "12345678909",
  "mobilePhone": "11999998888",
  "postalCode": "01310100",
  "address": "Av Paulista",
  "addressNumber": "1000",
  "province": "Bela Vista",
  "companyType": "INDIVIDUAL"
}
```

---

### B. Criação de Cobranças com Split (`POST /v3/payments`)
Gera a cobrança para o aluno (PIX, Cartão ou Boleto) com divisão automática de comissão para a carteira master do AtlasFit.

```json
{
  "customer": "cus_0000058291",
  "billingType": "PIX",
  "value": 150.00,
  "dueDate": "2026-08-15",
  "description": "Consultoria Mensal de Treino - AtlasFit",
  "split": [
    {
      "walletId": "wallet_master_atlasfit",
      "fixedValue": 1.00,
      "percentualValue": 3.5
    }
  ]
}
```

---

### C. Saque PIX / Transferência (`POST /v3/transfers`)
Solicita a transferência do saldo disponível da subconta para a chave PIX de titularidade do personal.

```json
{
  "value": 200.00,
  "pixAddressKey": "12345678909",
  "pixAddressKeyType": "CPF"
}
```

---

### D. Validação de Webhook (`/api/webhooks/asaas/route.ts`)
Validar o cabeçalho `asaas-access-token` retornado no webhook contra a variável `ASAAS_WEBHOOK_SECRET`.
