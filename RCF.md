# RCF-IF-001 — Índice de Fontes Bibliográficas

## 1. Autoridade, escopo e termos

### 1.1 Autoridade

- `RCF-IF-001` DEVE reger produto, dados públicos, arquitetura observável, interface, build, publicação, automações e validação do Índice de Fontes Bibliográficas.
- `AGENTS.md` e seus cenários DEVEM reger a operação de agentes, desenvolvedores e a organização arquitetural do processo; este RCF NÃO DEVE contrariar sua precedência, inclusive quanto à separação entre root de repositório, fonte da aplicação e artefato publicado.
- `RCF-IF-001` DEVE prevalecer sobre documentação descritiva do projeto em requisito de produto; alteração com risco de regressão DEVE preservar o comportamento anterior até confirmação humana explícita.
- Requisito identificado por `RCF-IF-<domínio>-<número>` DEVE possuir a modalidade literal registrada; obrigação, exceção, prioridade e autoridade NÃO DEVEM ser inferidas.

### 1.2 Objetivo e limite

- `RCF-IF-CORE-001` O produto DEVE permitir identificar inequivocamente o artefato usado como referência bibliográfica e verificar a sua integridade criptográfica.
- `RCF-IF-CORE-002` O produto NÃO DEVE editar nem prometer a disponibilidade de livros de terceiros. Artefato fornecido pelo responsável pelo acervo privado, com origem verificável, DEVE ser preservado como asset público do respectivo Livro e integrar também seu pacote compacto canônico, sempre sujeito a atribuição, licença e restrição aplicáveis.
- `RCF-IF-CORE-003` O produto DEVE apresentar apenas metadados, endereços de fonte, hashes, resultados de verificação e explicações necessárias à rastreabilidade.
- `RCF-IF-CORE-004` Cada fonte DEVE representar exatamente o recurso efetivamente usado; uma fonte NÃO DEVE ser interpretada como sinônimo do livro, de sua edição ou de seu hash global.
- `RCF-IF-CORE-005` Inserção, atualização, sincronização ou manutenção de PDF, EPUB ou URL DEVE tentar localizar fontes equivalentes adicionais somente entre provedores confiáveis configurados; candidato divergente NÃO DEVE integrar dados canônicos, assets ou fontes publicadas.

### 1.3 Termos estáveis

| Termo                      | Contrato                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Livro                      | Referência bibliográfica identificada por um `book_id` público e por um único `metadata.json` canônico.                                               |
| Artefato editorial         | Arquivo concreto que constitui a referência principal de uma edição e formato determinados.                                                           |
| Fonte                      | Site ou domínio que armazena e entrega diretamente o arquivo apontado pela URL pública exibida; NÃO É sinônimo de Provedor.                           |
| Provedor                   | Entidade ou site que gerou, produziu ou publicou originalmente o artefato redistribuído; PODE coincidir com a Fonte, sem autorizar duplicação visual. |
| Hash Global                | Matriz SHA-1/SHA-256/SHA-512 calculada exclusivamente sobre os bytes originais de um PDF ou EPUB editorial.                                           |
| Hash da Fonte              | Matriz calculada sobre os bytes efetivamente entregues por uma URL, qualquer que seja seu invólucro; NÃO DEVE substituir Hash Global.                 |
| Validação                  | Tentativa cliente de obter a fonte, calcular sua matriz de hashes e compará-la ao Hash da Fonte.                                                      |
| Estado persistido          | Resultado de validação armazenado somente no dispositivo, associado à revisão do metadado e sem autoridade editorial.                                 |
| URL canônica               | Caminho público principal do Livro, coincidente com seu diretório atômico sob `/d/`.                                                                  |
| URL curta                  | Alias case-sensitive sob `/`, resolvido por mapa estático para uma única URL canônica.                                                                |
| Domínio curto              | Domínio público configurado para URLs curtas absolutas, inicialmente `f.jcem.pro`, usado para QR Code, exibição e documentação operacional.           |
| Acervo de entrada          | Diretório privado ignorado pelo Git, usado exclusivamente pelo build editorial e nunca servido diretamente.                                           |
| Asset preservado           | Cópia publicada, identificada por hash, de artefato aceito no Acervo de entrada; preserva sua origem remota no metadado.                              |
| Root do repositório        | Diretório de governança, automação transversal, documentação e configuração do projeto; NÃO É root da aplicação nem do artefato publicado.            |
| Root da aplicação          | Raiz conceitual percebida no domínio `/`; no fonte, é espelhada por `src/`; no resultado, é materializada por `dist/`.                                |
| Root do artefato publicado | Diretório `dist/`, único conteúdo elegível à publicação estática; sua estrutura interna DEVE corresponder ao domínio `/`.                             |

## 2. Arquitetura pública e publicação

### 2.1 Modelo de hospedagem

- `RCF-IF-ARC-001` O produto DEVE operar como aplicação estática publicada no GitHub Pages.
- `RCF-IF-ARC-002` O produto NÃO DEVE exigir backend, banco SQL, sessão de servidor, API privada, chave secreta no navegador ou serviço de execução permanente.
- `RCF-IF-ARC-003` Toda transformação editorial, geração de índice, validação estrutural e preparação de publicação DEVE ocorrer durante o build; toda consulta e validação remota interativa DEVE ocorrer no navegador.
- `RCF-IF-ARC-004` A indisponibilidade de uma fonte externa NÃO DEVE tornar o produto, o metadado publicado ou os demais resultados indisponíveis.
- `RCF-IF-ARC-005` O produto DEVE permanecer utilizável sob caminho-base de projeto ou domínio próprio do GitHub Pages, sem URL absoluta interna codificada fora da configuração de publicação.

### 2.2 Separação e compatibilidade

- `RCF-IF-ARC-006` Conteúdo editorial, dados canônicos, código de apresentação, resultado de build e estado local de validação DEVEM permanecer logicamente separados.
- `RCF-IF-ARC-007` Estrutura interna de fonte e build PODE evoluir sem alterar URL canônica, formato semântico do `metadata.json` ou links publicados. Alteração da árvore pública `/d/` DEVE ser tratada como migração incompatível, preservar aliases anteriores e cumprir `RCF-IF-ARC-008`.
- `RCF-IF-ARC-008` Toda mudança incompatível de schema DEVE incrementar `schema_version`, manter leitor compatível com a última versão publicada ou publicar migração integral na mesma entrega.
- `RCF-IF-ARC-009` Dados canônicos e artefatos publicados DEVEM ser imutáveis por revisão publicada; correção DEVE gerar nova revisão rastreável.
- `RCF-IF-ARC-010` O root do repositório, o root da aplicação e o root do artefato publicado DEVEM permanecer distintos: implementação e recursos específicos da aplicação DEVEM residir sob `src/`; `dist/` DEVE conter exclusivamente a cópia estática publicável dessa árvore; caminhos públicos DEVEM ser avaliados contra `dist/`, nunca contra o root do repositório.
- `RCF-IF-ARC-011` Root do repositório PODE conter somente governança, documentação, manifesto, lockfile, scripts globais, automações reutilizáveis e infraestrutura transversal; código, HTML, dados, assets, configuração específica e acervo de entrada da aplicação NÃO DEVEM permanecer nele sem exigência técnica superior documentada.
- `RCF-IF-ARC-012` A construção DEVE espelhar a raiz pública: `src/404.html`, `src/assets/` e `src/d/` DEVEM resultar respectivamente em `dist/404.html`, `dist/assets/` e `dist/d/`; insumo privado `src/egw/` DEVE somente alimentar a geração validada de `src/d/` ou projeção equivalente, nunca integrar `dist/` por cópia direta. Nenhuma URL publicada DEVE expor o prefixo `src/`.
- `RCF-IF-ARC-013` `dist/index.html` DEVE ser derivado exclusivamente de `src/404.html`, sem segunda implementação da interface, para disponibilizar a página inicial em `/` e o mesmo Front Controller em `404.html`.

### 2.3 Rotas lógicas

