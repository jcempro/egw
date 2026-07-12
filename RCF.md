# RCF-IF-001 — Índice de Fontes Bibliográficas

## 1. Autoridade, escopo e termos

### 1.1 Autoridade

- `RCF-IF-001` DEVE reger produto, dados públicos, arquitetura observável, interface, build, publicação, automações e validação do Índice de Fontes Bibliográficas.
- `AGENTS.md` e seus cenários DEVEM reger somente a operação de agentes e desenvolvedores; requisitos de produto NÃO DEVEM residir nesses arquivos.
- `RCF-IF-001` DEVE prevalecer sobre documentação descritiva do projeto em requisito de produto; alteração com risco de regressão DEVE preservar o comportamento anterior até confirmação humana explícita.
- Requisito identificado por `RCF-IF-<domínio>-<número>` DEVE possuir a modalidade literal registrada; obrigação, exceção, prioridade e autoridade NÃO DEVEM ser inferidas.

### 1.2 Objetivo e limite

- `RCF-IF-CORE-001` O produto DEVE permitir identificar inequivocamente o artefato usado como referência bibliográfica e verificar a sua integridade criptográfica.
- `RCF-IF-CORE-002` O produto NÃO DEVE hospedar, reproduzir, distribuir, editar ou prometer a disponibilidade de livros de terceiros.
- `RCF-IF-CORE-003` O produto DEVE apresentar apenas metadados, endereços de fonte, hashes, resultados de verificação e explicações necessárias à rastreabilidade.
- `RCF-IF-CORE-004` Cada fonte DEVE representar exatamente o recurso efetivamente usado; uma fonte NÃO DEVE ser interpretada como sinônimo do livro, de sua edição ou de seu hash global.

### 1.3 Termos estáveis

| Termo | Contrato |
| --- | --- |
| Livro | Referência bibliográfica identificada por um `book_id` público e por um único `metadata.json` canônico. |
| Artefato editorial | Arquivo concreto que constitui a referência principal de uma edição e formato determinados. |
| Fonte | Recurso concreto que foi obtido, consultado ou vinculado para a referência; possui URL integral e pode possuir hash próprio. |
| Hash Global | Registro criptográfico oficial de um artefato editorial. |
| Hash da Fonte | Registro criptográfico do arquivo efetivamente obtido por uma fonte; NÃO DEVE substituir Hash Global. |
| Validação | Tentativa cliente de obter a fonte, calcular seu hash e compará-lo ao Hash da Fonte. |
| Estado persistido | Resultado de validação armazenado somente no dispositivo, associado à revisão do metadado e sem autoridade editorial. |
| URL lógica | Caminho público de consulta; NÃO DEVE revelar nem depender da localização física dos dados. |

## 2. Arquitetura pública e publicação

### 2.1 Modelo de hospedagem

- `RCF-IF-ARC-001` O produto DEVE operar como aplicação estática publicada no GitHub Pages.
- `RCF-IF-ARC-002` O produto NÃO DEVE exigir backend, banco SQL, sessão de servidor, API privada, chave secreta no navegador ou serviço de execução permanente.
- `RCF-IF-ARC-003` Toda transformação editorial, geração de índice, validação estrutural e preparação de publicação DEVE ocorrer durante o build; toda consulta e validação remota interativa DEVE ocorrer no navegador.
- `RCF-IF-ARC-004` A indisponibilidade de uma fonte externa NÃO DEVE tornar o produto, o metadado publicado ou os demais resultados indisponíveis.
- `RCF-IF-ARC-005` O produto DEVE permanecer utilizável sob caminho-base de projeto ou domínio próprio do GitHub Pages, sem URL absoluta interna codificada fora da configuração de publicação.

### 2.2 Separação e compatibilidade

