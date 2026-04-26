function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getIntegrationSecret() {
  return readEnv("INTEGRATIONS_SECRET");
}

export function getPublicAppUrl() {
  return readEnv("PUBLIC_APP_URL");
}

export function getMercadoLivreConfig() {
  return {
    clientId: readEnv("MELI_CLIENT_ID"),
    clientSecret: readEnv("MELI_CLIENT_SECRET"),
    redirectUri: readEnv("MELI_REDIRECT_URI"),
  };
}

export function getMercadoPagoConfig() {
  return {
    clientId: readEnv("MERCADOPAGO_CLIENT_ID"),
    clientSecret: readEnv("MERCADOPAGO_CLIENT_SECRET"),
    redirectUri: readEnv("MERCADOPAGO_REDIRECT_URI"),
  };
}

export function getIntegrationEnvStatus() {
  const meli = getMercadoLivreConfig();
  const mp = getMercadoPagoConfig();

  return {
    publicAppUrl: Boolean(getPublicAppUrl()),
    integrationSecret: Boolean(getIntegrationSecret()),
    mercadoLivre: Boolean(meli.clientId && meli.clientSecret && meli.redirectUri),
    mercadoPago: Boolean(mp.clientId && mp.clientSecret && mp.redirectUri),
  };
}
