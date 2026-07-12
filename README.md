# Índice de Fontes Bibliográficas

Índice estático de obras e fontes preservadas. O contrato está em [RCF.md](RCF.md) e o estado técnico em [handoff.md](handoff.md).

`src/` contém a fonte da aplicação e `dist/` é o artefato estático publicado. `npm run egw:import` importa o acervo privado `src/egw/`; `npm run egw:update` regenera assets e capas; `npm run egw:maintain` procura equivalentes confiáveis dentro das cotas; `npm run egw:maintain -- --timeout-ms=840000` reproduz o limite do workflow localmente. `npm run egw:validate` verifica a saída e `npm run build` materializa `dist/`.

O acervo de entrada não é versionado. A manutenção só adiciona URL cujo SHA-512 seja idêntico ao asset já aceito. Autor: [JeanCarloEM](https://www.jeancarloem.com). Não há vínculo com editoras e fontes de terceiros podem ficar indisponíveis. Licença: [MPL-2.0](LICENSE).