- `RCF-IF-ARC-006` Conteúdo editorial, dados canônicos, código de apresentação, resultado de build e estado local de validação DEVEM permanecer logicamente separados.
- `RCF-IF-ARC-007` A estrutura física de dados PODE evoluir sem alterar URL lógica, formato semântico do `metadata.json` ou links públicos já publicados.
- `RCF-IF-ARC-008` Toda mudança incompatível de schema DEVE incrementar `schema_version`, manter leitor compatível com a última versão publicada ou publicar migração integral na mesma entrega.
- `RCF-IF-ARC-009` Dados canônicos e artefatos publicados DEVEM ser imutáveis por revisão publicada; correção DEVE gerar nova revisão rastreável.

### 2.3 Rotas lógicas

- `RCF-IF-ROUTE-001` A página inicial DEVE apresentar finalidade, acesso à consulta de livros, metodologia, instruções de citação, repositório e dados abertos.
- `RCF-IF-ROUTE-002` A URL canônica de livro DEVE ser `<base>/livro/<book_id>/`, onde `book_id` atende a `[a-z0-9]+(?:-[a-z0-9]+)*`.
- `RCF-IF-ROUTE-003` Um caminho lógico de livro DEVE resolver o metadado em localização interna derivada exclusivamente de `book_id`; essa localização NÃO DEVE integrar a URL pública nem ser exposta como contrato de navegação.
- `RCF-IF-ROUTE-004` Fragmento, consulta, barra final e codificação equivalente NÃO DEVEM criar identificadores distintos para o mesmo livro.
- `RCF-IF-ROUTE-005` `book_id` inválido, caminho ambíguo, traversal, barra codificada, metadado ausente ou schema inválido DEVE produzir o estado 404, sem tentativa de resolver caminho alternativo.

## 3. Dados canônicos

### 3.1 Organização

- `RCF-IF-DATA-001` Cada livro DEVE possuir diretório próprio e um único `metadata.json` canônico.
- `RCF-IF-DATA-002` O produto NÃO DEVE concentrar metadados completos de todos os livros em JSON único.
- `RCF-IF-DATA-003` Índice de navegação gerado no build PODE conter somente `book_id`, título, autor principal, URL lógica e campos necessários à listagem; ele NÃO DEVE duplicar fontes, hashes, descrição, edição ou demais metadados do livro.
- `RCF-IF-DATA-004` Campo inferível de forma determinística a partir de outro campo canônico, do caminho, do conteúdo ou da revisão publicada NÃO DEVE ser persistido no `metadata.json`.
- `RCF-IF-DATA-005` Contagem, estado de validação, data da última validação, URL ativa, resumo de verificação e ordenação derivada DEVEM ser calculados, nunca persistidos como verdade editorial.

### 3.2 Contrato de `metadata.json`