- `RCF-IF-ROUTE-001` A página inicial DEVE apresentar finalidade, acesso à consulta de livros, metodologia, instruções de citação, repositório e dados abertos.
- `RCF-IF-ROUTE-002` A URL canônica e o diretório público de Livro DEVEM coincidir em `<base>/d/<idioma>/<categoria>/<palavra_1>/<palavra_2>/<resto>/` para título com duas ou mais palavras e em `<base>/d/<idioma>/<categoria>/<palavra_1>/<resto_do_identificador>/` para título com uma palavra. A raiz pública de dados DEVE ser literalmente `/d/`.
- `RCF-IF-ROUTE-003` `idioma` DEVE ser derivado da etiqueta BCP 47 da edição, normalizado em minúsculas; `categoria` DEVE ser a categoria ou tag primária explícita; ambos DEVEM ocupar segmentos próprios e NÃO DEVEM compor nome de Livro, arquivo ou asset.
- `RCF-IF-ROUTE-004` Fragmento, consulta, barra final e codificação equivalente NÃO DEVEM criar identificadores distintos para o mesmo livro.
- `RCF-IF-ROUTE-005` Segmento inválido, caminho ambíguo, traversal, barra codificada, metadado ausente ou schema inválido DEVE produzir o estado 404, sem tentativa de resolver caminho alternativo.
- `RCF-IF-ROUTE-006` Cada segmento editorial DEVE usar somente `a-z`, `0-9` e `-`, resultar de normalização Unicode, remoção de diacríticos, minúsculas e colapso de separadores. `palavra_1` e `palavra_2` DEVEM corresponder às duas primeiras palavras normalizadas; `resto` DEVE conter as palavras remanescentes. Quando o resto for vazio, o segmento final DEVE usar o `book_id` estável; em título de uma palavra, `resto_do_identificador` DEVE usar o `book_id`, impedindo segmento vazio e colisão silenciosa.
- `RCF-IF-ROUTE-007` Cada Livro DEVE possuir também URL curta case-sensitive `<base>/<token>`, onde `token` atende a `[A-Za-z0-9_-]+`; a URL curta DEVE resolver somente para a URL canônica registrada e NÃO DEVE tornar-se segunda localização física dos dados.
- `RCF-IF-ROUTE-008` URL pública previamente publicada DEVE permanecer resolvível por mapa de migração ou redirecionamento para a nova URL canônica. Migração NÃO DEVE reutilizar rota, token ou identificador histórico para outro Livro.
- `RCF-IF-ROUTE-009` URL curta operacional nova DEVE usar exclusivamente `https://<dominio-curto>/<token>` e NÃO DEVE depender funcionalmente do segmento `/_/`. Rota `/_/<token>` PODE permanecer somente como rota legada registrada para compatibilidade histórica, sem ser usada por geração, busca, QR Code, exibição, canonicalização ou documentação operacional corrente.

### 2.4 Configuração pública central

- `RCF-IF-CONFIG-001` Configuração pública do build e da interface DEVE residir em `src/config/build.json` ou derivado determinístico dele, com schema versionado e nomes inequívocos para `public_origin`, `short_url_origin`, parâmetros de busca e parâmetros de QR Code.
- `RCF-IF-CONFIG-002` `short_url_origin` DEVE ser URL HTTPS absoluta sem caminho, consulta ou fragmento; o valor inicial DEVE ser `https://f.jcem.pro`. Gerador, cliente, validação, testes e documentação NÃO DEVEM redefinir esse domínio em constantes paralelas.
- `RCF-IF-CONFIG-003` Parâmetros de busca DEVEM declarar no mínimo quantidade mínima de caracteres pesquisáveis para submissão explícita e quantidade de resultados por página na desambiguação. Parâmetros de QR Code DEVEM declarar nome do asset, nível de correção de erros, margem silenciosa, escala/dimensão, cores e versão lógica do gerador.

## 3. Dados canônicos

### 3.1 Organização

- `RCF-IF-DATA-001` Cada Livro DEVE possuir exatamente um diretório canônico sob `/d/` e um único `metadata.json`; capa, contêineres compactos e demais assets públicos exclusivos do Livro DEVEM coexistir nesse mesmo diretório físico e URL, sem árvore paralela ou duplicação por tipo de asset. PDF e EPUB crus DEVEM permanecer somente nos insumos privados sob `src/` e NUNCA integrar a raiz publicada.
- `RCF-IF-DATA-002` O produto NÃO DEVE concentrar metadados completos de todos os livros em JSON único.
- `RCF-IF-DATA-003` Índice de busca gerado no build DEVE conter, por Livro, somente o título editorial e uma referência compacta de roteamento. `book_id`, autor, idioma, categoria, tags, edição, fontes, hashes, descrição, URL canônica e qualquer outro metadado NÃO DEVEM integrá-lo; o metadado completo DEVE ser carregado somente após a seleção do resultado.
- `RCF-IF-DATA-004` Campo inferível de forma determinística a partir de outro campo canônico, do caminho, do conteúdo ou da revisão publicada NÃO DEVE ser persistido no `metadata.json`.
- `RCF-IF-DATA-005` Contagem, estado de validação, data da última validação, URL ativa, resumo de verificação e ordenação derivada DEVEM ser calculados, nunca persistidos como verdade editorial.
- `RCF-IF-DATA-026` A árvore canônica DEVE seguir integralmente `RCF-IF-ROUTE-002` e ser derivável de idioma, categoria primária, título e `book_id`; categoria secundária e tag adicional DEVEM permanecer metadados e NÃO DEVEM criar cópia do Livro em outra pasta.
- `RCF-IF-DATA-027` Título editorial DEVE permanecer íntegro em `metadata.json`; a decomposição em segmentos existe somente para roteamento e NÃO DEVE alterar nem abreviar sua identidade. Qualificador de edição, versão, adaptação ou extensão, inclusive `condensado`, DEVE ser separado deterministicamente do título principal para apresentação secundária, preservado em `edition.qualifier` e mantido no título editorial usado por rota e busca para compatibilidade.
- `RCF-IF-DATA-028` `/d/_index/` PODE conter somente manifestos, fragmentos mínimos de busca e mapas de roteamento gerados. Asset exclusivo de Livro NÃO DEVE existir nessa área nem fora do diretório canônico do Livro.
- `RCF-IF-DATA-029` `metadata.json` schema 5 DEVE conter identificador estável, metadados editoriais, idioma, categoria primária, tags, token curto, assets, fontes e hashes; toda referência local DEVE ser relativa ao próprio diretório do Livro.
- `RCF-IF-DATA-030` `/d/_index/manifest.json` DEVE declarar versão, estratégia de fragmentação, quantidade, tamanho, caminho e SHA-256 de cada fragmento de busca e do mapa de URLs curtas. Índice global NÃO DEVE duplicar metadados completos nem ser a única forma de localizar Livro.

### 3.1.1 Assets, pacotes e capas públicos

- `RCF-IF-PKG-001` Cada PDF ou EPUB aceito DEVE ser publicado somente dentro de contêiner `.7z` próprio, no diretório canônico do Livro, usando LZMA2 no nível máximo disponível. Um pacote compacto adicional com todos os formatos PODE existir, mas PDF, EPUB, ZIP ou outro invólucro de livro cru NÃO DEVE ser armazenado, disponibilizado nem apontado na raiz publicada.
- `RCF-IF-PKG-002` Contêineres, capa e `metadata.json` DEVEM usar nomes portáteis, determinísticos e únicos dentro do Livro. Cada contêiner de formato DEVE possuir exatamente um `source.pdf` ou `source.epub` byte a byte equivalente ao Hash Global correspondente e NÃO DEVE conter caminho absoluto, temporário, cache, credencial ou conteúdo de outro Livro.
- `RCF-IF-PKG-003` A geração DEVE registrar Hash da Fonte SHA-1, SHA-256 e SHA-512, tamanho original, tamanho final, taxa de redução, método e teste de integridade do pacote. Pacote vazio, corrompido, divergente ou com entrada inesperada DEVE bloquear a publicação.
- `RCF-IF-PKG-004` A capa pública DEVE ser `./cover.png`, otimizada para navegador, responsiva e regenerável a partir da capa EPUB ou da primeira página PDF adequada; metadado desnecessário e PNG intermediário NÃO DEVEM integrar `dist/`.
- `RCF-IF-PKG-005` O build DEVE medir a árvore real: densidade por idioma, categoria e palavras iniciais, comprimento de caminho, tamanho publicado, maior arquivo e total de entradas. Limite configurado de hospedagem, repositório ou executor DEVE falhar antes do deploy.

### 3.2 Contrato de `metadata.json`

