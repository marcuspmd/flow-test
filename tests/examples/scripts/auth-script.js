// Script de teste para verificação de autenticação
console.log('[External Script] Generating auth token...');

const timestamp = Date.now();
const username = variables.username || 'default_user';
const apiKey = variables.api_key || 'default_key';

// Criar assinatura
const message = `${username}:${timestamp}:${apiKey}`;
const signature = crypto.createHash('sha256')
  .update(message)
  .digest('hex');

// Setar variáveis
setVariable('auth_timestamp', timestamp);
setVariable('auth_signature', signature);
setVariable('auth_message', message);

// Configurar headers
request.headers['X-Auth-Timestamp'] = timestamp.toString();
request.headers['X-Auth-Signature'] = signature;
request.headers['X-Auth-User'] = username;

console.log('[External Script] Auth configured successfully');
console.log('[External Script] Timestamp:', timestamp);
console.log('[External Script] Signature:', signature);