- `RCF-IF-DATA-006` `metadata.json` DEVE ser JSON UTF-8 válido, sem comentários, sem chaves duplicadas e compatível com schema publicado.
- `RCF-IF-DATA-007` O objeto raiz DEVE conter somente `schema_version`, `book`, `global_hashes` e `sources`.
- `RCF-IF-DATA-008` `schema_version` DEVE ser inteiro positivo.
- `RCF-IF-DATA-009` `book` DEVE conter `id`, `title`, `contributors`, `edition`, `language` e `cover`; `id` DEVE ser igual ao `book_id` da URL lógica.
- `RCF-IF-DATA-010` `contributors` DEVE ser lista ordenada de objetos com `name` e `role`; o primeiro contribuidor com `role: "author"` DEVE ser tratado como autor principal quando existir.
- `RCF-IF-DATA-011` `edition` DEVE conter somente informação editorial não inferível, incluindo ano quando conhecido; ausência de ano NÃO DEVE ser substituída por estimativa.
- `RCF-IF-DATA-012` `language` DEVE usar etiqueta BCP 47 válida e representar o idioma da edição referenciada.
- `RCF-IF-DATA-013` `cover` DEVE apontar somente recurso estático pertencente ao mesmo livro ou ser `null`; URL externa de capa NÃO DEVE bloquear a consulta do livro.
- `RCF-IF-DATA-014` `global_hashes` DEVE ser lista não vazia de objetos com `label`, `format`, `algorithm` e `value`.
- `RCF-IF-DATA-015` Cada entrada de `global_hashes` DEVE identificar inequivocamente o artefato editorial e seu formato; formatos distintos da mesma edição DEVEM ocupar entradas distintas.
- `RCF-IF-DATA-016` `sources` DEVE ser lista ordenada de objetos com `id`, `title`, `url`, `type` e `hash`; `id` DEVE ser único dentro do livro e obedecer ao mesmo padrão de `book_id`.
- `RCF-IF-DATA-017` `url` DEVE ser URI absoluta e conservar integralmente o endereço do recurso; esquemas aceitos DEVEM limitar-se a `https:`, `http:` e `file:`.
- `RCF-IF-DATA-018` `type` DEVE identificar a natureza editorial ou técnica da fonte, sem inferir autoridade, disponibilidade ou integridade.
- `RCF-IF-DATA-019` `hash` de fonte DEVE ser `null` ou objeto com `algorithm` e `value`; valor não nulo DEVE representar exatamente o arquivo obtido naquela fonte.
- `RCF-IF-DATA-020` Campo adicional no objeto raiz, livro, hash ou fonte NÃO DEVE ser aceito sem versão de schema que o defina.

### 3.3 Hashes

- `RCF-IF-HASH-001` O produto DEVE usar exclusivamente os conceitos `Hash Global` e `Hash da Fonte`; conceito criptográfico paralelo NÃO DEVE ser criado.
- `RCF-IF-HASH-002` SHA-512 DEVE ser o algoritmo padrão para Hash Global e Hash da Fonte novos.
- `RCF-IF-HASH-003` Registro legado ou externamente imposto PODE declarar algoritmo diferente, desde que `algorithm` o identifique literalmente e o cliente informe quando não puder validá-lo.
- `RCF-IF-HASH-004` `value` DEVE usar representação hexadecimal minúscula sem separadores; seu tamanho DEVE corresponder ao algoritmo declarado.
- `RCF-IF-HASH-005` Hash Global DEVE ser a identidade criptográfica oficial do artefato editorial principal; Hash da Fonte NÃO DEVE ser exibido nem usado como sua substituição.
- `RCF-IF-HASH-006` Fonte sem arquivo obtido ou sem hash comparável DEVE permanecer cadastrável; a interface DEVE informar explicitamente que sua integridade não é comparável.

## 4. Consulta, front controller e validação

### 4.1 Front controller

- `RCF-IF-FC-001` `404.html` DEVE atuar como Front Controller universal para URL lógica não resolvida fisicamente pelo GitHub Pages.
- `RCF-IF-FC-002` O Front Controller DEVE extrair, normalizar e validar `book_id` antes de solicitar metadado.
- `RCF-IF-FC-003` Após carregar metadado válido, o cliente DEVE renderizar imediatamente identidade bibliográfica, Hashes Globais, fontes e estrutura de consulta disponíveis.
- `RCF-IF-FC-004` O cliente DEVE restaurar, quando existir, somente o Estado persistido cuja chave contenha `book_id`, revisão do metadado e identidade do hash da fonte.
- `RCF-IF-FC-005` Estado persistido incompatível, corrompido, vencido ou ausente DEVE ser descartado sem afetar a renderização do metadado canônico.
- `RCF-IF-FC-006` Sem livro resolvido, `404.html` DEVE renderizar página 404 completa, elegante, acessível e visualmente coerente com o produto.
- `RCF-IF-FC-007` A página 404 NÃO DEVE carregar analytics, consentimento, cookie, API privada, recurso remoto indispensável ou estado persistido de outro livro.

### 4.2 Ciclo de validação