- `RCF-IF-DATA-006` `metadata.json` DEVE ser JSON UTF-8 válido, sem comentários, sem chaves duplicadas e compatível com schema publicado.
- `RCF-IF-DATA-007` Em schema 5, o objeto raiz DEVE conter somente `schema_version`, `book`, `short_token`, `global_hashes`, `assets` e `sources`.
- `RCF-IF-DATA-008` `schema_version` DEVE ser o inteiro `5`; leitor e migração DEVEM cumprir `RCF-IF-ARC-008` para schemas publicados anteriormente.
- `RCF-IF-DATA-009` `book` DEVE conter `id`, `title`, `contributors`, `edition`, `language`, `primary_category` e `tags`; `id` DEVE atender a `[a-z0-9]+(?:-[a-z0-9]+)*` e permanecer estável quando caminho ou token mudar.
- `RCF-IF-DATA-010` `contributors` DEVE ser lista ordenada de objetos com `name` e `role`; o primeiro contribuidor com `role: "author"` DEVE ser tratado como autor principal. Importação ou atualização DEVE extrair autoria editorial do pacote EPUB, página de rosto, colofão e primeiras páginas textuais do PDF por múltiplas evidências normalizadas; ausência, conflito ou baixa confiança DEVE falhar com diagnóstico e checkpoint, nunca publicar autoria vazia nem inventar pessoa.
- `RCF-IF-DATA-011` `edition` DEVE conter somente informação editorial não inferível, incluindo ano quando conhecido; ausência de ano NÃO DEVE ser substituída por estimativa.
- `RCF-IF-DATA-012` `language` DEVE usar etiqueta BCP 47 válida e representar o idioma da edição referenciada.
- `RCF-IF-DATA-013` `primary_category` DEVE conter exatamente um slug semântico; `tags` DEVE ser lista ordenada de slugs adicionais, sem repetir a categoria. Categoria e tags NÃO DEVEM ser inferidas do nome de arquivo.
- `RCF-IF-DATA-014` `short_token` DEVE conter o token case-sensitive estável registrado no índice central e atender a `RCF-IF-ROUTE-007`.
- `RCF-IF-DATA-015` `global_hashes` DEVE ser lista não vazia de objetos com `artifact_id`, `format`, `sha1`, `sha256` e `sha512`; cada entrada DEVE corresponder a exatamente um PDF ou EPUB editorial e nenhum pacote, capa ou outro invólucro DEVE integrá-la.
- `RCF-IF-DATA-016` `assets` DEVE ser lista não vazia de objetos com `id`, `format`, `url`, `size`, `source_hashes` e `origin_url`; capa, QR Code SVG, pacote agregado quando houver e cada contêiner `.7z` de PDF ou EPUB aceito DEVEM ocupar entradas próprias. `format` identifica o invólucro servido e `source_hashes` contém SHA-1, SHA-256 e SHA-512 de seus bytes, nunca do conteúdo descompactado.
- `RCF-IF-DATA-017` `url` de asset DEVE ser caminho relativo ao diretório do Livro, sem segmento vazio, `.` ou `..`. `origin_url` DEVE ser URI HTTP(S) absoluta quando conhecida ou `null` para proveniência local explicitamente registrada; nenhuma URL local DEVE apontar para fora do diretório canônico do Livro.
- `RCF-IF-DATA-018` `type` DEVE identificar a natureza editorial ou técnica da fonte, sem inferir autoridade, disponibilidade ou integridade.
- `RCF-IF-DATA-019` `sources` DEVE ser lista ordenada de objetos com `id`, `title`, `url`, `type`, `format`, `provider`, `asset_id` e `hashes`; `id` DEVE ser único no Livro, `title` DEVE identificar somente a fonte armazenadora sem repetir o título do Livro, `url` DEVE conservar integralmente o endereço HTTP(S), `format` DEVE identificar o formato de leitura contido e `hashes` DEVE ser `null` ou conter SHA-1, SHA-256 e SHA-512 dos bytes remotos. `asset_id` DEVE referenciar o contêiner local que preserva esse conteúdo quando houver.
- `RCF-IF-DATA-020` Campo adicional no objeto raiz, livro, hash ou fonte NÃO DEVE ser aceito sem versão de schema que o defina.
- `RCF-IF-DATA-021` O Acervo de entrada DEVE residir em `src/egw/`, permanecer ignorado pelo Git e conter artefatos `.pdf` e/ou `.epub`. Artefato com origem remota conhecida DEVE possuir registro correspondente no manifesto lateral `<título>.source.json`, com URL de origem e SHA-256 esperado; o manifesto PODE cobrir somente parte dos formatos preservados no grupo.
- `RCF-IF-DATA-022` PDF e EPUB associados ao mesmo manifesto lateral DEVEM constituir um único Livro e um único `metadata.json`; cada formato DEVE permanecer uma Fonte e um Hash Global distintos. Artefato sem manifesto lateral DEVE constituir somente um Livro de formato único, com proveniência local explícita no relatório. Agrupamento entre grupos distintos sem manifesto comum e identidade textual comprovada DEVE falhar, sem criar livro duplicado.
- `RCF-IF-DATA-023` Todo asset preservado DEVE ser copiado por escrita atômica, ter tamanho e Hash da Fonte recalculados após a cópia e ser comparado ao hash de entrada registrado no manifesto quando existir. PDF e EPUB DEVEM adicionalmente gerar sua matriz Hash Global; divergência DEVE impedir a publicação do Livro.
- `RCF-IF-DATA-024` A entrada de capa em `assets` DEVE apontar para `./cover.png`. A imagem DEVE representar capa extraída do EPUB ou, sem capa utilizável, a primeira página adequada do PDF; ausência de ambos DEVE falhar a geração do grupo.
- `RCF-IF-DATA-025` Fonte equivalente adicional DEVE possuir URL HTTP(S), provedor confiável e Hash da Fonte calculado sobre o invólucro entregue. Equivalência DEVE ser comprovada por igualdade byte a byte com asset aceito ou, para invólucro distinto, pela extração segura e correspondência integral dos Hashes Globais PDF/EPUB contidos; candidato sem comprovação ou com qualquer divergência DEVE constar somente no relatório de manutenção, nunca em `metadata.json`.

### 3.3 Hashes

- `RCF-IF-HASH-001` O produto DEVE usar exclusivamente os conceitos `Hash Global` e `Hash da Fonte`; conceito criptográfico paralelo NÃO DEVE ser criado.
- `RCF-IF-HASH-002` Cada PDF e EPUB DEVE possuir simultaneamente Hash Global SHA-1, SHA-256 e SHA-512 calculado sobre seus próprios bytes, fora de ZIP, 7Z ou outro invólucro. SHA-1 existe somente para interoperabilidade e NÃO DEVE, isoladamente, comprovar integridade ou equivalência.
- `RCF-IF-HASH-003` Quando os bytes forem obtidos, Hash da Fonte DEVE conter SHA-1, SHA-256 e SHA-512 calculados sobre o arquivo efetivamente baixado do link: PDF, EPUB, 7Z, ZIP ou outro formato declarado. Equivalência byte a byte exige igualdade dos três valores; divergência em qualquer algoritmo DEVE rejeitar a fonte.
- `RCF-IF-HASH-004` `value` DEVE usar representação hexadecimal minúscula sem separadores; seu tamanho DEVE corresponder ao algoritmo declarado.
- `RCF-IF-HASH-005` Cada PDF e EPUB de uma mesma edição DEVE possuir matriz Hash Global própria. PDF e EPUB textualmente equivalentes constituem um Livro, mas NÃO DEVEM compartilhar Hash Global; hash de ZIP, 7Z, capa ou outro asset DEVE permanecer somente Hash da Fonte. Associação entre formatos DEVE usar impressão textual normalizada separada dos hashes de bytes e nunca substituí-los.
- `RCF-IF-HASH-006` Fonte sem arquivo obtido ou sem hash comparável DEVE permanecer cadastrável; a interface DEVE informar explicitamente que sua integridade não é comparável.
- `RCF-IF-HASH-007` Hash Global e Hash da Fonte DEVEM ser visualmente abreviados sem alterar seus valores acessível e copiável; cada valor DEVE possuir botão de ícone que copie a sequência hexadecimal integral e confirme a ação sem deslocar o layout.

## 4. Consulta, front controller e validação

### 4.1 Front controller

