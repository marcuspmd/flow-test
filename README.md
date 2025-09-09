# API Flow test - Motor de Testes de API em TypeScript

Um motor de testes de API leve e configurável, construído com TypeScript e Node.js. Permite a criação de fluxos de teste complexos de forma declarativa usando arquivos YAML, facilitando a automação e a manutenção de testes de integração.

#### ✨ Funcionalidades Principais
Testes Declarativos: Escreva seus testes em arquivos .yaml simples e legíveis.

- Fluxos de Teste (Chaining): Capture valores de uma resposta de API (como tokens de autenticação ou IDs) e use-os em requisições subsequentes.

- Variáveis de Ambiente: Defina variáveis globais ou por ambiente para reutilizar dados e facilitar a execução em diferentes estágios (desenvolvimento, homologação, produção).

- Asserções Simples: Valide os resultados das suas chamadas de API, como o status_code da resposta.

- Extensível: Por ser um projeto em TypeScript, novas funcionalidades e asserções podem ser adicionadas facilmente.

#### 🚀 Começando
Siga os passos abaixo para configurar e executar o projeto em sua máquina local.

Pré-requisitos
Node.js (versão 18.x ou superior)

npm (geralmente instalado com o Node.js)

1. Instalação
Clone o repositório e instale as dependências do projeto:

# Clone este repositório
git clone [https://github.com/marcuspmd/flow-test.git](https://github.com/marcuspmd/flow-test.git)

# Navegue até o diretório do projeto
cd flow-test

# Instale as dependências
npm install

2. Execução dos Testes
Para executar uma suíte de testes, utilize o comando npm start, passando o caminho do arquivo de teste como argumento. Se nenhum arquivo for especificado, ele procurará por test-suite.yaml na raiz do projeto.

# Executa o arquivo padrão (test-suite.yaml)
npm start

# Executa um arquivo de teste específico
npm start meu-outro-teste.yaml

⚙️ Como Funciona: O Arquivo test-suite.yaml
A principal característica deste motor é a sua configuração via YAML. A estrutura do arquivo de teste é a seguinte:

# Nome descritivo da suíte de testes.
suite_name: "Fluxo de Autenticação e Perfil de Usuário"

# (Opcional) URL base para todas as requisições.
base_url: "[https://api.meusistema.com/v1](https://api.meusistema.com/v1)"

# (Opcional) Bloco para definir variáveis globais.
variables:
  user_email: "teste@exemplo.com"
  user_pass: "senhaSuperSegura"

# Lista ordenada de etapas que compõem o fluxo de teste.
steps:
  # Cada item na lista é uma etapa de teste.
  - name: "Realizar login para obter token JWT"
    request:
      method: POST
      url: "/auth/login" # Será concatenado com a base_url
      headers:
        Content-Type: "application/json"
      body:
        email: "{{user_email}}" # Injeta o valor da variável
        password: "{{user_pass}}"

    # (Opcional) Validações a serem feitas na resposta.
    assert:
      status_code: 200

    # (Opcional) Captura valores da resposta para usar em etapas futuras.
    capture:
      # A variável 'authToken' receberá o valor do campo 'token' no corpo da resposta.
      authToken: "body.token"

  - name: "Buscar dados do perfil do usuário"
    request:
      method: GET
      url: "/users/me"
      headers:
        # Usa a variável capturada na etapa anterior
        Authorization: "Bearer {{authToken}}"
    assert:
      status_code: 200

Detalhes da Estrutura
suite_name (Obrigatório): O nome da sua suíte de testes.

base_url (Opcional): Uma URL base que será prefixada em todas as URLs de requisição que começam com /.

variables (Opcional): Um dicionário de variáveis que podem ser injetadas em qualquer parte da requisição usando a sintaxe {{nome_da_variavel}}.

steps (Obrigatório): Uma lista de etapas de teste a serem executadas em sequência.

name: Nome descritivo da etapa.

request: Define os detalhes da requisição HTTP.

method: GET, POST, PUT, DELETE, PATCH.

url: O caminho do endpoint.

headers: Cabeçalhos da requisição.

body: Corpo da requisição (para POST, PUT, PATCH).

assert: Define as regras para validar a resposta. Atualmente, suporta status_code.

capture: Define quais dados da resposta devem ser salvos em novas variáveis. A sintaxe body.campo.subcampo usa jmespath para navegar no corpo JSON da resposta.

🗺️ Roadmap (Futuras Funcionalidades)
[ ] Suporte a mais tipos de asserções (ex: contains, isNumber, validação de schema).

[ ] Geração de relatórios de teste (HTML, JUnit).

[ ] Melhorias na CLI (ex: flags --verbose, --env).

[ ] Carregamento de variáveis de arquivos .env.

[ ] Testes orientados a dados (Data-Driven Testing) com arquivos CSV.

🤝 Contribuições
Contribuições são bem-vindas! Se você tiver uma ideia para uma nova funcionalidade ou encontrar um bug, sinta-se à vontade para abrir uma Issue ou enviar um Pull Request.

📄 Licença
Este projeto está licenciado sob a Licença MIT. Veja o arquivo LICENSE para mais detalhes.