- `RCF-IF-VAL-001` A validação remota DEVE iniciar após a primeira renderização e NÃO DEVE bloquear conteúdo, navegação, foco, cópia, rolagem ou interação.
- `RCF-IF-VAL-002` Cada fonte elegível DEVE ser validada de forma independente, paralela, cancelável e com concorrência limitada a quatro operações ativas por página.
- `RCF-IF-VAL-003` Validação cancelada, falha ou indisponibilidade de uma fonte NÃO DEVE cancelar, reordenar nem invalidar outra fonte.
- `RCF-IF-VAL-004` O cliente DEVE calcular hash sobre os bytes efetivamente recebidos, usando o algoritmo registrado na fonte, e comparar o resultado sem normalização de conteúdo.
- `RCF-IF-VAL-005` Fonte `file:` e fonte sem hash DEVE ser marcada como não comparável remotamente; o cliente NÃO DEVE simular sucesso nem tentar acesso privilegiado ao dispositivo.
- `RCF-IF-VAL-006` Restrição CORS, redirecionamento não acessível, erro HTTP, falha de rede, timeout, corpo indisponível e algoritmo não suportado DEVEM ser exibidos como resultado técnico específico, nunca como Hash verificado.
- `RCF-IF-VAL-007` Resultado de validação DEVE informar instante local, URL consultada, algoritmo, resultado e causa técnica quando não houver comparação.
- `RCF-IF-VAL-008` O único estado de integridade positiva DEVE ocorrer quando hash calculado for exatamente igual ao Hash da Fonte registrado.
- `RCF-IF-VAL-009` Divergência de hash DEVE receber destaque visual e textual inequívoco; ela NÃO DEVE alterar Hash Global, metadado canônico nem fonte cadastrada.
- `RCF-IF-VAL-010` Estado persistido PODE usar armazenamento local do navegador exclusivamente para resultados de validação; ele NÃO DEVE identificar pessoa, ser transmitido, controlar acesso, constituir analytics ou substituir uma nova validação.

### 4.3 Estados públicos

| Estado | Condição exclusiva |
| --- | --- |
| Aguardando | Fonte elegível sem tentativa ativa nem resultado restaurado. |
| Verificando | Requisição iniciada e não encerrada. |
| Verificado | Bytes recebidos e hash calculado exatamente igual ao Hash da Fonte. |
| Divergente | Bytes recebidos e hash calculado diferente do Hash da Fonte. |
| Disponível sem comparação | Recurso alcançável, mas sem Hash da Fonte comparável. |
| Não comparável | `file:`, algoritmo sem suporte ou condição que impede cálculo local lícito. |
| Indisponível | Recurso não obtido por erro HTTP, rede, CORS, timeout ou corpo inacessível. |
| Cancelado | Usuário, navegação ou ciclo de vida cancelou a tentativa antes de resultado. |

- `RCF-IF-VAL-011` Cada Estado público DEVE usar rótulo textual, ícone e contraste que permaneçam inteligíveis sem cor.
- `RCF-IF-VAL-012` Indicadores agregados DEVEM ser derivados dos Estados públicos atuais; resultado persistido DEVE ser distinguível de resultado da sessão atual.

## 5. Interface pública

### 5.1 Linguagem visual

- `RCF-IF-UX-001` A interface DEVE parecer página pública de documentação técnica, não dashboard, painel administrativo ou suíte de gerenciamento.
- `RCF-IF-UX-002` A composição DEVE ser elegante, profissional, limpa, sóbria, moderna e atemporal, priorizando leitura, consulta e rastreabilidade.
- `RCF-IF-UX-003` A edição de dados NÃO DEVE ser oferecida na interface pública.
- `RCF-IF-UX-004` A tipografia DEVE usar Noto Sans; Google Fonts DEVE atuar somente como fallback carregável, seguido de família sans-serif do sistema.
- `RCF-IF-UX-005` Ícone DEVE possuir significado textual acessível; Font Awesome DEVE integrar somente ícones efetivamente referenciados pela versão publicada.
- `RCF-IF-UX-006` Interface, dados e controles DEVEM adaptar-se ao viewport sem breakpoint contratual, sem perda funcional, overflow não intencional, hierarquia ilegível ou dependência de ponteiro preciso.