- `RCF-IF-FC-001` `404.html` DEVE atuar como Front Controller universal para URL pública não resolvida fisicamente pelo GitHub Pages.
- `RCF-IF-FC-002` O Front Controller DEVE reconhecer separadamente a URL canônica `/d/*`, a URL curta `/<token>`, as rotas legadas registradas e o 404 real; entrada DEVE ser validada antes de formar caminho, carregar índice ou solicitar metadado. O padrão `/_/<token>` só PODE ser resolvido por mapa legado explícito.
- `RCF-IF-FC-003` Após carregar metadado válido, o cliente DEVE renderizar imediatamente identidade bibliográfica, Hashes Globais, fontes e estrutura de consulta disponíveis.
- `RCF-IF-FC-004` O cliente DEVE restaurar, quando existir, somente o Estado persistido cuja chave contenha `book_id`, revisão do metadado e identidade do hash da fonte.
- `RCF-IF-FC-005` Estado persistido incompatível, corrompido, vencido ou ausente DEVE ser descartado sem afetar a renderização do metadado canônico.
- `RCF-IF-FC-006` Sem livro resolvido, `404.html` DEVE renderizar página 404 completa, elegante, acessível e visualmente coerente com o produto.
- `RCF-IF-FC-007` A página 404 NÃO DEVE carregar analytics, consentimento, cookie, API privada, recurso remoto indispensável ou estado persistido de outro livro.
- `RCF-IF-FC-008` Requisição `/<token>` válida DEVE carregar o mapa curto ultra-minificado, resolver exatamente um destino canônico e substituir o histórico pelo destino. Token ausente, desconhecido, ambíguo ou com caixa divergente DEVE permanecer no estado 404 e NÃO DEVE produzir redirecionamento aproximado ou externo.
- `RCF-IF-FC-009` Tokens sequenciais DEVEM resultar da conversão bidirecional de inteiros positivos para Base64 URL-safe com alfabeto canônico `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`, sem padding nem dígito zero à esquerda. Para token `c[0..k-1]`, a decodificação DEVE ser `Σ índice(c[i]) × 64^(k-1-i)`; a codificação DEVE aplicar divisões sucessivas por `64`. Contador global persistente DEVE iniciar em `1`, avançar monotonicamente no build e nunca reutilizar inteiro ou token atribuído, reservado ou removido.
- `RCF-IF-FC-010` Livro cuja categoria primária seja Livro ou Devocional DEVERIA receber token preferencial pela sigla reconhecida e declarada no registro central ou, sem ela, pela sigla normalizada do título: iniciais de palavras significativas em minúsculas, numerais preservados e artigos, ligações gramaticais e designadores de volume, incluindo `o`, `a`, `the`, `para`, `com`, `e`, `de`, `volume` e `vol`, ignorados. São resultados normativos: `Caminho a Cristo` → `cc`, `Testemunhos Seletos Volume 1` → `ts1` e `Mensagens Escolhidas Volume 2` → `ms2`. Demais categorias DEVEM usar token sequencial.
- `RCF-IF-FC-011` Colisão de sigla DEVE tentar, nesta ordem, prefixar o artigo inicial original, acrescentar `-<idioma ISO>` e, persistindo, usar token sequencial. Resultado NÃO DEVE depender da ordem de arquivos nem substituir token já publicado.
- `RCF-IF-FC-012` Sigla customizada DEVE integrar índice central versionado de exceções; seu token e o inteiro Base64 correspondente DEVEM ser reservados antes da alocação sequencial. Remoção de Livro DEVE manter tombstone suficiente para impedir reutilização futura.
- `RCF-IF-FC-013` Em toda execução causada por rota de Livro, `404.html` DEVE testar primeiro a resolução direta do caminho completo solicitado: após validar os segmentos de `/d/`, DEVE acrescentar somente `metadata.json` ao mesmo diretório e tentar obtê-lo por URL same-origin. Essa tentativa NÃO DEVE depender do índice de busca nem do mapa de URLs curtas.
- `RCF-IF-FC-014` `metadata.json` direto somente DEVE renderizar o Livro quando schema 5, identidade e caminho canônico forem válidos e coerentes com a requisição. Ausência, erro, redirecionamento externo, tipo de conteúdo inválido ou divergência DEVE prosseguir para alias registrado aplicável ou 404 real, sem procurar metadado em caminho aproximado.

### 4.2 Busca parcial por título

- `RCF-IF-SEARCH-001` A busca da página inicial DEVE realizar correspondência parcial exclusivamente sobre `book.title`; autor, categoria, tag, edição, idioma, fonte, hash e URL NÃO DEVEM influenciar correspondência nem ordenação.
- `RCF-IF-SEARCH-002` Consulta DEVE normalizar Unicode, caixa e diacríticos somente para comparação, preservando o título editorial exibido; resultado DEVE manter ordem determinística declarada no índice.
- `RCF-IF-SEARCH-003` Build DEVE compilar índice ultracompacto, estático e fragmentável cujas entradas contenham exatamente o título editorial uma única vez e o token curto necessário ao roteamento. Chave normalizada, tokenização e ordenação DEVEM ser derivadas durante o build ou em runtime sem persistir cópia redundante do título. Manifesto DEVE permitir carregar somente os fragmentos necessários, sem baixar metadados completos de todos os Livros.
- `RCF-IF-SEARCH-004` A interface DEVE carregar manifesto e fragmentos em segundo plano, de modo assíncrono, cancelável e posterior à primeira renderização; carregamento, descompressão ou falha do índice NÃO DEVE bloquear viewport, foco, rolagem, navegação nem conteúdo já disponível.
- `RCF-IF-SEARCH-005` Biblioteca open-source consolidada PODE implementar compressão ou indexação quando licença, integridade, manutenção e compatibilidade client-side forem validadas; somente código utilizado DEVE integrar o runtime, e indisponibilidade de CDN NÃO DEVE impedir a busca publicada.
- `RCF-IF-SEARCH-006` Submissão explícita de busca DEVE contar os caracteres pesquisáveis após normalização. Se a contagem for menor que o mínimo configurado, a interface DEVE exibir `notice` objetiva e NÃO DEVE carregar ou consultar o índice; busca automática ou prefetch durante digitação/foco NÃO DEVE emitir esse aviso.
- `RCF-IF-SEARCH-007` Resultado único DEVE abrir diretamente a URL curta canônica `/<token>`. Múltiplos resultados DEVEM exibir lista de desambiguação, sem seleção automática do primeiro item, ordenada por título normalizado e token como critério secundário determinístico, com paginação pela quantidade configurada.
- `RCF-IF-SEARCH-008` Lista de desambiguação DEVE apresentar metadados confiáveis já disponíveis no índice ou obtidos seletivamente por metadado após a busca, no conjunto mínimo necessário para diferenciar resultados: título, idioma, tipo/categoria, edição, autor, identificador e URL curta. Metadado fictício ou inferência insegura NÃO DEVE ser exibido como fato.
- `RCF-IF-SEARCH-009` Lista de desambiguação NÃO DEVE permanecer confinada à coluna estreita do formulário nem remover visualmente o contexto lateral quando houver espaço útil. Múltiplos resultados DEVEM abrir em painel amplo, fechável, com fundo/elevação compatíveis com a linguagem visual, largura responsiva próxima à região principal disponível, paginação visível, foco/teclado preservados e fechamento explícito por controle nomeado.

### 4.3 Ciclo de validação

- `RCF-IF-VAL-001` A validação remota DEVE iniciar após a primeira renderização e NÃO DEVE bloquear conteúdo, navegação, foco, cópia, rolagem ou interação.
- `RCF-IF-VAL-002` Cada fonte elegível DEVE ser validada de forma independente, paralela, cancelável e com concorrência limitada a quatro operações ativas por página.
- `RCF-IF-VAL-003` Validação cancelada, falha ou indisponibilidade de uma fonte NÃO DEVE cancelar, reordenar nem invalidar outra fonte.
- `RCF-IF-VAL-004` O cliente DEVE calcular sobre os bytes efetivamente recebidos todos os algoritmos registrados na fonte e comparar cada resultado sem normalização de conteúdo.
- `RCF-IF-VAL-005` Fonte `file:` e fonte sem hash DEVE ser marcada como não comparável remotamente; o cliente NÃO DEVE simular sucesso nem tentar acesso privilegiado ao dispositivo.
- `RCF-IF-VAL-006` Restrição CORS, redirecionamento não acessível, erro HTTP, falha de rede, timeout, corpo indisponível e algoritmo não suportado DEVEM ser exibidos como resultado técnico específico, nunca como Hash verificado.
- `RCF-IF-VAL-007` Resultado de validação DEVE informar instante local, URL consultada, algoritmo, resultado e causa técnica quando não houver comparação.
- `RCF-IF-VAL-008` O único estado de integridade positiva DEVE ocorrer quando todos os hashes calculados forem exatamente iguais à matriz Hash da Fonte registrada; resultado parcial NÃO DEVE ser classificado como verificado.
- `RCF-IF-VAL-009` Divergência de hash DEVE receber destaque visual e textual inequívoco; ela NÃO DEVE alterar Hash Global, metadado canônico nem fonte cadastrada.
- `RCF-IF-VAL-010` Estado persistido PODE usar armazenamento local do navegador exclusivamente para resultados de validação; ele NÃO DEVE identificar pessoa, ser transmitido, controlar acesso, constituir analytics ou substituir uma nova validação.

