# Índice de Fontes Bibliográficas

Índice estático de obras e fontes preservadas. O contrato está em [RCF.md](RCF.md) e o estado técnico em [handoff.md](handoff.md).

`src/` contém os insumos da aplicação e `dist/` é o artefato estático publicado. `npm run egw:import` importa o acervo privado `src/egw/`; `npm run egw:update` regenera metadados e capas de trabalho; `npm run egw:maintain` procura equivalentes confiáveis dentro das cotas; `npm run egw:maintain -- --timeout-ms=840000` reproduz o limite do workflow localmente. `npm run egw:validate` verifica os insumos, `npm run build` materializa somente `data/<s1>/<s2>/<slug>/metadata.json`, `cover.webp` e `<slug>.7z`, e `npm run dev-live` serve `dist/` com recarga local.

O acervo de entrada não é versionado. A manutenção só adiciona URL cujo SHA-512 seja idêntico ao asset já aceito. Não há vínculo com editoras e fontes de terceiros podem ficar indisponíveis.

Autoria: [JeanCarloEM](https://www.jeancarloem.com)<br>
Repositório: [jcempro/egw](https://github.com/jcempro/egw)<br>
Licença: [MPL-2.0](LICENSE)