### 5.2 Estrutura de página de livro

- `RCF-IF-UX-007` Cabeçalho DEVE conter identidade do Índice de Fontes, navegação semântica para Sobre, Livro, Fontes, Verificações e Como citar, e link explícito ao repositório.
- `RCF-IF-UX-008` A região de identidade do livro DEVE conter capa quando disponível, título, autor principal ou contribuidores, resumo de finalidade, Hash Global copiável e fatos editoriais essenciais.
- `RCF-IF-UX-009` Fatos editoriais DEVEM conter edição, idioma e instante de atualização derivado da revisão publicada; ausência de dado DEVE ser exibida como indisponível, nunca estimada.
- `RCF-IF-UX-010` Indicadores resumidos DEVEM conter fontes cadastradas, fontes alcançáveis na sessão, hashes verificados e atualização; todos DEVEM derivar de metadado ou Estados públicos.
- `RCF-IF-UX-011` A seção Fontes DEVE conter introdução, link direto ao `metadata.json` do livro e tabela ou representação responsiva equivalente.
- `RCF-IF-UX-012` Cada fonte DEVE apresentar, nesta ordem lógica, posição, título, URL integral, tipo, Estado público, Hash da Fonte e último resultado de validação.
- `RCF-IF-UX-013` URL DEVE permanecer integralmente disponível para leitura, cópia e abertura; elipse visual NÃO DEVE ocultar o valor copiado nem o texto acessível.
- `RCF-IF-UX-014` Hash DEVE possuir ação de cópia por teclado e toque, confirmação não intrusiva e alternativa textual quando a cópia falhar.
- `RCF-IF-UX-015` Lista extensa DEVE mostrar subconjunto inicial estável e controle explícito para revelar itens adicionais; ocultação NÃO DEVE alterar contagens nem impedir acesso aos dados.
- `RCF-IF-UX-016` Em largura insuficiente, tabela DEVE preservar todos os campos mediante cartões equivalentes, rolagem horizontal acessível ou ambos; informação NÃO DEVE ser removida.
- `RCF-IF-UX-017` A página DEVE conter seção de verificações com metodologia concisa, seção Como citar, acesso ao repositório e acesso aos dados abertos.
- `RCF-IF-UX-018` Rodapé DEVE identificar o livro quando aplicável, GitHub Pages, dados abertos, transparência, integridade e link ao repositório.

### 5.3 Acessibilidade e falhas

- `RCF-IF-UX-019` HTML DEVE entregar estrutura e conteúdo essencial; CSS/Sass DEVE controlar apresentação e estados; TypeScript DEVE apenas aprimorar consulta, cópia e validação.
- `RCF-IF-UX-020` Todo controle interativo DEVE possuir nome acessível, foco visível, ativação por teclado e toque, ordem de foco coerente e contraste suficiente.
- `RCF-IF-UX-021` Atualização assíncrona de Estado público DEVE ser anunciada de modo não intrusivo e NÃO DEVE deslocar foco nem reordenar fonte lida.
- `RCF-IF-UX-022` Conteúdo decorativo DEVE ser ignorável por tecnologia assistiva; capa DEVE possuir alternativa textual que identifique livro e edição quando a imagem trouxer informação.
- `RCF-IF-UX-023` Movimento, animação e transição DEVEM respeitar preferência de redução de movimento e NÃO DEVEM ocultar conteúdo ou resultado.
- `RCF-IF-UX-024` `404.html` DEVE conter `<noscript>` completo em Português, English e Español, com título, finalidade, explicação da consulta dinâmica, links essenciais e orientação para retorno seguro.
- `RCF-IF-UX-025` O `<noscript>` DEVE permanecer legível, rolável, navegável e visualmente integrado sem depender de JavaScript, fonte externa ou validação remota.

