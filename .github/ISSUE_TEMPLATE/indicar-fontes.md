---
name: Indicar URLs de publicacoes
about: Envie uma ou mais URLs de fontes para publicacoes.
title: "Fonte de publicacao: "
labels: ["fonte: aguardando analise"]
---

Obrigado por indicar fontes. Um unico formato abaixo ja e suficiente.

A orientação completa está em [Como Indicar URLs de Publicações](../../docs/indicar-fontes.md).

## Forma simples

```text
Livro: Caminho a Cristo
URL: https://exemplo.org/caminho-a-cristo.pdf
```

Tambem pode ser escrito assim:

```text
Caminho a Cristo -> https://exemplo.org/caminho-a-cristo.pdf
```

## Varios livros ou varias URLs

```text
- Caminho a Cristo: https://exemplo.org/caminho-a-cristo.pdf
- O Grande Conflito: https://exemplo.org/o-grande-conflito.pdf

Caminho a Cristo:
- https://exemplo.org/caminho-a-cristo.pdf
- https://exemplo.org/caminho-a-cristo.epub

O Grande Conflito:
- https://exemplo.org/o-grande-conflito.pdf
- https://exemplo.org/o-grande-conflito.epub
```

JSON e YAML simples também são aceitos; veja o link acima.

Erros simples de escrita, pontuacao, plural, maiusculas, Markdown ou indentacao serao tolerados quando a associacao entre publicacao e URL continuar clara.

Quando souber, inclua titulo, idioma, formato, fonte institucional e URL. URLs de paginas ou indices com varias publicacoes tambem podem ser indicadas.