### 4.4 Estados públicos

| Estado                    | Condição exclusiva                                                              |
| ------------------------- | ------------------------------------------------------------------------------- |
| Aguardando                | Fonte elegível sem tentativa ativa nem resultado restaurado.                    |
| Verificando               | Requisição iniciada e não encerrada.                                            |
| Verificado                | Bytes recebidos e os três hashes calculados exatamente iguais ao Hash da Fonte. |
| Divergente                | Ao menos um hash calculado diferente do Hash da Fonte.                          |
| Disponível sem comparação | Recurso alcançável, mas sem Hash da Fonte comparável.                           |
| Não comparável            | `file:`, algoritmo sem suporte ou condição que impede cálculo local lícito.     |
| Indisponível              | Recurso não obtido por erro HTTP, rede, CORS, timeout ou corpo inacessível.     |
| Cancelado                 | Usuário, navegação ou ciclo de vida cancelou a tentativa antes de resultado.    |

- `RCF-IF-VAL-011` Cada Estado público DEVE usar rótulo textual, ícone e contraste que permaneçam inteligíveis sem cor.
- `RCF-IF-VAL-012` Indicadores agregados DEVEM ser derivados dos Estados públicos atuais; resultado persistido DEVE ser distinguível de resultado da sessão atual.

## 5. Interface pública

### 5.1 Linguagem visual

- `RCF-IF-UX-001` A interface DEVE parecer página pública de documentação técnica, não dashboard, painel administrativo ou suíte de gerenciamento.
- `RCF-IF-UX-002` A composição DEVE ser elegante, profissional, limpa, sóbria, moderna e atemporal, priorizando leitura, consulta e rastreabilidade.
- `RCF-IF-UX-003` A edição de dados NÃO DEVE ser oferecida na interface pública.
- `RCF-IF-UX-004` A tipografia DEVE usar Noto Sans; Google Fonts DEVE atuar somente como fallback carregável, seguido de família sans-serif do sistema.
- `RCF-IF-UX-005` Ícone DEVE possuir significado textual acessível e ser renderizado por adaptador neutro de provider. Font Awesome, WebAwesome, provider customizado e ausência de provider DEVEM ser suportados sem alterar componente consumidor; Font Awesome, quando disponível, DEVE integrar somente ícones referenciados, usar Copy `f0c5` e representar formato de asset quando houver glifo inequívoco. Provider ausente, inválido ou incapaz DEVE degradar para fallback local semanticamente equivalente, sem espaço vazio, erro visual ou quebra de layout. SVG produzido programaticamente DEVE usar namespace SVG em todos os seus elementos. Extensão sem associação inequívoca DEVE ser exibida como texto iniciado por ponto.
- `RCF-IF-UX-006` Interface, dados e controles DEVEM adaptar-se ao viewport sem breakpoint contratual, sem perda funcional, overflow não intencional, hierarquia ilegível ou dependência de ponteiro preciso.
- `RCF-IF-UX-027` Superfície clara ou escura NÃO DEVE usar fundo monolítico opaco: planos DEVEM preservar leveza e hierarquia por gradiente suave, transparência, borda translúcida e desfoque de fundo quando suportado, com fallback legível sem `backdrop-filter`.
- `RCF-IF-UX-028` Em viewport amplo, inclusive 2K ou superior, largura, padding, gaps e colunas DEVEM crescer de modo limitado e harmônico, sem esmagamento horizontal nem dispersão excessiva.
- `RCF-IF-UX-030` A página institucional DEVE usar superfície global clara por padrão e manter escuros somente Top Bar e rodapé. Tema escuro, quando implementado, somente PODE ser ativado por seleção explícita e persistível do usuário; preferência automática do sistema NÃO DEVE substituir o padrão institucional claro.
- `RCF-IF-UX-031` Ajuste de densidade desktop DEVE preservar forma, composição, componentes, arquitetura e responsividade existentes, reduzindo proporcionalmente tipografia, alturas, paddings, margens, gaps, ícones e dimensões mínimas excessivas sem comprometer conforto, toque ou leitura.
- `RCF-IF-UX-032` Carregamento assíncrono relevante DEVE expor indicador linear superior discreto, não bloqueante, animado enquanto houver trabalho e removido automaticamente ao terminar; conteúdo disponível, navegação, foco e leitura NÃO DEVEM ser ocultados ou bloqueados.
- `RCF-IF-UX-033` Estados `inicial`, `carregando`, `carregamento parcial`, `conteúdo parcial`, `concluído`, `erro` e `nova atualização` DEVEM possuir rótulo coerente para tecnologia assistiva e representação visual estável quando ativos. Transição parcial DEVE publicar imediatamente toda informação já validada, sem simular percentual não mensurado.
- `RCF-IF-UX-034` Rota direta canônica, curta ou legada DEVE ativar feedback antes da primeira requisição, indicar resolução do índice antes do metadado quando aplicável, renderizar o Livro assim que seu metadado for validado e encerrar o indicador após a atualização do viewport.

### 5.2 Estrutura de página de livro

- `RCF-IF-UX-007` Cabeçalho DEVE conter identidade do Índice de Fontes, navegação semântica para Sobre, Livro, Fontes, Verificações e Como citar, e link explícito ao repositório.
- `RCF-IF-UX-008` A região de identidade do livro DEVE conter capa quando disponível, título principal sem qualificadores acessórios, qualificador secundário quando existir, autor principal validado, resumo de finalidade e fatos editoriais essenciais. Labels e valores DEVEM usar hierarquia tipográfica consistente e não ambígua.
- `RCF-IF-UX-009` Fatos editoriais DEVEM conter edição, idioma e instante de atualização derivado da revisão publicada; ausência de dado DEVE ser exibida como indisponível, nunca estimada.
- `RCF-IF-UX-010` Indicadores resumidos DEVEM distinguir: `Fontes preservadas`, igual ao total de registros em `sources`; `Arquivos da publicação`, igual a `metadata.json` mais todas as entradas locais de `assets`, abrangendo capa e invólucros do Livro; `Assets rastreáveis`, igual ao total de `asset_id` distintos, não nulos e existentes em `assets` referenciados por `sources`; e `URL curta`, derivada de `short_token`. Contagens DEVEM ser calculadas no cliente a partir do metadado schema 5, sem persistir campos redundantes nem confundir arquivo técnico da publicação, asset local e registro de proveniência.
- `RCF-IF-UX-011` A seção Fontes DEVE conter introdução, link direto ao `metadata.json` do livro e tabela ou representação responsiva equivalente.
- `RCF-IF-UX-012` Cada fonte DEVE apresentar, nesta ordem lógica, posição, Fonte armazenadora, URL integral, formato de leitura, formato do asset, Hash da Fonte do asset transferido, Provedor, tamanho, Estado público e ação final explícita de download. Fonte DEVE derivar do domínio que entrega a URL exibida; Provedor DEVE identificar a origem editorial. Quando coincidirem, o valor DEVE aparecer somente no campo semanticamente correto e o outro DEVE ser omitido como redundante.
- `RCF-IF-UX-013` URL DEVE permanecer integralmente disponível para leitura, cópia e abertura; elipse visual NÃO DEVE ocultar o valor copiado nem o texto acessível.
- `RCF-IF-UX-014` Hash DEVE possuir ação de cópia por teclado e toque, confirmação não intrusiva e alternativa textual quando a cópia falhar.
- `RCF-IF-UX-015` Lista extensa DEVE mostrar subconjunto inicial estável e controle explícito para revelar itens adicionais; ocultação NÃO DEVE alterar contagens nem impedir acesso aos dados.
- `RCF-IF-UX-016` Em qualquer largura, a listagem de fontes DEVE preservar todos os campos por grid fluido ou cartões equivalentes, sem barra de rolagem local horizontal ou vertical. Cada item PODE usar subgrupos empilhados para separar metadados, integridade, links e ações sem remover informação.
- `RCF-IF-UX-017` A página DEVE conter seção de verificações com metodologia concisa, seção Como citar, acesso ao repositório e acesso aos dados abertos.
- `RCF-IF-UX-018` Rodapé DEVE identificar o livro quando aplicável, GitHub Pages, dados abertos, transparência, integridade e link ao repositório.

### 5.3 Acessibilidade e falhas