## 6. Build, desempenho e dados abertos

### 6.1 Build

- `RCF-IF-BUILD-001` Código de interface DEVE usar TypeScript e estilos DEVEM usar Sass quando existir pipeline de compilação; enquanto a superfície inicial estiver limitada ao documento único `404.html`, CSS e ECMAScript PODEM integrar esse documento para preservar publicação estática autônoma. O resultado publicado DEVE conter somente JavaScript, CSS, HTML, fontes e assets necessários ao runtime.
- `RCF-IF-BUILD-002` Build DEVE validar schema, referências internas, unicidade de identificadores, integridade sintática, URLs lógicas e links públicos antes de publicar.
- `RCF-IF-BUILD-003` Build DEVE minificar, remover código morto, aplicar tree shaking quando aplicável e excluir dependência, ícone, fonte, dado de desenvolvimento e asset não usados.
- `RCF-IF-BUILD-004` Entradas idênticas DEVEM produzir saídas idênticas, exceto campo explicitamente dependente do instante de publicação; esse campo DEVE ser único, documentado e derivado de fonte controlada.
- `RCF-IF-BUILD-005` Build com metadado inválido, rota duplicada, Hash Global ausente, ID inválido, referência interna ausente ou asset não permitido DEVE falhar antes da publicação.

### 6.2 Desempenho

- `RCF-IF-PERF-001` Consulta inicial DEVE carregar somente shell público, metadado do livro solicitado e assets indispensáveis à primeira renderização.
- `RCF-IF-PERF-002` Índice, imagens, fontes, ícones, validações e dados não essenciais DEVEM ser adiados ou carregados seletivamente quando isso reduzir tempo percebido sem ocultar conteúdo.
- `RCF-IF-PERF-003` Estratégia de indexação DEVE minimizar simultaneamente memória, banda, requisições HTTP e tempo percebido; JSON completo de todos os livros NÃO DEVE ser requisito de consulta.
- `RCF-IF-PERF-004` Falha de fonte, ícone, fonte tipográfica, imagem de capa ou validação remota DEVE degradar para apresentação local legível.
- `RCF-IF-PERF-005` Recursos de terceiros NÃO DEVEM bloquear conteúdo essencial; versão e origem de recurso externo DEVEM ser previsíveis e compatíveis com publicação estática.

### 6.3 Dados abertos

- `RCF-IF-DATA-021` Cada página de livro DEVE oferecer link direto ao seu `metadata.json` canônico.
- `RCF-IF-DATA-022` Dados abertos DEVEM ser auditáveis sem interface JavaScript e sem conta, sessão ou autorização.
- `RCF-IF-DATA-023` O produto DEVE expor somente dados necessários à rastreabilidade; segredo, token, dado pessoal não editorial e credencial NÃO DEVEM integrar metadado ou build publicado.

## 7. Segurança, privacidade e confiabilidade

### 7.1 Segurança

- `RCF-IF-SEC-001` Cliente DEVE tratar `metadata.json`, URL, título, tipo, contribuidores e resultado remoto como dados não confiáveis até validação de schema e codificação de saída.
- `RCF-IF-SEC-002` Conteúdo de metadado e resposta remota DEVE ser inserido como texto; HTML, script, evento, estilo arbitrário e URL executável NÃO DEVEM ser interpretados.
- `RCF-IF-SEC-003` Resolução de livro DEVE rejeitar `..`, barra invertida, NUL, codificação ambígua, segmento vazio e identificador fora do padrão antes de formar caminho interno.
- `RCF-IF-SEC-004` Hash divergente, metadado inválido ou fonte maliciosa NÃO DEVE executar código, alterar dados canônicos, redirecionar automaticamente ou suprimir o diagnóstico.

