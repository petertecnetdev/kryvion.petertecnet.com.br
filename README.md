# Kryvion

Plataforma de inteligência de mercado da Peter Tecnet. O frontend é agnóstico ao tipo de ativo e consome o domínio genérico `market` da API central.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Produção

```bash
npm install
npm run build
```

Variáveis principais: `VITE_API_URL`, `VITE_APP_SLUG=kryvion` e, opcionalmente, `VITE_GOOGLE_CLIENT_ID`. O Client ID do Google também pode ser obtido da configuração pública da API central.