- `RCF-IF-UX-019` HTML DEVE entregar estrutura e conteúdo essencial; CSS/Sass DEVE controlar apresentação e estados; TypeScript DEVE apenas aprimorar consulta, cópia e validação.
- `RCF-IF-UX-020` Todo controle interativo DEVE possuir nome acessível, foco visível, ativação por teclado e toque, ordem de foco coerente e contraste suficiente.
- `RCF-IF-UX-026` Hashes em painéis ou listagens DEVEM exibir estritamente seus 7 últimos caracteres; URLs DEVEM usar recorte visual agressivo e homogêneo. Valor integral DEVE permanecer no nome acessível, `title` e ação de cópia. Botão de cópia adjacente DEVE permanecer visível, contrastado e dimensionalmente estável; controle, texto e coluna NÃO DEVEM colidir, quebrar letra por letra nem ampliar a página. Claro e escuro DEVEM manter contraste, transparência, estados e elevação equivalentes.
- `RCF-IF-UX-029` A ação final de download DEVE possuir contraste e área de toque superiores às ações auxiliares de cópia, permanecer na extremidade lógica do item e usar ícone Font Awesome com nome acessível.
- `RCF-IF-UX-035` Página de Livro DEVE exibir miniatura discreta do QR Code SVG da publicação, com ação de download direto do asset por link HTML `download`, ícone Font Awesome de download, nome acessível, foco visível e caminho relativo correto ao diretório do Livro. O SVG NÃO DEVE ser incorporado inline quando o asset baixável já existir.
- `RCF-IF-UX-036` QR Code no cabeçalho do Livro DEVE usar área lateral disponível antes de criar linha própria abaixo dos dados principais em viewport largo. O QR DEVE ser maior que o botão de download de forma claramente proporcional, e o botão NÃO DEVE repetir texto como `SVG` quando formato, `download` e nome acessível já identificarem o asset.
- `RCF-IF-UX-021` Atualização assíncrona de Estado público DEVE ser anunciada de modo não intrusivo e NÃO DEVE deslocar foco nem reordenar fonte lida.
- `RCF-IF-UX-022` Conteúdo decorativo DEVE ser ignorável por tecnologia assistiva; capa DEVE possuir alternativa textual que identifique livro e edição quando a imagem trouxer informação.
- `RCF-IF-UX-023` Movimento, animação e transição DEVEM respeitar preferência de redução de movimento e NÃO DEVEM ocultar conteúdo ou resultado.
- `RCF-IF-UX-024` `404.html` DEVE conter `<noscript>` completo em Português, English e Español, com título, finalidade, explicação da consulta dinâmica, links essenciais e orientação para retorno seguro.
- `RCF-IF-UX-025` O `<noscript>` DEVE permanecer legível, rolável, navegável e visualmente integrado sem depender de JavaScript, fonte externa ou validação remota.

## 6. Build, desempenho e dados abertos

### 6.1 Build

- `RCF-IF-BUILD-001` Código-fonte da interface, busca e roteamento DEVE usar estritamente TypeScript e TSX; estilos DEVEM usar Sass quando houver pipeline. A transpilação DEVE produzir JavaScript puro compatível com os navegadores declarados, e o resultado publicado DEVE conter somente JavaScript, CSS, HTML, fontes, dados e assets necessários ao runtime.
- `RCF-IF-BUILD-002` Build DEVE validar schema, referências internas, unicidade de identificadores, integridade sintática, URLs canônicas, URLs curtas e links públicos antes de publicar; após validação, DEVE materializar `dist/` exclusivamente a partir de `src/`.
- `RCF-IF-BUILD-006` O importador do Acervo de entrada DEVE descobrir grupos de forma determinística, validar manifestos e hashes de entrada quando existirem, extrair autoria e qualificador editorial, derivar o diretório `/d/` conforme `RCF-IF-ROUTE-002`, preservar os originais somente sob `src/`, gerar seu `metadata.json` schema 5 e atualizar somente índices mínimos afetados; falha em um grupo NÃO DEVE publicar saída parcial desse grupo.
- `RCF-IF-BUILD-007` Manifesto lateral comum DEVE ser a evidência determinística de associação entre PDF e EPUB. O importador DEVE calcular impressão normalizada da ordem de leitura antes de qualquer associação entre grupos distintos; para grupo já associado pelo mesmo manifesto, essa impressão DEVE permanecer auditoria opcional e não bloqueante. Falha técnica de extração DEVE ser registrada no relatório e NÃO DEVE induzir agrupamento entre grupos distintos. Grupo sem EPUB DEVE ser registrado como exceção explícita no relatório, nunca duplicado por formato.
- `RCF-IF-BUILD-008` Extração e atualização de capa DEVEM usar módulo compartilhado: capa declarada do EPUB tem precedência; sem ela, a primeira página do PDF DEVE ser rasterizada. A saída DEVE ser PNG, com maior dimensão limitada a 800 px, compressão otimizada para web e sem metadados desnecessários; atualização DEVE regenerá-la quando ausente ou divergente.
- `RCF-IF-BUILD-009` Lógica de leitura de artefato, hash, escrita atômica, checkpoint, descoberta, comparação, asset, capa e metadado DEVE residir em módulos reutilizáveis; importação, atualização, sincronização e manutenção NÃO DEVEM reimplementá-la.
- `RCF-IF-BUILD-003` Build DEVE aplicar transpilação e minificação agressivas, remover código morto, aplicar tree shaking quando aplicável e excluir dependência, ícone, fonte, dado de desenvolvimento e asset não usados, sem alterar comportamento, acessibilidade ou cabeçalho legal obrigatório.
- `RCF-IF-BUILD-004` Entradas idênticas DEVEM produzir saídas idênticas, exceto campo explicitamente dependente do instante de publicação; esse campo DEVE ser único, documentado e derivado de fonte controlada.
- `RCF-IF-BUILD-005` Build com metadado inválido, rota ou token duplicado, reserva inconsistente, matriz Hash Global ausente em PDF/EPUB, matriz Hash da Fonte ausente em asset publicado, ID inválido, referência interna ausente ou asset não permitido DEVE falhar antes da publicação.
- `RCF-IF-BUILD-010` Insumos editoriais internos sob `src/` DEVEM permanecer separados de `dist/`; o build DEVE regenerar a árvore pública `/d/`, capas PNG, contêineres `.7z` LZMA2 por formato, pacote agregado opcional, índices fragmentados e manifestos a partir de insumos validados, sem copiar PDF/EPUB cru, temporário ou artefato não registrado.
- `RCF-IF-BUILD-011` Build completo DEVE continuar disponível; manutenção incremental DEVERIA processar somente Livro, pacote, capa, segmento e fragmento alterados, preservando resultado previamente validado até substituição completa.
- `RCF-IF-BUILD-012` Desenvolvimento local DEVE expor `npm run dev-live`, servir exclusivamente `dist/` conforme `src/config/dev-live.json`, aplicar `404.html` como front controller em rota profunda inexistente exatamente como a hospedagem estática e recarregar o navegador por observação do artefato sem interromper resposta de asset, JSON ou download. O servidor local NÃO DEVE incorporar fonte interna ao produto, responder fallback HTML com status ou tipo de asset válido, nem divergir da raiz `/` publicada.
- `RCF-IF-BUILD-013` Todo fonte comentável e toda saída comentável, inclusive transpilada ou minificada, DEVE preservar no topo o cabeçalho derivado da configuração central com autor principal e contato disponível, URL pública upstream, nome e link da licença e termo canônico ultrassucinto; dado ausente NÃO DEVE ser inferido.
- `RCF-IF-BUILD-014` Migração para `/d/` DEVE reaproveitar integralmente dados e assets existentes, planejar antes de mover, validar origem e destino, escrever atomicamente, manter checkpoint e mapa de rotas antigas, e remover o legado somente após equivalência comprovada. Colisão, perda, asset órfão ou divergência DEVE interromper com o estado anterior recuperável.
- `RCF-IF-BUILD-015` Build DEVE gerar, de forma determinística, o contador global, o registro de reservas e tombstones, o mapa ultracompacto de URLs curtas, o índice parcial de títulos e seus manifestos; execução repetida sem mudança de entrada NÃO DEVE alterar token, rota, ordem nem bytes derivados.
- `RCF-IF-BUILD-016` Pacote compacto já gerado e validado NÃO DEVE ser recomprimido enquanto bytes de todos os PDF/EPUB de entrada, formato, método, nível e versão do empacotador permanecerem equivalentes. Cache DEVE usar chave criptográfica determinística, residir fora de `dist/`, possuir marcador de integridade e ser invalidado apenas por divergência comprovada; cópia publicada DEVE ter hashes comparados ao marcador antes do deploy.
- `RCF-IF-BUILD-017` Cada diretório final de Livro DEVE conter QR Code SVG no asset configurado, inicialmente `short-url.svg`, apontando para `short_url_origin + "/" + short_token`. O SVG DEVE ser vetorial, possuir `viewBox`, fundo claro, módulos escuros, margem silenciosa adequada, dimensões estáveis e ausência de rasterização.
- `RCF-IF-BUILD-018` QR Code DEVE ser gerado pela biblioteca open-source `qrcode` (`node-qrcode`), validada em documentação oficial como MIT, compatível com Node `>=10.13.0`, capaz de SVG e configurável por `errorCorrectionLevel`; a dependência é proporcional por ter três dependências diretas e ampla adoção. Padrão de correção DEVE ser `Q`, salvo configuração superior justificada.
- `RCF-IF-BUILD-019` Geração de QR Code DEVE ser incremental e determinística. Entrada mínima de invalidação: domínio curto, token, parâmetros de QR Code e versão lógica do gerador. Asset existente só PODE ser preservado quando seu marcador/hash ou conteúdo comprovar equivalência; `mtime` isolado NÃO DEVE ser usado.