### 7.2 Privacidade

- `RCF-IF-PRIV-001` O produto NÃO DEVE exigir login, cadastro, cookie, consentimento, analytics, fingerprinting ou perfil para consulta, cópia ou acesso aos dados abertos.
- `RCF-IF-PRIV-002` Validação remota DEVE ocorrer somente por ação explícita ou ciclo automaticamente anunciado; ela DEVE revelar à fonte externa somente a requisição usual do navegador.
- `RCF-IF-PRIV-003` Estado persistido DEVE permanecer no dispositivo, conter somente dados técnicos da validação e possuir expiração compatível com a revisão publicada.
- `RCF-IF-PRIV-004` Falha ou bloqueio de armazenamento local NÃO DEVE impedir a consulta nem a validação da sessão.

### 7.3 Resiliência

- `RCF-IF-REL-001` Interface DEVE exibir conteúdo canônico antes de resultado remoto e manter resultado anterior identificado até substituição por resultado novo.
- `RCF-IF-REL-002` Operação recuperável DEVE possuir identidade determinística, checkpoint persistente e retomada a partir do último efeito confirmado.
- `RCF-IF-REL-003` Retentativa automática DEVE ocorrer somente em falha transitória, possuir limite finito e preservar causa final visível.
- `RCF-IF-REL-004` Operação parcial DEVE preservar efeitos confirmados, registrar itens pendentes e permitir retomada sem duplicar publicação, comentário, label ou dado.

## 8. Workflows e gestão de Issues

### 8.1 Workflows de repositório

- `RCF-IF-WF-001` Cada workflow DEVE possuir responsabilidade única, entrada declarada, saída rastreável, chave idempotente, checkpoint, limite de retentativa e fallback seguro.
- `RCF-IF-WF-002` O workflow de validação editorial DEVE validar dados, rotas, schema, hashes, links internos e build antes de permitir publicação.
- `RCF-IF-WF-003` O workflow de publicação DEVE publicar somente artefato validado, registrar revisão e validar rota inicial, rota de livro e 404 após disponibilidade.
- `RCF-IF-WF-004` O workflow de índice DEVE gerar somente artefatos derivados permitidos e DEVE falhar quando ele divergir do conjunto de `metadata.json` válidos.
- `RCF-IF-WF-005` Workflow interrompido DEVE retomar exatamente após o último checkpoint confirmado; ausência ou corrupção de checkpoint DEVE interromper com diagnóstico, sem reiniciar efeito externo ambíguo.
- `RCF-IF-WF-006` Workflow NÃO DEVE publicar dado parcial, sobrescrever resultado válido, ocultar falha, executar indefinidamente ou exigir intervenção para itens já confirmados.

### 8.2 Issues

- `RCF-IF-ISSUE-001` O projeto DEVE oferecer fluxo automatizado para Issue de correção de metadado, indisponibilidade de fonte, divergência de hash, nova fonte, dúvida metodológica e abuso.
- `RCF-IF-ISSUE-002` Recepção de Issue DEVE preservar corpo original, anexos permitidos, OCR quando houver imagem ou documento, análise textual, classificação, evidência e trilha de decisão.
- `RCF-IF-ISSUE-003` OCR e análise DEVEM conservar conteúdo original e resultado extraído separadamente; extração NÃO DEVE substituir evidência original.
- `RCF-IF-ISSUE-004` Classificação DEVE aplicar label determinística, prioridade e resposta inicial correspondente; confiança insuficiente DEVE encaminhar para revisão humana, sem alterar dados publicados.
- `RCF-IF-ISSUE-005` Resposta automática DEVE informar categoria, evidência recebida, próximo estado e limite do processamento; ela NÃO DEVE afirmar verificação humana inexistente, aceitar alegação sem evidência nem prometer prazo.
- `RCF-IF-ISSUE-006` A automação NÃO DEVE alterar `metadata.json`, Hash Global, Hash da Fonte ou publicação diretamente a partir de Issue; mudança editorial DEVE passar pela validação normal do repositório.
- `RCF-IF-ISSUE-007` Idempotência de Issue DEVE usar identificador da Issue, revisão processada e marcador de etapa; retomada NÃO DEVE duplicar OCR, resposta, label ou comentário confirmado.
- `RCF-IF-ISSUE-008` Falha de OCR, análise, serviço externo ou classificação DEVE preservar a Issue, registrar diagnóstico e aplicar rótulo de fallback seguro para revisão humana.

## 9. Git, documentação e identidade legal

### 9.1 Branches e revisão

- `RCF-IF-GIT-001` `main` DEVE ser a branch principal publicável.
- `RCF-IF-GIT-002` `dev` DEVE ser a branch de desenvolvimento e integração anterior a `main`.
- `RCF-IF-GIT-003` Publicação a partir de `main` DEVE ocorrer somente após validação integral do artefato estático e de suas rotas obrigatórias.
- `RCF-IF-GIT-004` Correção de dado, schema, rota, build, interface, workflow ou política DEVE atualizar documentação contratual e testes aplicáveis na mesma revisão.

### 9.2 Documentação

- `RCF-IF-DOC-001` README DEVE ser ultra sucinto e conter somente resumo do projeto e links para documentação técnica, licença, autor e disclaimer.
- `RCF-IF-DOC-002` Documentação técnica DEVE permanecer separada do README e cobrir schema, metodologia de hash, rotas, validação, publicação, workflows e contribuição.
- `RCF-IF-DOC-003` Interface pública DEVE disponibilizar instrução de citação que diferencie obra referenciada, fonte consultada e índice de rastreabilidade.

### 9.3 Licença e disclaimer

- `RCF-IF-LEGAL-001` Projeto DEVE identificar JeanCarloEM e `https://www.jeancarloem.com` como autor e referência institucional.
- `RCF-IF-LEGAL-002` Projeto DEVE ser licenciado sob MPL-2.0 ou versão posterior compatível.
- `RCF-IF-LEGAL-003` Rodapé e documentação DEVE conter disclaimer sucinto: inexistem vínculo com editoras, responsabilidade pelo conteúdo de terceiros e garantia de disponibilidade futura das fontes.
- `RCF-IF-LEGAL-004` Disclaimer NÃO DEVE ocultar fonte, atribuição, licença, resultado de integridade ou limitação técnica relevante.

## 10. Critérios de aceitação e rastreabilidade

- `RCF-IF-ACC-001` Entrega publicável DEVE validar ao menos página inicial, livro válido, URL lógica desconhecida, `404.html`, metadado inválido, fonte disponível, fonte indisponível, hash verificado, hash divergente, sem hash e sem JavaScript.
- `RCF-IF-ACC-002` Validação visual DEVE comprovar cabeçalho, identidade do livro, indicadores, fontes, verificações, cartões informativos, rodapé, foco, contraste, viewport estreito e viewport amplo.
- `RCF-IF-ACC-003` Validação de dados DEVE comprovar que cada livro possui somente um `metadata.json` canônico, que não há JSON central duplicando livros e que IDs, hashes e rotas são únicos e válidos.
- `RCF-IF-ACC-004` Validação de build DEVE comprovar determinismo, minificação, ausência de código morto detectável, assets seletivos, independência de serviço privado e integridade do artefato estático.
- `RCF-IF-ACC-005` Validação de workflow DEVE comprovar idempotência, checkpoint, retomada, falha segura e ausência de duplicação de efeito externo.
- `RCF-IF-ACC-006` Requisito deste RCF DEVE ser considerado atendido somente quando sua evidência automatizada ou manual reprodutível estiver vinculada à revisão publicada.