### 6.2 Desempenho

- `RCF-IF-PERF-001` Consulta inicial DEVE carregar somente shell público, metadado do livro solicitado e assets indispensáveis à primeira renderização.
- `RCF-IF-PERF-002` Índice, imagens, fontes, ícones, validações e dados não essenciais DEVEM ser adiados ou carregados seletivamente quando isso reduzir tempo percebido sem ocultar conteúdo.
- `RCF-IF-PERF-003` Estratégia de indexação DEVE minimizar simultaneamente memória, banda, requisições HTTP e tempo percebido; JSON completo de todos os livros NÃO DEVE ser requisito de consulta.
- `RCF-IF-PERF-004` Falha de fonte, ícone, fonte tipográfica, imagem de capa ou validação remota DEVE degradar para apresentação local legível.
- `RCF-IF-PERF-005` Índice e metadado solicitados durante a mesma sessão DEVEM reutilizar promessa em voo e resultado válido em memória; falha ou cancelamento DEVE invalidar a entrada correspondente para permitir nova tentativa consistente. Prefetch PODE ocorrer por foco ou intenção explícita sem bloquear a primeira renderização.
- `RCF-IF-PERF-005` Recursos de terceiros NÃO DEVEM bloquear conteúdo essencial; versão e origem de recurso externo DEVEM ser previsíveis e compatíveis com publicação estática.

### 6.3 Dados abertos

- `RCF-IF-OPEN-001` Cada página de livro DEVE oferecer link direto ao seu `metadata.json` canônico.
- `RCF-IF-OPEN-002` Dados abertos DEVEM ser auditáveis sem interface JavaScript e sem conta, sessão ou autorização.
- `RCF-IF-OPEN-003` O produto DEVE expor somente dados necessários à rastreabilidade; segredo, token privado, dado pessoal não editorial e credencial NÃO DEVEM integrar metadado ou build publicado. Token público de URL curta NÃO constitui segredo.

## 7. Segurança, privacidade e confiabilidade

### 7.1 Segurança

- `RCF-IF-SEC-001` Cliente DEVE tratar `metadata.json`, URL, título, tipo, contribuidores e resultado remoto como dados não confiáveis até validação de schema e codificação de saída.
- `RCF-IF-SEC-002` Conteúdo de metadado e resposta remota DEVE ser inserido como texto; HTML, script, evento, estilo arbitrário e URL executável NÃO DEVEM ser interpretados.
- `RCF-IF-SEC-003` Resolução de livro DEVE rejeitar `..`, barra invertida, NUL, codificação ambígua, segmento vazio e identificador fora do padrão antes de formar caminho interno.
- `RCF-IF-SEC-004` Hash divergente, metadado inválido ou fonte maliciosa NÃO DEVE executar código, alterar dados canônicos, redirecionar automaticamente ou suprimir o diagnóstico.
- `RCF-IF-SEC-005` Descoberta remota DEVE aceitar somente domínio e adaptador presentes em configuração versionada de provedores confiáveis, rejeitar redirecionamento para domínio não permitido, limitar tamanho de resposta e tratar HTML remoto como dado não executável.

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
- `RCF-IF-REL-005` Timeout global DEVE aplicar-se a workflow automatizado. Execução local somente DEVE aplicar timeout quando `--timeout-ms` for fornecido; antes de interromper, DEVE persistir checkpoint com operação, cursor, efeitos confirmados, pendências e causa, retornando erro seguro para retomada idempotente.

## 8. Workflows e gestão de Issues

### 8.1 Workflows de repositório

- `RCF-IF-WF-001` Cada workflow DEVE possuir responsabilidade única, entrada declarada, saída rastreável, chave idempotente, checkpoint, limite de retentativa e fallback seguro.
- `RCF-IF-WF-002` O workflow de validação editorial DEVE validar dados, rotas, schema, hashes, links internos e build antes de permitir publicação.
- `RCF-IF-WF-003` O workflow de publicação DEVE publicar somente artefato validado, registrar revisão e validar rota inicial, rota de livro e 404 após disponibilidade.
- `RCF-IF-WF-010` O workflow de publicação DEVE executar `npm run build`, cuja validação cobre os insumos canônicos versionados, pacotes, árvore e limites; `npm run egw:validate` DEVE permanecer local porque depende do Acervo privado ignorado `src/egw/`. O workflow DEVE enviar exclusivamente `dist/` ao GitHub Pages e nunca publicar `src/`, `src/egw/`, configuração de build, estado ou relatório local.
- `RCF-IF-WF-011` Workflow de publicação DEVE instalar implementação compatível com o formato compacto declarado, executar teste dos pacotes e bloquear deploy acima do limite público configurado; o mesmo mecanismo DEVE ser executável localmente.
- `RCF-IF-WF-012` Workflow DEVE restaurar e salvar a mesma cache de pacotes usada localmente por chave de conteúdo e configuração; cache ausente ou inválido PODE provocar compactação inicial somente dos pacotes afetados, mas pacote válido e equivalente NÃO DEVE ser recomprimido.
- `RCF-IF-WF-004` O workflow de índice DEVE gerar somente artefatos derivados permitidos e DEVE falhar quando ele divergir do conjunto de `metadata.json` válidos.
- `RCF-IF-WF-007` A importação do Acervo de entrada DEVE ser reiniciável: artefato de destino com matriz Hash da Fonte idêntica PODE ser reutilizado; saída diferente DEVE ser substituída somente após validação completa do grupo; relatório derivado DEVE registrar grupos processados, agrupamentos, exceções de formato e falhas.
- `RCF-IF-WF-008` Todo script invocado por workflow DEVE ser executável localmente pelo mesmo comando Node e aceitar configuração, checkpoint e relatório equivalentes; o workflow DEVE apenas fornecer agenda, limite global e credenciais estritamente necessárias.
- `RCF-IF-WF-009` O mantenedor periódico `scripts/maintain-egw.mjs` DEVE somente descobrir fontes equivalentes ainda ausentes, respeitar cota diária por provedor, concorrência, timeout global, checkpoint e limite finito; ele NÃO DEVE publicar candidato divergente, processar continuamente ou exceder a janela agendada. Para cada fonte cujo Provedor editorial seja distinto da Fonte armazenadora e ainda não figure como Fonte do mesmo Livro, o mantenedor DEVE consultar exclusivamente o adaptador confiável desse Provedor, considerar PDF, EPUB, ZIP e 7Z independentemente do formato da fonte inicial e incorporar automaticamente somente URL cujo PDF/EPUB real, direto ou extraído com limites e paths seguros, corresponda integralmente à matriz de Hash Global do formato encontrado. Hash do contêiner NÃO DEVE substituir Hash Global; candidato divergente, ambíguo, indisponível, fora do domínio permitido ou sem adaptador DEVE permanecer apenas no relatório.
- `RCF-IF-WF-015` Cadastro de fontes confiáveis DEVE modelar fonte institucional, domínios principais, subdomínios, CDNs, hosts de mídia, padrões de caminho, idiomas, formatos e aliases de título/sigla em configuração central. Correspondência NÃO DEVE restringir-se à igualdade literal do hostname institucional e NÃO DEVE aceitar host fora da relação configurada.
- `RCF-IF-WF-016` Descoberta contínua DEVE percorrer índices, páginas, manifests, sitemaps, feeds, diretórios expostos ou APIs oficiais configuradas, resolver URLs relativas, seguir redirects somente para host permitido, normalizar percent-encoding sem corromper a URL, registrar origem/evidência de cada candidato e evitar brute force indiscriminado.
- `RCF-IF-WF-017` Correspondência de obras DEVE aplicar camadas: identificador confiável, alias ou sigla normalizada, título lexical normalizado, heurística controlada e fila de ambiguidade quando a confiança for insuficiente. Deduplicação DEVE usar identidade composta por obra, idioma, formato, edição/variante e fonte quando disponíveis, preservando PDF/EPUB, idiomas, edições e fontes distintas.
- `RCF-IF-WF-018` Relatório de manutenção DEVE registrar fontes processadas, hosts associados, páginas consultadas, candidatos, arquivos reconhecidos, correspondências exatas/heurísticas, ambiguidades, novidades, atualizações, duplicatas, rejeições com motivo, erros por fonte, duração por etapa, estado do cache e razão de encerramento. Código de saída e resumo DEVEM distinguir execução válida sem novidades, fonte inacessível, fonte sem cobertura, parser sem correspondência, cache reutilizado, falha parcial e falha total.
- `RCF-IF-WF-019` Cache de manutenção DEVE possuir versão lógica e invalidar quando parser, normalização, cadastro de fonte ou regra de correspondência mudar. O estado DEVE distinguir fonte consultada de fonte completamente analisada, registrar paginação/checkpoint e não usar duração curta, existência de arquivo ou cursor isolado como prova de completude.
- `RCF-IF-WF-013` O mantenedor DEVE oferecer três seleções mutuamente compatíveis pelo mesmo executável local e de workflow: acervo completo; um `metadata.json`/Livro específico; ou uma Fonte e/ou Provedor de um Livro específico. Seleção inválida, não encontrada ou ambígua DEVE falhar antes de qualquer escrita. Cada invocação de importação, atualização ou sincronização que inclua/rastreie/analise Fonte DEVE delegar ao mesmo mantenedor com a seleção mais estreita disponível, sem duplicar descoberta ou validação.
- `RCF-IF-WF-014` O workflow diário de manutenção DEVE possuir timeout de job de 20 minutos e fornecer ao mantenedor limite interno inferior ao teto para persistir atomicamente cursor, modo, Livro, Fonte, Provedor, cotas, candidatos confirmados, pendências e causa antes da interrupção. Execução local sem `--timeout-ms` DEVE permanecer sem timeout global, conforme `RCF-IF-REL-005`.
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

- `RCF-IF-ACC-001` Entrega publicável DEVE validar ao menos página inicial, URL canônica `/d/` válida, URL curta `/` válida, token desconhecido, rota legada, URL desconhecida, `404.html`, metadado inválido, fonte disponível, fonte indisponível, hash verificado, hash divergente, sem hash e sem JavaScript.
- `RCF-IF-ACC-002` Validação visual DEVE comprovar cabeçalho, identidade do livro, indicadores, fontes, verificações, cartões informativos, rodapé, foco, contraste, viewport estreito e viewport amplo.
- `RCF-IF-ACC-003` Validação de dados DEVE comprovar que cada Livro possui somente um `metadata.json` schema 5, que não há JSON central duplicando Livros e que IDs, tokens, matrizes de hashes, referências e rotas são únicos, válidos e coerentes.
- `RCF-IF-ACC-007` Validação de importação DEVE comprovar que `src/egw/` permanece ignorado, todo artefato aceito possui origem e hash de entrada válidos ou proveniência local explicitamente registrada, PDF e EPUB equivalentes resultam em um único Livro, cada asset publicado existe no diretório canônico e possui matriz Hash da Fonte, cada PDF/EPUB possui matriz Hash Global própria e índices cobrem exatamente os metadados gerados sem duplicá-los.
- `RCF-IF-ACC-010` Validação arquitetural DEVE comprovar que a aplicação reside em `src/`, que `dist/` espelha somente a raiz pública, que o root do repositório não contém recursos específicos da aplicação e que nenhuma URL, asset ou dado publicado contém o prefixo `src/`.
- `RCF-IF-ACC-011` Validação da árvore estática DEVE comprovar raiz `/d/`, idioma e categoria isolados, decomposição determinística do título, um diretório por Livro, coexistência de `metadata.json`, `cover.png` e contêineres `.7z` correlatos, além da inexistência absoluta de PDF/EPUB cru; Hash Global dos originais internos, Hash da Fonte de cada asset servido, conteúdo de cada contêiner, densidade, manifesto e índices fragmentados DEVEM ser verificados.
- `RCF-IF-ACC-017` Validação editorial DEVE comprovar autoria não vazia extraída por evidência interna, separação visual de qualificadores e falha segura diante de conflito ou ausência; validação de UI DEVE comprovar crop sem perda, cópia integral de hash e URL, formato de leitura distinto do asset, hash individual do `.7z`, fonte sem título redundante, ação de download e responsividade em claro e escuro.
- `RCF-IF-ACC-008` Validação de manutenção DEVE comprovar domínio confiável, limite diário, timeout de workflow, checkpoint local recuperável, rejeição de hash divergente, incorporação somente por igualdade byte a byte ou correspondência integral dos Hashes Globais internos e execução local do mesmo script do workflow.
- `RCF-IF-ACC-009` Validação de capa DEVE comprovar `cover.png` para todo livro importado, precedência da capa EPUB, fallback PDF, dimensão máxima de 800 px, PNG legível e regeneração quando removida.
- `RCF-IF-ACC-004` Validação de build DEVE comprovar determinismo, minificação, ausência de código morto detectável, assets seletivos, independência de serviço privado e integridade do artefato estático.
- `RCF-IF-ACC-005` Validação de workflow DEVE comprovar idempotência, checkpoint, retomada, falha segura e ausência de duplicação de efeito externo.
- `RCF-IF-ACC-006` Requisito deste RCF DEVE ser considerado atendido somente quando sua evidência automatizada ou manual reprodutível estiver vinculada à revisão publicada.
- `RCF-IF-ACC-012` Validação de busca DEVE comprovar correspondência parcial somente por título, entrada contendo exclusivamente título e token curto, ausência de campo redundante, carregamento fragmentado assíncrono e inexistência de bloqueio visual ou interativo.
- `RCF-IF-ACC-013` Validação de URL curta DEVE comprovar conversão Base64 bidirecional, caixa, contador monotônico, reservas, siglas preferenciais, colisões, sufixo de idioma, fallback sequencial, tombstones, token desconhecido, domínio curto centralizado, ausência de dependência operacional de `/_/` e estabilidade entre builds.
- `RCF-IF-ACC-018` Validação de QR Code DEVE comprovar asset SVG em todo Livro, URL `https://f.jcem.pro/<token>`, estrutura vetorial com `viewBox`, regeneração inicial, não regeneração sem mudança e regeneração por domínio, token ou parâmetro de QR Code.
- `RCF-IF-ACC-019` Validação de desambiguação DEVE comprovar mínimo configurado, notice somente após comando explícito, ausência de resultados, abertura direta de resultado único, múltiplos resultados sem seleção automática, ordenação alfabética, paginação, títulos homônimos e seleção explícita.
- `RCF-IF-ACC-020` Validação de descoberta DEVE cobrir fixtures determinísticas para hosts associados de EGW Writings e mídia `media*.egwwritings.org`, Ellen White Audio, Centro White e CDN, URLs com acentos/percent-encoding, siglas entre parênteses, PDF/EPUB da mesma obra, idiomas distintos, aliases, ambiguidade, deduplicação sem perda de variantes, cache invalidado por regra e falha parcial por fonte.
- `RCF-IF-ACC-014` Validação de migração DEVE inventariar origem e destino, comprovar equivalência de todos os assets e metadados, preservar rotas históricas, simular interrupção e retomada e demonstrar ausência de perda, duplicação, colisão e órfão antes de remover legado.
- `RCF-IF-ACC-015` Validação de compilação DEVE comprovar fonte TypeScript/TSX, saída JavaScript pura minificada e cabeçalho legal íntegro no fonte e em toda saída comentável.
- `RCF-IF-ACC-016` Validação do Front Controller DEVE acessar diretamente ao menos um caminho canônico completo de Livro sem `index.html` físico e comprovar que `404.html` deriva o `metadata.json` do mesmo diretório, valida-o e renderiza o Livro; metadado ausente ou divergente DEVE resultar em 404 real.
